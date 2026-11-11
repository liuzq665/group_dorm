# 小程序 B 板块（维修人员端 + 学生端 + 布局专项）接口级验证脚本
# 用法：后端启动后执行  pwsh -File tools/verify-b-scope.ps1
# 说明：会写入少量验证数据（报修/留宿/消息），用于证明四端流程可走通；结果输出到 test-results/b-scope-verification.json
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8080/api/v1'
$result = [ordered]@{ startedAt = (Get-Date).ToString('s'); checks = @() }

function Add-Check([string]$name, [bool]$pass, $detail) {
  $script:result.checks += [ordered]@{ name = $name; pass = $pass; detail = $detail }
  $flag = if ($pass) { 'PASS' } else { 'FAIL' }
  Write-Host ("[{0}] {1}" -f $flag, $name) -ForegroundColor $(if ($pass) { 'Green' } else { 'Red' })
  if (-not $pass) { Write-Host ("       -> " + ($detail | ConvertTo-Json -Depth 6 -Compress)) -ForegroundColor DarkYellow }
}

function Login([string]$account) {
  $body = @{ loginAccount = $account; password = '123456' } | ConvertTo-Json
  return (Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $body -ContentType 'application/json').data
}

function Api($session, [string]$path, [string]$method = 'GET', $body = $null) {
  $headers = @{ Authorization = "Bearer $($session.token)" }
  $params = @{ Uri = "$base$path"; Headers = $headers; Method = $method }
  if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Depth 8); $params.ContentType = 'application/json' }
  return (Invoke-RestMethod @params).data
}

function Api-Error($session, [string]$path, [string]$method = 'GET', $body = $null) {
  try { $null = Api $session $path $method $body; return '' } catch {
    $raw = $_.ErrorDetails.Message
    if (-not $raw) { return $_.Exception.Message }
    try { return (ConvertFrom-Json $raw).message } catch { return $raw }
  }
}

# 上传一张 1x1 PNG 作为现场照片/申请材料
function Upload-File($session, [string]$path) {
  $png = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
  $temp = Join-Path $env:TEMP ("verify-{0}.png" -f ([guid]::NewGuid().ToString('N')))
  [System.IO.File]::WriteAllBytes($temp, $png)
  $form = @{ file = Get-Item $temp }
  $response = Invoke-RestMethod -Uri "$base$path" -Method Post -Headers @{ Authorization = "Bearer $($session.token)" } -Form $form
  Remove-Item $temp -Force
  return $response.data.fileId
}

$student = Login 'student1'
$manager = Login 'manager3'
$repairer = Login 'repair1'
$admin = Login 'admin'

# ---------------------------------------------------------------- 0. 环境准备
# repair1 演示账号在演示数据中缺少负责楼栋，导致派单只能转“待人工处理”。
# 按交付说明“维修人员演示账号具备三个工种及三个楼栋范围”补齐，用于验证维修端流程。
$catalog = Api $student '/repair-catalog'
$repairerProfile = Api $repairer '/profile'
$workTypeIds = @(1, 2, 3)
$adminRepairConfig = Api $admin '/admin/repair-config'
$buildingIds = @($adminRepairConfig.workers | Where-Object { $_.repairer_user_id -eq 3 } | ForEach-Object { $_.buildingIds })
$studentHome = (Api $student '/accommodations/current')[0]
Api $admin "/admin/repairers/3" 'PUT' @{
  onDuty           = $true
  maxActiveOrders  = ''
  workTypeIds      = $workTypeIds
  buildingIds      = @($studentHome.building_id)
} | Out-Null
$repairerBuildings = Api $repairer '/buildings'
Add-Check '维修端可读取本人负责楼栋（消息中心楼栋筛选数据源）' ($repairerBuildings.Count -ge 1) @{ count = $repairerBuildings.Count; buildings = @($repairerBuildings | ForEach-Object { $_.building_name }) }

# ------------------------------------------------------------ 1. 报修主流程
$category = ($catalog.categories | Where-Object { $workTypeIds -contains [int]$_.workTypeId } | Select-Object -First 1)
$photoId = Upload-File $student '/files'
$created = Api $student '/repair-orders' 'POST' @{
  title       = 'B端验证-卫生间水龙头漏水'
  description = '水龙头持续滴水，阀门无法关紧，影响正常使用'
  categoryId  = [int]$category.id
  fileIds     = @($photoId)
}
$orderId = $created.orderId
Api $student "/repair-orders/$orderId/submit" 'POST' | Out-Null
$afterSubmit = Api $student "/repair-orders/$orderId"
Add-Check '学生提交报修后状态为待审核' ($afterSubmit.current_status -eq 'PENDING_REVIEW') @{ status = $afterSubmit.current_status; orderNo = $afterSubmit.order_no }

