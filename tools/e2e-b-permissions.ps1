# 四角色接口权限矩阵核对（小程序端使用的后端接口）
# 判定口径：允许 = 非 401/403（业务校验导致的 400 视为权限通过）；拒绝 = 401 或 403
param(
  [string]$Base = 'http://127.0.0.1:8080/api/v1'
)

$ErrorActionPreference = 'Stop'

function Login($account, $password = '123456') {
  $response = Invoke-RestMethod -Method Post -Uri "$Base/auth/login" -ContentType 'application/json' -Body (@{ loginAccount = $account; password = $password } | ConvertTo-Json)
  if ($response.code -ne 0) { throw "登录失败：$account $($response.message)" }
  return $response.data.token
}

function Call($token, $method, $path, $body) {
  $headers = @{ Authorization = "Bearer $token" }
  $params = @{ Method = $method; Uri = "$Base$path"; Headers = $headers; SkipHttpErrorCheck = $true }
  if ($null -ne $body) { $params.ContentType = 'application/json'; $params.Body = ($body | ConvertTo-Json -Depth 6) }
  $response = Invoke-WebRequest @params
  return [int]$response.StatusCode
}

$tokens = @{
  STUDENT      = Login 'student1'
  REPAIRER     = Login 'repair1'
  DORM_MANAGER = Login 'manager3'
  ADMIN        = Login 'admin'
}

# 取 manager3 负责楼栋（明德二号楼=4）内的工单/留宿申请，避免“跨楼栋 403”被误判成权限缺陷
$mysql = 'D:\software\MySQL-8.0.46\bin\mysql.exe'
$managerScope = "(SELECT building_id FROM manager_building_scope WHERE manager_user_id=14)"  # manager3=14（登录接口返回）
$orderId = [int](& $mysql -uroot -p123456 -D dorm_platform -N -B -e "SELECT ro.order_id FROM repair_order ro JOIN dorm_room r ON r.room_id=ro.room_id WHERE ro.current_status='PENDING_REVIEW' AND r.building_id IN $managerScope ORDER BY ro.order_id DESC LIMIT 1" 2>$null)
$stayId = [int](& $mysql -uroot -p123456 -D dorm_platform -N -B -e "SELECT application_id FROM stay_application WHERE building_id IN $managerScope AND current_status IN ('PENDING_REVIEW','UNDER_REVIEW') ORDER BY application_id DESC LIMIT 1" 2>$null)
if ($orderId -le 0) {
  $orderId = [int](& $mysql -uroot -p123456 -D dorm_platform -N -B -e "SELECT ro.order_id FROM repair_order ro JOIN dorm_room r ON r.room_id=ro.room_id WHERE r.building_id IN $managerScope ORDER BY ro.order_id DESC LIMIT 1" 2>$null)
}
if ($stayId -le 0) {
  $stayId = [int](& $mysql -uroot -p123456 -D dorm_platform -N -B -e "SELECT application_id FROM stay_application WHERE building_id IN $managerScope ORDER BY application_id DESC LIMIT 1" 2>$null)
}
if ($orderId -le 0) { throw '没有可用于权限校验的工单' }
if ($stayId -le 0) { throw '没有可用于权限校验的留宿申请' }

$cases = @(
  @{ name = '查看工单列表'; method = 'GET'; path = '/repair-orders?page=1&pageSize=5'; allow = @('STUDENT', 'REPAIRER', 'DORM_MANAGER', 'ADMIN') },
  @{ name = '新建报修单'; method = 'POST'; path = '/repair-orders'; body = @{ categoryId = 1; description = '权限矩阵校验'; location = '明德二号楼 101'; urgent = $false }; allow = @('STUDENT') },
  @{ name = '修改报修单'; method = 'PUT'; path = "/repair-orders/$orderId"; body = @{ title = '权限矩阵校验'; description = '权限矩阵校验' }; allow = @('STUDENT') },
  @{ name = '审核工单'; method = 'POST'; path = "/repair-orders/$orderId/review"; body = @{ pass = $true; reason = '' }; allow = @('DORM_MANAGER') },
  @{ name = '提交维修结果'; method = 'POST'; path = "/repair-orders/$orderId/result"; body = @{ result = '权限校验'; fileIds = @() }; allow = @('REPAIRER') },
  @{ name = '维修统计'; method = 'GET'; path = '/repairer-stats'; allow = @('REPAIRER') },
  @{ name = '留宿申请列表'; method = 'GET'; path = '/stay/applications?page=1&pageSize=5'; allow = @('STUDENT', 'DORM_MANAGER', 'ADMIN') },
  @{ name = '新建留宿批次'; method = 'POST'; path = '/stay/batches'; body = @{ batchCode = 'PERM-TEST'; batchName = '权限校验批次'; academicYear = 2026; vacationType = 'WINTER'; openStartDate = '2027-01-01'; openEndDate = '2027-01-31'; applicationDeadline = '2026-12-31T23:00:00'; instructions = '权限矩阵校验' }; allow = @('ADMIN') },
  @{ name = '删除留宿批次'; method = 'DELETE'; path = '/stay/batches/999999'; allow = @('ADMIN') },
  @{ name = '审核留宿申请'; method = 'POST'; path = "/stay/applications/$stayId/review"; body = @{ pass = $true; reason = '权限校验'; resubmitDeadline = $null }; allow = @('DORM_MANAGER', 'ADMIN') },
  @{ name = '当前住宿信息'; method = 'GET'; path = '/accommodations/current'; allow = @('STUDENT', 'DORM_MANAGER', 'ADMIN') },
  @{ name = '发布通知'; method = 'POST'; path = '/messages'; body = @{ title = '权限校验'; content = '权限矩阵校验'; targetRole = 'STUDENT'; buildingIds = @(1); attachmentIds = @() }; allow = @('DORM_MANAGER', 'ADMIN') },
  @{ name = '用户管理'; method = 'GET'; path = '/admin/users?page=1&pageSize=5'; allow = @('DORM_MANAGER', 'ADMIN') },
  @{ name = '工作台统计'; method = 'GET'; path = '/dashboard'; allow = @('STUDENT', 'REPAIRER', 'DORM_MANAGER', 'ADMIN') }
)

$results = @()
$fail = 0
foreach ($case in $cases) {
  foreach ($role in @('STUDENT', 'REPAIRER', 'DORM_MANAGER', 'ADMIN')) {
    try {
      $status = Call $tokens[$role] $case.method $case.path $case.body
    } catch {
      $status = -1
    }
    $allowed = $status -ne 401 -and $status -ne 403 -and $status -ne -1
    $expect = $case.allow -contains $role
    $ok = ($allowed -eq $expect)
    if (-not $ok) { $fail++ }
    $results += [pscustomobject]@{
      case = $case.name
      role = $role
      method = $case.method
      path = $case.path
      status = $status
      expect = if ($expect) { '允许' } else { '拒绝' }
      actual = if ($allowed) { '允许' } else { '拒绝' }
      result = if ($ok) { 'PASS' } else { 'FAIL' }
    }
  }
}

$summary = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('s')
  base = $Base
  total = $results.Count
  passed = $results.Count - $fail
  failed = $fail
  results = $results
}
$outDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'test-results'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$summary | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 (Join-Path $outDir 'permission-matrix.json')

Write-Host ("权限矩阵：{0} 项，PASS {1}，FAIL {2}" -f $summary.total, $summary.passed, $summary.failed)
$results | Where-Object { $_.result -eq 'FAIL' } | Format-Table case, role, status, expect, actual -AutoSize
exit $fail


