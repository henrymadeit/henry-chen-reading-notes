import {isAdmin, privateJson} from '../../server/admin';
import type {ReaderEnv} from '../../server/readers';
import {sourceLabels} from '../../server/traffic';

export const onRequestGet: PagesFunction<ReaderEnv> = async ({request,env}) => {
  if(!await isAdmin(request,env))return privateJson({error:'請先登入'},401);
  const requested=Number(new URL(request.url).searchParams.get('days'));
  const days=[7,30,90].includes(requested)?requested:30;
  // Explicit Taipei calendar boundaries; no reliance on database host timezone.
  const today=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  const startDay=new Date(Date.parse(today+'T00:00:00Z')-(days-1)*86400000).toISOString().slice(0,10);
  const start=new Date(Date.parse(startDay+'T00:00:00+08:00')).toISOString().slice(0,19).replace('T',' ');
  const end=new Date(Date.parse(today+'T00:00:00+08:00')+86400000).toISOString().slice(0,19).replace('T',' ');
  const db=env.henryreads_comments;
  try {
    const results=await db.batch([
      db.prepare(`SELECT date(created_at,'+8 hours') AS day,
        SUM(kind='view') AS views, COUNT(DISTINCT CASE WHEN kind='view' THEN reader_id END) AS visitors,
        SUM(kind='like') AS likes, SUM(kind='unlike') AS unlikes,
        SUM(kind IN ('comment','reply')) AS comments
        FROM reader_events WHERE created_at>=? AND created_at<? GROUP BY day ORDER BY day`).bind(start,end),
      db.prepare(`SELECT COUNT(DISTINCT CASE WHEN kind='view' THEN reader_id END) AS visitors,
        SUM(kind='view') AS views, SUM(kind='like') AS likes, SUM(kind='unlike') AS unlikes,
        SUM(kind IN ('comment','reply')) AS comments FROM reader_events WHERE created_at>=? AND created_at<?`).bind(start,end),
      db.prepare(`SELECT slug,SUM(kind='view') AS views,
        COUNT(DISTINCT CASE WHEN kind='view' THEN reader_id END) AS visitors,
        SUM(kind='like') AS likes,SUM(kind='unlike') AS unlikes,
        SUM(kind IN ('comment','reply')) AS comments
        FROM reader_events WHERE created_at>=? AND created_at<? GROUP BY slug
        ORDER BY views DESC,comments DESC,slug LIMIT 100`).bind(start,end),
      db.prepare(`SELECT date(created_at,'+8 hours') AS day,source,COUNT(*) AS views,
        COUNT(DISTINCT reader_id) AS visitors FROM reader_traffic
        WHERE created_at>=? AND created_at<? GROUP BY day,source ORDER BY day,source`).bind(start,end),
      db.prepare(`SELECT source,COUNT(*) AS views,COUNT(DISTINCT reader_id) AS visitors
        FROM reader_traffic WHERE created_at>=? AND created_at<?
        GROUP BY source ORDER BY views DESC,source`).bind(start,end),
      db.prepare('SELECT MIN(created_at) AS first_event FROM reader_events'),
      db.prepare('SELECT MIN(created_at) AS first_source FROM reader_traffic'),
      // First recorded appearance of each browser, including readers with no article views.
      // Read-only queries: no migration or changes to reader tracking.
      db.prepare(`SELECT date(first_seen,'+8 hours') AS day, COUNT(*) AS newVisitors
        FROM readers WHERE first_seen>=? AND first_seen<?
        GROUP BY day ORDER BY day`).bind(start,end),
      db.prepare('SELECT COUNT(*) AS newVisitors FROM readers WHERE first_seen>=? AND first_seen<?').bind(start,end),
      db.prepare('SELECT MIN(first_seen) AS first_reader FROM readers')
    ]);
    return privateJson({days,today,startDay,daily:results[0].results,
      totals:{...results[1].results[0],...results[8].results[0]},articles:results[2].results,
      sourceDaily:results[3].results,sources:results[4].results,
      newVisitorsDaily:results[7].results,
      coverage:{...results[5].results[0],...results[6].results[0],...results[9].results[0]},sourceLabels});
  } catch {
    return privateJson({error:'無法讀取趨勢；請確認讀者資料表與 2026-10-23-trends.sql 已套用。'},503);
  }
};