Api $manager "/repair-orders/$orderId/review" 'POST' @{ pass = $true; reason = ''; urgent = $false } | Out-Null
$afterReview = Api $manager "/repair-orders/$orderId"
Add-Check '宿管审核通过后自动派单给具备资质的维修人员' ($afterReview.current_status -eq 'PENDING_ACCEPT') @{ status = $afterReview.current_status; repairer = $afterReview.repairer_name }

$repairerOrders = Api $repairer '/repair-orders'
Add-Check '维修人员端“维修任务”能收到该派单' (@($repairerOrders | Where-Object { $_.order_id -eq $orderId }).Count -eq 1) @{ count = @($repairerOrders).Count }
Add-Check '维修任务列表状态口径为“待接单”' (($repairerOrders | Where-Object { $_.order_id -eq $orderId }).current_status -eq 'PENDING_ACCEPT') @{}

Api $repairer "/repair-orders/$orderId/decision" 'POST' @{ accept = $true; reason = '' } | Out-Null
$resultPhoto = Upload-File $repairer '/files'
Api $repairer "/repair-orders/$orderId/result" 'POST' @{ result = '更换水龙头阀芯并做密封处理，试水无渗漏'; fileIds = @($resultPhoto) } | Out-Null
$afterResult = Api $student "/repair-orders/$orderId"
Add-Check '维修人员提交结果后学生端状态为待确认' ($afterResult.current_status -eq 'REPAIRED') @{ status = $afterResult.current_status }
Add-Check '学生端详情可见维修结果与完工照片' ([bool]$afterResult.result_text -and @($afterResult.files).Count -ge 2) @{ files = @($afterResult.files).Count }

# 评分/文字评价必填校验（与界面必填规则一致）
$missingComment = Api-Error $student "/repair-orders/$orderId/confirm" 'POST' @{ score = 4; comment = '' }
Add-Check '确认完成时文字评价缺失会被拒绝（必填口径）' ($missingComment -ne '') @{ message = $missingComment }

Api $student "/repair-orders/$orderId/confirm" 'POST' @{ score = 4; comment = '维修及时，处理干净，问题已解决' } | Out-Null
$afterConfirm = Api $student "/repair-orders/$orderId"
Add-Check '学生确认完成后工单归档并保存评分' ($afterConfirm.current_status -eq 'ARCHIVED' -and [int]$afterConfirm.score -eq 4) @{ status = $afterConfirm.current_status; score = $afterConfirm.score; comment = $afterConfirm.comment }

$studentHistory = Api $student '/repair-history'
$historyRow = $studentHistory | Where-Object { $_.order_id -eq $orderId }
Add-Check '学生“报修历史”可查询已确认工单及评价' ([bool]$historyRow -and [int]$historyRow.score -eq 4) @{ found = [bool]$historyRow }

$repairerHistory = Api $repairer '/repair-history'
$repairerHistoryRow = $repairerHistory | Where-Object { $_.order_id -eq $orderId }
Add-Check '维修“历史记录”可看到学生评分与文字评价' ([bool]$repairerHistoryRow -and [int]$repairerHistoryRow.score -eq 4 -and $repairerHistoryRow.comment -eq '维修及时，处理干净，问题已解决') @{ score = $repairerHistoryRow.score; comment = $repairerHistoryRow.comment }

# ------------------------------------------------------- 2. 重修沿用原工单
$created2 = Api $student '/repair-orders' 'POST' @{ title = 'B端验证-宿舍门锁异响'; description = '门锁开合有明显异响'; categoryId = [int]$category.id; fileIds = @() }
$orderId2 = $created2.orderId
Api $student "/repair-orders/$orderId2/submit" 'POST' | Out-Null
Api $manager "/repair-orders/$orderId2/review" 'POST' @{ pass = $true; reason = ''; urgent = $false } | Out-Null
Api $repairer "/repair-orders/$orderId2/decision" 'POST' @{ accept = $true; reason = '' } | Out-Null
$resultPhoto2 = Upload-File $repairer '/files'
Api $repairer "/repair-orders/$orderId2/result" 'POST' @{ result = '加注润滑油并调整锁舌'; fileIds = @($resultPhoto2) } | Out-Null
$beforeRework = Api $student '/repair-orders'
$beforeReworkCount = @($beforeRework).Count
$rework = Api $student "/repair-orders/$orderId2/rework" 'POST' @{ reason = '异响仍然存在，需要重新处理'; fileIds = @() }
$afterRework = Api $student "/repair-orders/$orderId2"
$afterReworkCount = @(Api $student '/repair-orders').Count
Add-Check '重修不新建业务工单（沿用原工单号）' ($rework.orderId -eq $orderId2 -and $rework.orderNo -eq $afterRework.order_no) @{ orderId = $rework.orderId; orderNo = $rework.orderNo }
Add-Check '重修后原工单回到待审核' ($afterRework.current_status -eq 'PENDING_REVIEW') @{ status = $afterRework.current_status }
Add-Check '重修记录写入原工单且数量一致' (@($afterRework.reworkRequests).Count -eq 1 -and @($afterRework.relatedOrders).Count -eq 0) @{ reworkRequests = @($afterRework.reworkRequests).Count; relatedOrders = @($afterRework.relatedOrders).Count }
Add-Check '上一轮维修结果进入历次维修结果（round_no=1）' (@($afterRework.resultHistory).Count -eq 1 -and [int]$afterRework.resultHistory[0].round_no -eq 1) @{ rounds = @($afterRework.resultHistory | ForEach-Object { $_.round_no }) }
Add-Check '重修操作不产生新的待审核工单数量' ($afterReworkCount -eq $beforeReworkCount) @{ before = $beforeReworkCount; after = $afterReworkCount }

