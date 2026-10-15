param([string]$Database = 'dorm_platform', [string]$Password = '123456')
$ErrorActionPreference = 'Stop'
if ($Database -notmatch '^[a-zA-Z0-9_]+$') { throw 'Invalid database name' }
$root = Split-Path $PSScriptRoot -Parent
$resources = Join-Path $root 'dorm-platform-backend/src/main/resources'
$env:MYSQL_PWD = $Password
function Query([string]$Sql) {
    $result = & mysql --user=root --default-character-set=utf8mb4 --batch --skip-column-names --execute=$Sql
    if ($LASTEXITCODE -ne 0) { throw 'Database command failed' }
    return $result
}
function Apply([string]$Name) {
    $sql = [IO.File]::ReadAllText((Join-Path $resources $Name), [Text.Encoding]::UTF8)
    $sql = $sql.Replace('CREATE DATABASE IF NOT EXISTS dorm_platform', ('CREATE DATABASE IF NOT EXISTS ' + $Database)).Replace('USE dorm_platform;', ('USE ' + $Database + ';'))
    $temporary = Join-Path $env:TEMP ('dorm-migration-' + [guid]::NewGuid().ToString() + '.sql')
    try {
        [IO.File]::WriteAllText($temporary, $sql, [Text.UTF8Encoding]::new($false))
        $sourceCommand = 'source ' + $temporary.Replace('\','/')
        & mysql --user=root --default-character-set=utf8mb4 $Database -e $sourceCommand
        if ($LASTEXITCODE -ne 0) { throw ('Migration failed: ' + $Name) }
    } finally { Remove-Item -LiteralPath $temporary -ErrorAction SilentlyContinue }
}
try {
    Query ('CREATE DATABASE IF NOT EXISTS ' + $Database + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    $tables = [int](Query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$Database' AND table_name='sys_user'")
    if ($tables -eq 0) {
        Apply 'schema.sql'
        Apply 'data.sql'
        Apply 'migration-v2.sql'
        Apply 'migration-v3.sql'
        Apply 'demo-v3.sql'
    } else {
        $versionTable = [int](Query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$Database' AND table_name='schema_version'")
        if ($versionTable -eq 0) {
            $v2 = [int](Query "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='$Database' AND table_name='repair_order' AND column_name='parent_order_id'")
            if ($v2 -eq 0) { Apply 'migration-v2.sql' }
            Apply 'migration-v3.sql'
        }
    }
    $v4 = [int](Query ('SELECT COUNT(*) FROM ' + $Database + '.schema_version WHERE version_no=4'))
    if ($v4 -eq 0) { Apply 'migration-v4.sql' }
    Query ('SELECT version_no,installed_at FROM ' + $Database + '.schema_version ORDER BY version_no')
} finally { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
