$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8080/api/v1'
$results = New-Object System.Collections.ArrayList
$state = @{}
if (Test-Path 'test-results\e2e-b-state.json') { $state = Get-Content 'test-results\e2e-b-state.json' -Raw | ConvertFrom-Json }

function Pass([string]$name, [string]$detail) { [void]$results.Add([pscustomobject]@{ name = $name; ok = $true; detail = $detail }); Write-Host "[PASS] $name :: $detail" }
function Fail([string]$name, [string]$detail) { [void]$results.Add([pscustomobject]@{ name = $name; ok = $false; detail = $detail }); Write-Host "[FAIL] $name :: $detail" }
function Check([string]$name, $condition, [string]$detail) { if ($condition) { Pass $name $detail } else { Fail $name $detail } }
function Api([string]$method, [string]$path, [string]$token, $body) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  $params = @{ Uri = "$base$path"; Method = $method; Headers = $headers; ContentType = 'application/json'; SkipHttpErrorCheck = $true }
  if ($null -ne $body) { $params['Body'] = ($body | ConvertTo-Json -Depth 8 -Compress) }
  $resp = Invoke-WebRequest @params
  $json = $null
  try { $json = $resp.Content | ConvertFrom-Json } catch { }
  return [pscustomobject]@{ status = [int]$resp.StatusCode; json = $json; content = $resp.Content }
}
function Login([string]$account) {
  $r = Api 'POST' '/auth/login' $null @{ loginAccount = $account; password = '123456' }
  if ($r.status -ne 200) { throw "登录失败 $account : $($r.content)" }
  return $r.json.data.token
}
function Upload([string]$token, [string]$path, [string]$filePath) {
  $resp = Invoke-WebRequest -Uri "$base$path" -Method Post -Headers @{ Authorization = "Bearer $token" } -Form @{ file = Get-Item $filePath } -SkipHttpErrorCheck
  return [pscustomobject]@{ status = [int]$resp.StatusCode; json = ($resp.Content | ConvertFrom-Json); content = $resp.Content }
}
$image = Join-Path (Get-Location) 'test-results\visual\通用\login.png'
if (-not (Test-Path $image)) { $image = (Get-ChildItem 'test-results' -Recurse -Filter *.png | Select-Object -First 1).FullName }

$sToken = Login 'student1'
$rToken = Login 'repair1'
$mToken = Login 'manager3'
$categoryId = (Api 'GET' '/repair-catalog' $sToken $null).json.data.categories[0].id

Write-Host '=== 5. 留宿审核通过与通知 ==='
$appId = $state.stayAppId
if (-not $appId) { $appId = 542 }
$apps = (Api 'GET' '/stay/applications' $sToken $null).json.data
$app = @($apps | Where-Object { $_.application_id -eq $appId })[0]
if (-not $app) { $app = @($apps)[0]; $appId = $app.application_id }
if ($app.current_status -eq 'APPROVED') {
  Pass '宿管审核通过' "appId=$appId 复用上次审核结果：APPROVED"
} else {
  Check '留宿申请当前在审核中' ($app.current_status -eq 'UNDER_REVIEW') "appId=$appId status=$($app.current_status)"
  $deadline = $null
  if ($app.resubmit_deadline) { $deadline = [datetime]$app.resubmit_deadline }
  if ($deadline) {
    $wait = [math]::Ceiling(($deadline.AddSeconds(3) - (Get-Date)).TotalSeconds)
    if ($wait -gt 0) { Write-Host "等待重交截止时间到达：$wait 秒"; Start-Sleep -Seconds ([math]::Min($wait, 200)) }
  }
  $review = Api 'POST' "/stay/applications/$appId/review" $mToken @{ pass = $true; reason = 'E2E 审核通过' }
  $apps = (Api 'GET' '/stay/applications' $sToken $null).json.data
  $app = @($apps | Where-Object { $_.application_id -eq $appId })[0]
  Check '宿管审核通过' ($review.status -eq 200 -and $app.current_status -eq 'APPROVED') "status=$($app.current_status)"
}
$msgs = (Api 'GET' '/messages?read=ALL' $sToken $null).json.data
$approvedMsg = @($msgs | Where-Object { $_.content -match '留宿' -and ($_.content -match '通过') }).Count -gt 0
Check '学生收到留宿结果通知' $approvedMsg "messages=$($msgs.Count)"
$unread = (Api 'GET' '/messages/unread-count' $sToken $null).json.data
Check '未读消息计数可查询' ($null -ne $unread.count) "unread=$($unread.count)"

