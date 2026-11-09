// Run from the original project root, after deploying server/readers.ts.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const databaseName = 'henryreads-comments';
const root = process.cwd();
const work = __dirname;
const configPath = path.join(work, 'wrangler.remap.json');

function wrangler(args, capture = false) {
  const common = {
    cwd: root,
    env: { ...process.env },
    stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  };
  let result;
  if (process.platform === 'win32') {
    // Pass arguments as data via the environment, rather than interpolating shell code.
    common.env.HENRY_REMAP_WRANGLER_ARGS = JSON.stringify(['wrangler', ...args]);
    const command = '$commandArgs = @(ConvertFrom-Json $env:HENRY_REMAP_WRANGLER_ARGS); & npx.cmd @commandArgs; exit $LASTEXITCODE';
    result = spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-Command', command], common);
  } else {
    result = spawnSync('npx', ['wrangler', ...args], common);
  }
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Wrangler 執行失敗（${result.status}），已停止後續步驟。`);
  return result.stdout || '';
}

function parseJson(text) {
  return JSON.parse(text.replace(/^\uFEFF/, '').trim());
}
function flatten(value) {
  if (!value || typeof value !== 'object') return [];
  return [value, ...Object.values(value).flatMap(flatten)];
}
function findDatabaseId(info) {
  const candidates = flatten(info).filter(value => !Array.isArray(value))
    .filter(value => !(value.name || value.database_name) || (value.name || value.database_name) === databaseName)
    .map(value => value.uuid || value.database_id)
    .filter(value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value));
  const unique = [...new Set(candidates)];
  if (unique.length !== 1) throw new Error('無法唯一確認 henryreads-comments 的 UUID；沒有修改資料庫。請貼上 d1 info 的輸出以核對。');
  return unique[0];
}
function verify(rows) {
  const row = flatten(rows).find(value => value && Object.hasOwn(value, 'actual_readers') && Object.hasOwn(value, 'highest_id'));
  if (!row || Number(row.failed_checks) !== 0 || Number(row.orphans) !== 0 || Number(row.identity_mismatches) !== 0 || Number(row.nonpositive_ids) !== 0) {
    throw new Error('遷移後驗證未通過；請保留輸出與備份，不要自行刪除對照表。');
  }
  // New visitors may arrive between migration commit and this read. They use the fixed insert.
  if (Number(row.actual_readers) !== Number(row.highest_id)) throw new Error('人數與最大 ID 不一致，請貼上輸出核對。');
  console.log(JSON.stringify(row, null, 2));
}

function verifyDatabase() {
  const query = `SELECT COUNT(*) AS actual_readers, COALESCE(MAX(id),0) AS highest_id,
    (SELECT COUNT(*) FROM reader_remap_20261109_map) AS remapped_readers,
    (SELECT COUNT(*) FROM reader_remap_20261109_checks WHERE passed != 1) AS failed_checks,
    (SELECT COUNT(*) FROM readers WHERE id <= 0) AS nonpositive_ids,
    (SELECT COUNT(*) FROM reader_remap_20261109_map m LEFT JOIN readers r ON r.id=m.new_id WHERE r.reader_key IS NULL OR r.reader_key != m.reader_key) AS identity_mismatches,
    ((SELECT COUNT(*) FROM reader_events e LEFT JOIN readers r ON r.id=e.reader_id WHERE r.id IS NULL) +
     (SELECT COUNT(*) FROM reader_likes l LEFT JOIN readers r ON r.id=l.reader_id WHERE r.id IS NULL) +
     (SELECT COUNT(*) FROM reader_traffic t LEFT JOIN readers r ON r.id=t.reader_id WHERE r.id IS NULL)) AS orphans
    FROM readers`.replace(/\s+/g, ' ').trim();
  verify(parseJson(wrangler(['d1', 'execute', databaseName, '--config', configPath, '--remote', '--command', query, '--json'], true)));
}

try {
  if (process.argv.includes('--verify')) {
    if (!fs.existsSync(configPath)) throw new Error('找不到 reader-remap/wrangler.remap.json；請保留第一次執行產生的設定檔。');
    const config = parseJson(fs.readFileSync(configPath, 'utf8'));
    if (!Array.isArray(config.d1_databases) || config.d1_databases.length !== 1 || config.d1_databases[0].database_name !== databaseName) {
      throw new Error('驗證設定未指向 henryreads-comments，已停止。');
    }
    console.log('只執行 SELECT 驗證，不會備份、重編或修改資料。');
    verifyDatabase();
    console.log('驗證通過，請重新整理 Dashboard。');
  } else {
  const readerFile = path.join(root, 'server', 'readers.ts');
  if (!fs.existsSync(readerFile) || !fs.readFileSync(readerFile, 'utf8').includes('WHERE NOT EXISTS (SELECT 1 FROM readers WHERE reader_key = ?)')) {
    throw new Error('請先將本包 server/readers.ts 覆蓋至專案，完成 build 與部署後，再執行本工具。');
  }
  if (!fs.existsSync(path.join(work, 'migrations', '0001_compact_reader_ids.sql'))) {
    throw new Error('找不到遷移 SQL；請保持 reader-remap 資料夾結構完整。');
  }
  console.log('目標：henryreads-comments。先辨識資料庫，再備份，最後套用這一份重編遷移。');
  const info = parseJson(wrangler(['d1', 'info', databaseName, '--json'], true));
  const databaseId = findDatabaseId(info);
  const isolated = {
    name: 'henryreads-reader-id-remap',
    compatibility_date: '2026-11-09',
    d1_databases: [{
      binding: 'henryreads_comments',
      database_name: databaseName,
      database_id: databaseId,
      migrations_dir: 'migrations',
      migrations_table: 'reader_id_remap_migrations'
    }]
  };
  fs.writeFileSync(configPath, JSON.stringify(isolated, null, 2) + '\n');

  const backupDirectory = path.join(os.homedir(), 'henryreads-backups');
  fs.mkdirSync(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(backupDirectory, `henryreads-before-reader-remap-${timestamp}.sql`);
  console.log('備份位置：' + backup);
  wrangler(['d1', 'export', databaseName, '--config', configPath, '--remote', '--output', backup]);
  if (!fs.existsSync(backup) || fs.statSync(backup).size === 0) throw new Error('備份檔為空，未執行重編。');

  console.log('只套用 reader-remap/migrations 內的遷移；不會執行專案原本 migrations 資料夾。');
  wrangler(['d1', 'migrations', 'apply', databaseName, '--config', configPath, '--remote']);

  verifyDatabase();
  console.log('完成：訪客 ID 已連續重編，三張關聯表同步更新。舊新對照與遷移前快照保留在資料庫。');
  console.log('請重新整理 Dashboard。備份保留於：' + backup);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