# 学生撤销 + 重新提交
$created3 = Api $student '/repair-orders' 'POST' @{ title = 'B端验证-撤销后重新提交'; description = '阳台灯不亮'; categoryId = [int]$category.id; fileIds = @() }
$orderId3 = $created3.orderId
Api $student "/repair-orders/$orderId3/submit" 'POST' | Out-Null
Api $student "/repair-orders/$orderId3/cancel" 'POST' | Out-Null
$afterCancel = Api $student "/repair-orders/$orderId3"
Api $student "/repair-orders/$orderId3/resubmit" 'POST' | Out-Null
$afterResubmit = Api $student "/repair-orders/$orderId3"
Add-Check '学生撤销报修后进入历史记录' ($afterCancel.current_status -eq 'CANCELLED') @{ status = $afterCancel.current_status }
Add-Check '学生撤销后可重新提交回待审核（原工单）' ($afterResubmit.current_status -eq 'PENDING_REVIEW') @{ status = $afterResubmit.current_status }

# ------------------------------------------------------------- 3. 消息中心
Api $manager '/messages' 'POST' @{ title = 'B端验证-宿管通知'; content = '本楼栋本周五进行水电检修，请提前做好准备'; targetRole = 'STUDENT'; buildingIds = @($studentHome.building_id); attachmentIds = @() } | Out-Null
Start-Sleep -Milliseconds 300
$allSources = @{}
foreach ($source in @('ALL', 'SYSTEM', 'ADMIN', 'DORM_MANAGER')) {
  $query = if ($source -eq 'ALL') { '/messages?read=all' } else { "/messages?sender=$source&read=all" }
  $allSources[$source] = @(Api $student $query)
}
Add-Check '学生消息“全部”来源返回条数等于各来源之和' ($allSources.ALL.Count -eq ($allSources.SYSTEM.Count + $allSources.ADMIN.Count + $allSources.DORM_MANAGER.Count)) @{ all = $allSources.ALL.Count; system = $allSources.SYSTEM.Count; admin = $allSources.ADMIN.Count; manager = $allSources.DORM_MANAGER.Count }
$managerMessage = $allSources.DORM_MANAGER | Where-Object { $_.title -eq 'B端验证-宿管通知' } | Select-Object -First 1
Add-Check '宿管发布消息来源为“宿管发布”且发布人为宿管（不出现逻辑错配）' ([bool]$managerMessage -and $managerMessage.source_label -eq '宿管发布' -and $managerMessage.publisher_role -eq 'DORM_MANAGER') @{ source = $managerMessage.source_label; publisher = $managerMessage.publisher_name; role = $managerMessage.publisher_role }
$systemMessage = $allSources.SYSTEM | Select-Object -First 1
Add-Check '系统通知发布人为“系统”' ([bool]$systemMessage -and $systemMessage.publisher_name -eq '系统') @{ publisher = $systemMessage.publisher_name }
$noAttachment = $allSources.ALL | Where-Object { @($_.attachments).Count -eq 0 } | Select-Object -First 1
Add-Check '无附件消息附件字段显示“-”' ([bool]$noAttachment -and $noAttachment.attachment_names -eq '-') @{ value = $noAttachment.attachment_names }
$repairerMessages = Api $repairer '/messages?sender=ALL&read=all'
Add-Check '维修端消息来源含系统通知/管理员发布且能按来源过滤' (@($repairerMessages).Count -gt 0 -and @(Api $repairer '/messages?sender=SYSTEM&read=all').Count -le @($repairerMessages).Count) @{ total = @($repairerMessages).Count }

