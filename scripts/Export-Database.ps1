param(
    [string]$Database = 'dorm_platform',
    [string]$Password = '123456',
    [string]$OutputPath = ''
)
$ErrorActionPreference = 'Stop'
if ($Database -notmatch '^[a-zA-Z0-9_]+$') { throw 'Invalid database name' }
$root = Split-Path $PSScriptRoot -Parent
if ([string]::IsNullOrWhiteSpace($OutputPath)) { $OutputPath = Join-Path $root 'database/dorm_platform.sql' }
$output = [IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path $output -Parent
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$env:MYSQL_PWD = $Password
try {
    & mysqldump --user=root --host=localhost --port=3306 --databases $Database --single-transaction --default-character-set=utf8mb4 --hex-blob --no-tablespaces --skip-column-statistics --set-gtid-purged=OFF --result-file=$output
    if ($LASTEXITCODE -ne 0) { throw 'mysqldump failed' }
    $sql = [IO.File]::ReadAllText($output, [Text.Encoding]::UTF8)
    $sql = $sql -replace '/\*!50013 DEFINER=`[^`]+`@`[^`]+` SQL SECURITY DEFINER \*/', '/*!50013 SQL SECURITY INVOKER */'
    [IO.File]::WriteAllText($output, $sql, [Text.UTF8Encoding]::new($false))
} finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
Write-Output ('Database snapshot exported: ' + $output)
