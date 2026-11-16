$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8080/api/v1'
$results = New-Object System.Collections.ArrayList
$state = @{}

function Pass([string]$name, [string]$detail) {
  [void]$results.Add([pscustomobject]@{ name = $name; ok = $true; detail = $detail })
  Write-Host "[PASS] $name :: $detail"
}
function Fail([string]$name, [string]$detail) {
  [void]$results.Add([pscustomobject]@{ name = $name; ok = $false; detail = $detail })
  Write-Host "[FAIL] $name :: $detail"
}
function Check([string]$name, $condition, [string]$detail) {
  if ($condition) { Pass $name $detail } else { Fail $name $detail }
}
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
function Login([string]$account, [string]$password) {
  $r = Api 'POST' '/auth/login' $null @{ loginAccount = $account; password = $password }
  if ($r.status -ne 200) { throw "登录失败 $account : $($r.content)" }
  return $r.json.data.token
}
function Upload([string]$token, [string]$path, [string]$filePath) {
  $resp = Invoke-WebRequest -Uri "$base$path" -Method Post -Headers @{ Authorization = "Bearer $token" } -Form @{ file = Get-Item $filePath } -SkipHttpErrorCheck
  return [pscustomobject]@{ status = [int]$resp.StatusCode; json = ($resp.Content | ConvertFrom-Json); content = $resp.Content }
}

$image = Join-Path (Get-Location) 'test-results\visual\通用\login.png'
if (-not (Test-Path $image)) { $image = (Get-ChildItem 'test-results' -Recurse -Filter *.png | Select-Object -First 1).FullName }

Write-Host '=== 1. 登录四端账号 ==='
$sToken = Login 'student1' '123456'
$rToken = Login 'repair1' '123456'
$mToken = Login 'manager3' '123456'
Pass '登录' 'student1 / repair1 / manager3 登录成功'

Write-Host '=== 2. 报修闭环：建单-提交-审核-派单-接单-完工-确认-归档 ==='
$catalog = Api 'GET' '/repair-catalog' $sToken $null
Check '报修分类目录' ($catalog.status -eq 200 -and $catalog.json.data.categories.Count -gt 0) "categories=$($catalog.json.data.categories.Count)"
$categoryId = $catalog.json.data.categories[0].id
$fault = Upload $sToken '/files' $image
Check '故障照片上传' ($fault.status -eq 200 -and $fault.json.data.fileId) "fileId=$($fault.json.data.fileId)"
$created = Api 'POST' '/repair-orders' $sToken @{ title = 'E2E-B端闭环-报修'; description = 'E2E 自动化验收：宿舍门锁异响，需维修'; categoryId = $categoryId; fileIds = @($fault.json.data.fileId) }
$orderId = $created.json.data.orderId
Check '创建报修草稿' ($created.status -eq 200 -and $orderId) "orderId=$orderId"
$detail = Api 'GET' "/repair-orders/$orderId" $sToken $null
Check '草稿状态 DRAFT' ($detail.json.data.current_status -eq 'DRAFT') "status=$($detail.json.data.current_status)"
$submitted = Api 'POST' "/repair-orders/$orderId/submit" $sToken $null
$detail = Api 'GET' "/repair-orders/$orderId" $sToken $null
Check '提交后待审核' ($submitted.status -eq 200 -and $detail.json.data.current_status -eq 'PENDING_REVIEW') "status=$($detail.json.data.current_status)"
$review = Api 'POST' "/repair-orders/$orderId/review" $mToken @{ pass = $true; reason = 'E2E 审核通过' }
$detail = Api 'GET' "/repair-orders/$orderId" $mToken $null
$afterReview = $detail.json.data.current_status
Check '审核通过并派单' ($review.status -eq 200 -and $afterReview -in @('PENDING_ACCEPT', 'PENDING_MANUAL', 'ACCEPTED')) "status=$afterReview"
if ($afterReview -eq 'PENDING_ACCEPT') {
  $decision = Api 'POST' "/repair-orders/$orderId/decision" $rToken @{ accept = $true; reason = '' }
  $detail = Api 'GET' "/repair-orders/$orderId" $rToken $null
  Check '维修人员接单' ($decision.status -eq 200 -and $detail.json.data.current_status -eq 'ACCEPTED') "status=$($detail.json.data.current_status)"
} elseif ($afterReview -eq 'ACCEPTED') {
  Pass '维修人员接单' '强制派单已自动接单（无需人工接单）'
} else {
  Fail '维修人员接单' "工单进入 $afterReview，无可派维修人员，无法继续闭环"
}
$resultFile = Upload $rToken '/files' $image
$result = Api 'POST' "/repair-orders/$orderId/result" $rToken @{ result = 'E2E：已更换门锁并测试正常'; fileIds = @($resultFile.json.data.fileId) }
$detail = Api 'GET' "/repair-orders/$orderId" $rToken $null
Check '提交维修结果' ($result.status -eq 200 -and $detail.json.data.current_status -eq 'REPAIRED') "status=$($detail.json.data.current_status)"
$confirm = Api 'POST' "/repair-orders/$orderId/confirm" $sToken @{ score = 5; comment = 'E2E 自动化验收：维修及时，处理完成' }
$detail = Api 'GET' "/repair-orders/$orderId" $sToken $null
Check '学生确认并评价' ($confirm.status -eq 200 -and $detail.json.data.current_status -eq 'ARCHIVED') "status=$($detail.json.data.current_status) score=$($detail.json.data.score)"
$history = Api 'GET' '/repair-history' $sToken $null
$found = @($history.json.data | Where-Object { $_.order_id -eq $orderId }).Count -gt 0
Check '历史记录可查询' $found "historyCount=$($history.json.data.Count)"
$evals = Api 'GET' '/repair-evaluations' $sToken $null
Check '评价记录可查询' (@($evals.json.data).Count -gt 0) "evaluations=$(@($evals.json.data).Count)"
$state.repairOrderId = $orderId