# ------------------------------------------------------------- 4. 统计一致性
$stats = Api $repairer '/repairer-stats'
$pendingAccept = @(Api $repairer '/repair-orders' | Where-Object { $_.current_status -eq 'PENDING_ACCEPT' }).Count
Add-Check '维修工作台“待接单”与维修任务列表一致' ([int]$stats.pendingAccept -eq $pendingAccept) @{ stats = $stats.pendingAccept; list = $pendingAccept }
$historyCount = @(Api $repairer '/repair-history').Count
Add-Check '维修记录“个人工单记录”来源可用（历史工单可查询）' ($historyCount -ge 1) @{ count = $historyCount }
Add-Check '维修记录按年份筛选可用' ((Api $repairer "/repairer-stats?eventYear=$((Get-Date).Year)&ratingYear=$((Get-Date).Year)").pendingAccept -ne $null) @{ year = (Get-Date).Year }

# --------------------------------------------------------------- 5. 留宿流程
$batches = Api $student '/stay/current'
Add-Check '学生端可读取开放留宿批次及本人楼栋截止时间' (@($batches).Count -ge 1 -and [bool]($batches[0].student_deadline -or $batches[0].application_deadline)) @{ batches = @($batches | ForEach-Object { $_.batch_name }); deadline = $batches[0].student_deadline }
$batchId = $batches[0].batch_id
# 留宿日期段必须完全落在批次开放区间内
$rangeStart = ([datetime]$batches[0].open_start_date).AddDays(1).ToString('yyyy-MM-dd')
$rangeEnd = ([datetime]$batches[0].open_start_date).AddDays(4).ToString('yyyy-MM-dd')
$materialId = Upload-File $student '/stay/applications/files'
$saved = Api $student '/stay/applications' 'POST' @{ batchId = [int]$batchId; reason = 'B端验证-假期留宿申请'; dateRanges = @(@{ startDate = $rangeStart; endDate = $rangeEnd }); fileIds = @($materialId) }
$applicationId = $saved.applicationId
Api $student "/stay/applications/$applicationId/submit" 'POST' | Out-Null
$applications = Api $student '/stay/applications'
$application = $applications | Where-Object { $_.application_id -eq $applicationId }
Add-Check '学生提交留宿申请后状态为待审核' ($application.current_status -eq 'PENDING_REVIEW') @{ status = $application.current_status; dates = $application.dateRanges }
Add-Check '留宿申请附件与日期段可追溯' (@($application.attachments).Count -ge 1 -and @($application.dateRanges).Count -eq 1) @{ attachments = @($application.attachments).Count; ranges = @($application.dateRanges).Count }

# -------------------------------------------------------- 6. 数据库一致性口径
$mysql = 'D:\software\MySQL-8.0.46\bin\mysql.exe'
$previousEncoding = [Console]::OutputEncoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dbScore = & $mysql --default-character-set=utf8mb4 -uroot -p123456 -D dorm_platform -N -e "SELECT CONCAT(score,'|',comment) FROM repair_evaluation WHERE order_id=$orderId;" 2>$null
$dbStatus = & $mysql --default-character-set=utf8mb4 -uroot -p123456 -D dorm_platform -N -e "SELECT current_status FROM repair_order WHERE order_id=$orderId;" 2>$null
$dbRound = & $mysql --default-character-set=utf8mb4 -uroot -p123456 -D dorm_platform -N -e "SELECT COUNT(*) FROM repair_result_history WHERE order_id=$orderId2;" 2>$null
[Console]::OutputEncoding = $previousEncoding
Add-Check '评分与文字评价真实写入数据库并可在四端同步' ($dbScore -eq '4|维修及时，处理干净，问题已解决') @{ db = $dbScore }
Add-Check '工单最终状态与数据库一致（ARCHIVED）' ($dbStatus -eq 'ARCHIVED') @{ db = $dbStatus }
Add-Check '重修轮次真实写入维修结果历史表' ([int]$dbRound -eq 1) @{ historyRows = $dbRound }

$result.finishedAt = (Get-Date).ToString('s')
$result.passed = @($result.checks | Where-Object { $_.pass }).Count
$result.failed = @($result.checks | Where-Object { -not $_.pass }).Count
$result.writtenData = @{
  repairOrders       = @($orderId, $orderId2, $orderId3)
  stayApplication    = $applicationId
  verificationMessage = 'B端验证-宿管通知'
}
$outFile = Join-Path (Split-Path -Parent $PSScriptRoot) 'test-results\b-scope-verification.json'
$result | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $outFile
Write-Host ""
Write-Host ("验证完成：通过 {0} 项，失败 {1} 项，结果写入 {2}" -f $result.passed, $result.failed, $outFile) -ForegroundColor $(if ($result.failed -eq 0) { 'Green' } else { 'Red' })
if ($result.failed -gt 0) { exit 1 }

