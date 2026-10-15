param([int]$FrontendPort=5173)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$runtime=Join-Path $root ('.runtime-'+$FrontendPort+'.json')
if(!(Test-Path -LiteralPath $runtime)){throw 'No runtime record found for this frontend port.'}
$record=Get-Content -Raw -LiteralPath $runtime | ConvertFrom-Json
$targets=@(
    @{Id=$record.backendPid;Started=$record.backendStartedUtc;Name='java'},
    @{Id=$record.frontendPid;Started=$record.frontendStartedUtc;Name='node'}
)
$verified=@()
foreach($target in $targets){
    $process=Get-Process -Id $target.Id -ErrorAction SilentlyContinue
    if($null -eq $process){continue}
    if(!$target.Started){throw 'Runtime record has no process start time. Verify these process IDs manually before stopping.'}
    if($process.ProcessName -ne $target.Name -or $process.StartTime.ToUniversalTime().ToString('o') -ne $target.Started){throw 'Process identity changed. No process was stopped.'}
    $verified+=$process
}
foreach($process in $verified){Stop-Process -InputObject $process -ErrorAction Stop}
Remove-Item -LiteralPath $runtime
Write-Output ('Stopped project on frontend port '+$FrontendPort)
