# 用新灌入的演示账号跑一条最短闭环，证明这些账号可以真正走业务流程：
# walk_stu03(明德一号楼 101) 建单 → 提交 → walk_mgr01(明德一号楼宿管) 审核通过（自动派单）
# → walk_rep01(维修，负责知行一号楼/明德一号楼) 接单 → 学生端回显；
# 另查 walk_stu09(博雅一号楼) 能看到的留宿批次。
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$base = 'http://127.0.0.1:8080/api/v1'

function Api($method, $path, $token, $body) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  $params = @{ Method = $method; Uri = "$base$path"; Headers = $headers; TimeoutSec = 30 }
  if ($null -ne $body) {
    $params['Body'] = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 8 -Compress))
    $params['ContentType'] = 'application/json; charset=utf-8'
  }
  $payload = (Invoke-WebRequest @params).Content | ConvertFrom-Json
  return $payload.data
}
function Login($account) { return (Api 'POST' '/auth/login' $null @{ loginAccount=$account; password='123456' }).token }

$student = Login 'walk_stu03'
$manager = Login 'walk_mgr01'
$repairer = Login 'walk_rep01'

# 1) 建单 + 提交
$catalog = Api 'GET' '/repair-catalog' $student $null
$categoryId = [long]$catalog.categories[0].id
$created = Api 'POST' '/repair-orders' $student @{
  title='演示流程验证-明德一号楼'; description='walk_stu03 建单，验证新账号闭环'; categoryId=$categoryId
}
$orderId = [long]$created.orderId
Api 'POST' "/repair-orders/$orderId/submit" $student @{} | Out-Null
$afterSubmit = Api 'GET' "/repair-orders/$orderId" $student $null

# 2) 宿管审核通过 → 自动派单
Api 'POST' "/repair-orders/$orderId/review" $manager @{ pass=$true } | Out-Null
$afterReview = Api 'GET' "/repair-orders/$orderId" $student $null
$dispatch = @($afterReview.dispatches)[-1]

# 3) 维修人员接单
$decision = 'SKIPPED'
try {
  Api 'POST' "/repair-orders/$orderId/decision" $repairer @{ accept=$true } | Out-Null
  $decision = 'ACCEPTED'
} catch {
  $detail = ''
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message }
  $decision = "FAILED: $($_.Exception.Message) $detail"
}
$final = Api 'GET' "/repair-orders/$orderId" $student $null

# 4) 留宿批次可见性（博雅一号楼规则是新补的）
$stayStudent = Login 'walk_stu09'
$batches = @(Api 'GET' '/stay/current' $stayStudent $null)

[pscustomobject]@{
  orderNo = $created.orderNo
  afterSubmit = $afterSubmit.current_status
  afterReview = $afterReview.current_status
  dispatchedTo = $dispatch.repairer_name
  acceptDeadline = $dispatch.accept_deadline
  decision = $decision
  finalStatus = $final.current_status
  walk_stu09Batches = ($batches | ForEach-Object { "$($_.batch_name)[$($_.current_status)]" }) -join ' / '
} | ConvertTo-Json -Depth 4