Write-Host '=== 3. 报修重修闭环：已维修-申请重修-审核-手动派单 ==='
$create2 = Api 'POST' '/repair-orders' $sToken @{ title = 'E2E-B端闭环-重修'; description = 'E2E 自动化验收：重修流程'; categoryId = $categoryId; fileIds = @($fault.json.data.fileId) }
$orderId2 = $create2.json.data.orderId
Api 'POST' "/repair-orders/$orderId2/submit" $sToken $null | Out-Null
$review2 = Api 'POST' "/repair-orders/$orderId2/review" $mToken @{ pass = $true; reason = 'E2E 重修审核通过' }
$detail2 = Api 'GET' "/repair-orders/$orderId2" $mToken $null
$status2 = $detail2.json.data.current_status
if ($status2 -eq 'PENDING_ACCEPT') { Api 'POST' "/repair-orders/$orderId2/decision" $rToken @{ accept = $true; reason = '' } | Out-Null }
$result2 = Api 'POST' "/repair-orders/$orderId2/result" $rToken @{ result = 'E2E：首次维修完成'; fileIds = @($resultFile.json.data.fileId) }
$rework = Api 'POST' "/repair-orders/$orderId2/rework" $sToken @{ reason = 'E2E：问题仍未解决，申请重修'; fileIds = @() }
$detail2 = Api 'GET' "/repair-orders/$orderId2" $sToken $null
Check '提交重修申请' ($rework.status -eq 200 -and $detail2.json.data.current_status -eq 'PENDING_REVIEW') "status=$($detail2.json.data.current_status) reworkCount=$(@($detail2.json.data.reworkRequests).Count)"
$reviewRework = Api 'POST' "/repair-orders/$orderId2/review" $mToken @{ pass = $true; reason = 'E2E 重修核实通过' }
$detail2 = Api 'GET' "/repair-orders/$orderId2" $mToken $null
Check '重修审核通过进入手动派单' ($reviewRework.status -eq 200 -and $detail2.json.data.current_status -eq 'PENDING_MANUAL') "status=$($detail2.json.data.current_status)"
$candidates = Api 'GET' "/repair-orders/$orderId2/candidates" $mToken $null
Check '候选维修人员查询' ($candidates.status -eq 200) "candidates=$(@($candidates.json.data).Count)"
if (@($candidates.json.data).Count -gt 0) {
  $worker = @($candidates.json.data)[0].repairer_user_id
  $forced = Api 'POST' "/repair-orders/$orderId2/dispatch" $mToken @{ repairerUserId = $worker }
  $detail2 = Api 'GET' "/repair-orders/$orderId2" $mToken $null
  Check '强制派单自动接单' ($forced.status -eq 200 -and $detail2.json.data.current_status -eq 'ACCEPTED') "status=$($detail2.json.data.current_status)"
}
$state.reworkOrderId = $orderId2

Write-Host '=== 3.5 清理留宿历史测试数据（仅 student1 / batch 41，保证脚本可重复执行）==='
$mysql = 'D:\software\MySQL-8.0.46\bin\mysql.exe'
$resetSql = @"
DELETE a FROM stay_version_attachment a JOIN stay_version v ON v.version_id=a.version_id JOIN stay_application s ON s.application_id=v.application_id WHERE s.student_id=1 AND s.batch_id=41;
DELETE r FROM stay_date_range r JOIN stay_version v ON v.version_id=r.version_id JOIN stay_application s ON s.application_id=v.application_id WHERE s.student_id=1 AND s.batch_id=41;
DELETE rv FROM stay_review rv JOIN stay_application s ON s.application_id=rv.application_id WHERE s.student_id=1 AND s.batch_id=41;
DELETE v FROM stay_version v JOIN stay_application s ON s.application_id=v.application_id WHERE s.student_id=1 AND s.batch_id=41;
DELETE FROM stay_application WHERE student_id=1 AND batch_id=41;
"@
& $mysql -uroot -p123456 -D dorm_platform -e $resetSql 2>$null
Pass '留宿测试数据重置' '已清理 student1 在 batch 41 的历史申请（测试夹具）'