Write-Host '=== 6. 报修撤销与重新提交 ==='
$created = Api 'POST' '/repair-orders' $sToken @{ title = 'E2E-B端闭环-撤销重提'; description = 'E2E 自动化验收：撤销后重新提交'; categoryId = $categoryId; fileIds = @() }
$cancelOrder = $created.json.data.orderId
Api 'POST' "/repair-orders/$cancelOrder/submit" $sToken $null | Out-Null
$cancel = Api 'POST' "/repair-orders/$cancelOrder/cancel" $sToken $null
$d = (Api 'GET' "/repair-orders/$cancelOrder" $sToken $null).json.data
Check '待审核工单可撤销' ($cancel.status -eq 200 -and $d.current_status -eq 'CANCELLED') "status=$($d.current_status)"
$history = (Api 'GET' '/repair-history' $sToken $null).json.data
Check '撤销工单进入历史记录' (@($history | Where-Object { $_.order_id -eq $cancelOrder }).Count -eq 1) "historyCount=$($history.Count)"
$resubmit = Api 'POST' "/repair-orders/$cancelOrder/resubmit" $sToken $null
$d = (Api 'GET' "/repair-orders/$cancelOrder" $sToken $null).json.data
Check '撤销后重新提交' ($resubmit.status -eq 200 -and $d.current_status -eq 'PENDING_REVIEW') "status=$($d.current_status)"

Write-Host '=== 7. 报修审核驳回-修改-重提 ==='
$created = Api 'POST' '/repair-orders' $sToken @{ title = 'E2E-B端闭环-驳回重提'; description = 'E2E 自动化验收：审核驳回后修改重提'; categoryId = $categoryId; fileIds = @() }
$editOrder = $created.json.data.orderId
Api 'POST' "/repair-orders/$editOrder/submit" $sToken $null | Out-Null
$reject = Api 'POST' "/repair-orders/$editOrder/review" $mToken @{ pass = $false; reason = 'E2E 请补充故障位置说明' }
$d = (Api 'GET' "/repair-orders/$editOrder" $sToken $null).json.data
Check '审核驳回转待修改' ($reject.status -eq 200 -and $d.current_status -eq 'PENDING_EDIT') "status=$($d.current_status) reason=$($d.reject_reason)"
$edit = Api 'PUT' "/repair-orders/$editOrder" $sToken @{ title = 'E2E-B端闭环-驳回重提（已修改）'; description = 'E2E 自动化验收：已补充位置与现象说明'; categoryId = $categoryId; fileIds = @() }
$reEdit = Api 'POST' "/repair-orders/$editOrder/submit" $sToken $null
$d = (Api 'GET' "/repair-orders/$editOrder" $sToken $null).json.data
Check '待修改可编辑并重新提交' ($edit.status -eq 200 -and $reEdit.status -eq 200 -and $d.current_status -eq 'PENDING_REVIEW') "status=$($d.current_status) title=$($d.title)"

