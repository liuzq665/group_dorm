param([int]$FrontendPort=5173,[int]$BackendPort=8080,[string]$Database='dorm_platform',[switch]$Build)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$backend=Join-Path $root 'dorm-platform-backend'
$frontend=Join-Path $root 'dorm-platform-frontend'
$log=Join-Path $root 'log'
New-Item -ItemType Directory -Path $log -Force | Out-Null
if($Database -notmatch '^[a-zA-Z0-9_]+$'){throw 'Invalid database name'}
function Port-InUse([int]$Port){$client=[Net.Sockets.TcpClient]::new();try{$client.Connect('127.0.0.1',$Port);return $true}catch{return $false}finally{$client.Dispose()}}
if((Port-InUse $FrontendPort) -or (Port-InUse $BackendPort)){throw 'Requested ports are already in use. Stop this project or choose other ports.'}
& (Join-Path $PSScriptRoot 'Initialize-Database.ps1') -Database $Database
if($Build){Push-Location $backend;try{& mvn.cmd -q -DskipTests package;if($LASTEXITCODE -ne 0){throw 'Backend build failed'}}finally{Pop-Location};Push-Location $frontend;try{& npm.cmd run build;if($LASTEXITCODE -ne 0){throw 'Frontend build failed'}}finally{Pop-Location}}
$jar=Join-Path $backend 'target/dorm-platform-backend-1.0.0.jar'
if(!(Test-Path $jar)){throw 'Build first with -Build'}
# Normalize duplicate Windows environment key casing before Start-Process.
$savedPath=$env:Path
Remove-Item Env:PATH -ErrorAction SilentlyContinue
$env:Path=$savedPath
$java=if($env:JAVA_HOME){Join-Path $env:JAVA_HOME 'bin/java.exe'}else{(Get-Command java).Source}
$node=(Get-Command node).Source
$arguments=@('-jar',$jar,('--server.port='+$BackendPort),('--app.frontend-origin=http://localhost:'+$FrontendPort),('--spring.datasource.url=jdbc:mysql://localhost:3306/'+$Database+'?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useSSL=false'),('--backup.database='+$Database))
$api=Start-Process -FilePath $java -ArgumentList $arguments -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $log ('backend-'+$BackendPort+'.log')) -RedirectStandardError (Join-Path $log ('backend-'+$BackendPort+'-error.log')) -PassThru
$env:PORT=[string]$FrontendPort
$env:API_TARGET='http://127.0.0.1:'+$BackendPort
$web=Start-Process -FilePath $node -ArgumentList 'server.mjs' -WorkingDirectory $frontend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $log ('frontend-'+$FrontendPort+'.log')) -RedirectStandardError (Join-Path $log ('frontend-'+$FrontendPort+'-error.log')) -PassThru
$runtime=Join-Path $root ('.runtime-'+$FrontendPort+'.json')
@{backendPid=$api.Id;frontendPid=$web.Id;backendStartedUtc=$api.StartTime.ToUniversalTime().ToString('o');frontendStartedUtc=$web.StartTime.ToUniversalTime().ToString('o');backendPort=$BackendPort;frontendPort=$FrontendPort;database=$Database}|ConvertTo-Json|Set-Content -LiteralPath $runtime -Encoding UTF8
$ready=$false
for($i=0;$i -lt 60;$i++){if($api.HasExited -or $web.HasExited){throw 'Service exited. Check backend/frontend logs.'};if((Port-InUse $FrontendPort) -and (Port-InUse $BackendPort)){$ready=$true;break};Start-Sleep -Seconds 1}
if(!$ready){throw 'Startup timed out. Check logs.'}
Write-Output ('Login: http://localhost:'+$FrontendPort+'/login')
Write-Output ('Backend PID: '+$api.Id+'; Frontend PID: '+$web.Id)