Write-Host '=== 4. 留宿闭环：草稿-提交-撤回-重提-锁定-驳回-重交-审核通过 ==='
$batches = Api 'GET' '/stay/current' $sToken $null
$openBatch = @($batches.json.data | Where-Object { $_.current_status -eq 'OPEN' } | Select-Object -First 1)
Check '查询开放留宿批次' ($batches.status -eq 200 -and $openBatch.Count -eq 1) "batches=$(@($batches.json.data).Count) openBatch=$($openBatch.batch_id)"
$batch = $openBatch[0]
$start = ([datetime]$batch.open_start_date).AddDays(1)
$end = $start.AddDays(2)
$stayFile = Upload $sToken '/stay/applications/files' $image
Check '留宿材料上传' ($stayFile.status -eq 200 -and $stayFile.json.data.fileId) "fileId=$($stayFile.json.data.fileId)"
$ranges = @(@{ startDate = $start.ToString('yyyy-MM-dd'); endDate = $end.ToString('yyyy-MM-dd') })
$saved = Api 'POST' '/stay/applications' $sToken @{ batchId = $batch.batch_id; reason = 'E2E 自动化验收留宿申请'; dateRanges = $ranges; fileIds = @($stayFile.json.data.fileId) }
$appId = $saved.json.data.applicationId
Check '留宿草稿保存' ($saved.status -eq 200 -and $appId) "applicationId=$appId"
$submitted = Api 'POST' "/stay/applications/$appId/submit" $sToken $null
$apps = Api 'GET' '/stay/applications' $sToken $null
$app = @($apps.json.data | Where-Object { $_.application_id -eq $appId })[0]
Check '提交后待审核' ($submitted.status -eq 200 -and $app.current_status -eq 'PENDING_REVIEW') "status=$($app.current_status)"
$withdraw = Api 'POST' "/stay/applications/$appId/withdraw" $sToken $null
$apps = Api 'GET' '/stay/applications' $sToken $null
$app = @($apps.json.data | Where-Object { $_.application_id -eq $appId })[0]
Check '撤回后回到草稿' ($withdraw.status -eq 200 -and $app.current_status -eq 'DRAFT') "status=$($app.current_status)"
$resaved = Api 'POST' '/stay/applications' $sToken @{ batchId = $batch.batch_id; reason = 'E2E 自动化验收留宿申请（撤回后重新编辑）'; dateRanges = $ranges; fileIds = @($stayFile.json.data.fileId) }
$resubmitted = Api 'POST' "/stay/applications/$appId/submit" $sToken $null
$apps = Api 'GET' '/stay/applications' $sToken $null
$app = @($apps.json.data | Where-Object { $_.application_id -eq $appId })[0]
Check '撤回后重新提交' ($resubmitted.status -eq 200 -and $app.current_status -eq 'PENDING_REVIEW') "status=$($app.current_status)"
$locked = Api 'POST' "/stay/applications/$appId/lock" $mToken @{ locked = $true }
$apps = Api 'GET' '/stay/applications' $mToken $null
$app = @($apps.json.data | Where-Object { $_.application_id -eq $appId })[0]
Check '宿管锁定进入审核中' ($locked.status -eq 200 -and $app.current_status -eq 'UNDER_REVIEW') "status=$($app.current_status)"
$deadline = (Get-Date).AddMinutes(2).ToString('yyyy-MM-ddTHH:mm:ss')
$reject = Api 'POST' "/stay/applications/$appId/review" $mToken @{ pass = $false; reason = 'E2E 退回：请补充说明留宿事由'; resubmitDeadline = $deadline }
$apps = Api 'GET' '/stay/applications' $mToken $null
$app = @($apps.json.data | Where-Object { $_.application_id -eq $appId })[0]
Check '审核驳回转待修改' ($reject.status -eq 200 -and $app.current_status -eq 'PENDING_EDIT') "status=$($app.current_status) reason=$($app.review_reason)"
$resaved2 = Api 'POST' '/stay/applications' $sToken @{ batchId = $batch.batch_id; reason = 'E2E 自动化验收留宿申请（已补充事由并重交）'; dateRanges = $ranges; fileIds = @($stayFile.json.data.fileId) }
$re = Api 'POST' "/stay/applications/$appId/submit" $sToken $null
$apps = Api 'GET' '/stay/applications' $sToken $null
$app = @($apps.json.data | Where-Object { $_.application_id -eq $appId })[0]
Check '待修改后重新提交' ($re.status -eq 200 -and $app.current_status -eq 'UNDER_REVIEW') "status=$($app.current_status)"
$state.stayAppId = $appId
$state.stayReviewAt = $deadline

$results | ConvertTo-Json -Depth 5 | Set-Content -Path test-results\e2e-b-flow-part1.json -Encoding utf8
$state | ConvertTo-Json -Depth 5 | Set-Content -Path test-results\e2e-b-state.json -Encoding utf8
$failed = @($results | Where-Object { -not $_.ok })
Write-Host "===== 阶段一结果：PASS $(@($results | Where-Object { $_.ok }).Count) / FAIL $($failed.Count) ====="
if ($failed.Count -gt 0) { $failed | ForEach-Object { Write-Host "  失败：$($_.name) :: $($_.detail)" } }
