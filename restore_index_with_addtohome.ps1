# Run from the root of henry-chen-reading-notes.
$ErrorActionPreference = 'Stop'
$path = 'src/pages/index.astro'
if (-not (Test-Path $path)) { throw "Cannot find $path. Run this script in the Astro project root." }
if (-not (Test-Path 'src/components/AddToHome.astro')) { throw 'Missing src/components/AddToHome.astro. Create the component first.' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $path "$path.before-addtohome-$stamp.bak"
# Retrieve the most recent committed, known-good homepage.
$original = & git show "HEAD:$path" 2>&1
if ($LASTEXITCODE -ne 0) { throw "git show failed: $original" }
$source = ($original -join "`n")
if ($source -notmatch '(?s)^---\s*\n.*?\n---') { throw 'Unexpected Astro frontmatter; original file left untouched.' }
if ($source -notmatch 'import\s+AddToHome\s+from') {
  $source = [regex]::Replace($source, '(?m)^---\s*\r?\n', "---`nimport AddToHome from '../components/AddToHome.astro';`n", 1)
}
if ($source -notmatch '<AddToHome\s*/>') {
  $pattern = '(?s)(<p\s+class="hero-copy"\s*>.*?</p>)'
  if (-not [regex]::IsMatch($source, $pattern)) { throw 'Could not locate hero-copy paragraph; original file left untouched.' }
  $source = [regex]::Replace($source, $pattern, '$1' + "`n`n    <AddToHome />", 1)
}
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $path), ($source.TrimEnd() + "`n"), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Restored and updated $path" -ForegroundColor Green
Write-Host "Previous working file backed up to $path.before-addtohome-$stamp.bak"
Write-Host 'Run npm run build to verify.'