Write-Host '=== 8. 报修延期申请与复核 ==='
$created = Api 'POST' '/repair-orders' $sToken @{ title = 'E2E-B端闭环-延期'; description = 'E2E 自动化验收：延期申请与复核'; categoryId = $categoryId; fileIds = @() }
$delayOrder = $created.json.data.orderId
Api 'POST' "/repair-orders/$delayOrder/submit" $sToken $null | Out-Null
$review = Api 'POST' "/repair-orders/$delayOrder/review" $mToken @{ pass = $true; reason = 'E2E 审核通过' }
$d = (Api 'GET' "/repair-orders/$delayOrder" $mToken $null).json.data
if ($d.current_status -eq 'PENDING_ACCEPT') { Api 'POST' "/repair-orders/$delayOrder/decision" $rToken @{ accept = $true; reason = '' } | Out-Null }
$delayUpload = Upload $rToken '/files' $image
$delayFid = $delayUpload.json.data.fileId
if (-not $delayFid) { throw "延期照片上传失败：$($delayUpload.content)" }
$expected = (Get-Date).AddDays(3).ToString('yyyy-MM-ddTHH:mm:ss')
$delay = Api 'POST' "/repair-orders/$delayOrder/delay" $rToken @{ reason = 'E2E：配件到货延迟，申请延期'; expectedFinishAt = $expected; fileIds = @($delayFid) }
$d = (Api 'GET' "/repair-orders/$delayOrder" $rToken $null).json.data
Check '维修人员提交延期申请' ($delay.status -eq 200 -and $d.current_status -eq 'DELAYED') "status=$($d.current_status)"
$delayReview = Api 'POST' "/repair-orders/$delayOrder/delay-review" $mToken @{ pass = $true; reason = 'E2E 同意延期' }
$d = (Api 'GET' "/repair-orders/$delayOrder" $mToken $null).json.data
$delayApproved = @($d.delays | Where-Object { $_.current_status -eq 'APPROVED' }).Count -gt 0
Check '延期申请复核通过' ($delayReview.status -eq 200 -and $delayApproved) "status=$($d.current_status) delayApproved=$delayApproved"
$resultUpload = Upload $rToken '/files' $image
$resultFid = $resultUpload.json.data.fileId
if (-not $resultFid) { throw "完工照片上传失败：$($resultUpload.content)" }
$result = Api 'POST' "/repair-orders/$delayOrder/result" $rToken @{ result = 'E2E：延期后完成维修'; fileIds = @($resultFid) }
$d = (Api 'GET' "/repair-orders/$delayOrder" $rToken $null).json.data
Check '延期工单提交结果' ($result.status -eq 200 -and $d.current_status -eq 'REPAIRED') "status=$($d.current_status)"
$confirm = Api 'POST' "/repair-orders/$delayOrder/confirm" $sToken @{ score = 4; comment = 'E2E 自动化验收：延期后完成，评价 4 分' }
$d = (Api 'GET' "/repair-orders/$delayOrder" $sToken $null).json.data
Check '延期工单确认评价归档' ($confirm.status -eq 200 -and $d.current_status -eq 'ARCHIVED') "status=$($d.current_status) score=$($d.score)"

Write-Host '=== 9. 小程序页面数据接口核对 ==='
$acc = Api 'GET' '/accommodations/current' $sToken $null
Check '住宿当前信息接口' ($acc.status -eq 200 -and @($acc.json.data).Count -ge 1) "rooms=$(@($acc.json.data).Count)"
$roommates = Api 'GET' '/accommodations/roommates' $sToken $null
Check '舍友接口' ($roommates.status -eq 200) "count=$(@($roommates.json.data).Count)"
$accHistory = Api 'GET' '/accommodations/history' $sToken $null
Check '住宿历史接口' ($accHistory.status -eq 200) "count=$(@($accHistory.json.data).Count)"
$profile = Api 'GET' '/profile' $sToken $null
Check '个人资料接口' ($profile.status -eq 200 -and $profile.json.data.login_account) "account=$($profile.json.data.login_account)"
$stats = Api 'GET' '/repairer-stats' $rToken $null
$statsOk = $stats.status -eq 200 -and $null -ne $stats.json.data.pendingAccept -and $null -ne $stats.json.data.completed -and $null -ne $stats.json.data.averageScore
Check '维修记录统计接口（小程序卡片字段）' $statsOk "completed=$($stats.json.data.completed) avg=$($stats.json.data.averageScore) evals=$($stats.json.data.evaluations)"
$repairHistory = Api 'GET' '/repair-history' $rToken $null
Check '维修人员历史工单接口' ($repairHistory.status -eq 200) "count=$(@($repairHistory.json.data).Count)"
$managerRepairs = Api 'GET' '/repair-orders' $mToken $null
Check '宿管工单列表接口' ($managerRepairs.status -eq 200) "count=$(@($managerRepairs.json.data).Count)"
$buildings = Api 'GET' '/buildings' $mToken $null
Check '楼栋接口（消息筛选）' ($buildings.status -eq 200) "count=$(@($buildings.json.data).Count)"
$dashboard = Api 'GET' '/dashboard' $mToken $null
Check '工作台概览接口' ($dashboard.status -eq 200) "keys=$((@($dashboard.json.data.PSObject.Properties.Name)) -join ',')"

$results | ConvertTo-Json -Depth 5 | Set-Content -Path test-results\e2e-b-flow-part2.json -Encoding utf8
$failed = @($results | Where-Object { -not $_.ok })
Write-Host "===== 阶段二结果：PASS $(@($results | Where-Object { $_.ok }).Count) / FAIL $($failed.Count) ====="
if ($failed.Count -gt 0) { $failed | ForEach-Object { Write-Host "  失败：$($_.name) :: $($_.detail)" } }
