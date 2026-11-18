# 批量创建可用于人工走查的演示账号（学生 / 宿管 / 维修 / 管理员），密码统一 123456。
# 全部通过管理员接口创建，保证 person + 角色档案 + 住宿分配 + 楼栋/工种范围一致；
# 另外把新账号镜像进历史表 sys_user（派单资格 eligible() 会校验 sys_user），可重复执行。
#
# 用法：pwsh -File tools/seed-demo-accounts.ps1
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$base = 'http://127.0.0.1:8080/api/v1'
$mysql = 'D:\software\MySQL-8.0.46\bin\mysql.exe'
$root = Split-Path -Parent $PSScriptRoot
$password = '123456'
$passwordHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'

function Api($method, $path, $token, $body) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  $params = @{ Method = $method; Uri = "$base$path"; Headers = $headers; TimeoutSec = 30 }
  if ($null -ne $body) {
    $params['Body'] = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 8 -Compress))
    $params['ContentType'] = 'application/json; charset=utf-8'
  }
  try {
    $response = Invoke-WebRequest @params
  } catch {
    $detail = ''
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message }
    throw "$method $path 失败：$($_.Exception.Message) $detail"
  }
  $payload = $response.Content | ConvertFrom-Json
  return $payload.data
}

function Sql($sql) {
  $OutputEncoding = [Text.Encoding]::UTF8
  $out = $sql | & $mysql -uroot -p123456 -D dorm_platform --default-character-set=utf8mb4 -N -B 2>$null
  return $out
}

# ---- 账号定义 ---------------------------------------------------------------
$students = @(
  @{ account='walk_stu01'; name='陈浩'; gender='MALE';   studentNo='2025990001'; classId=5; bedId=460; building='知行一号楼';   room='203' },
  @{ account='walk_stu02'; name='周洋'; gender='MALE';   studentNo='2025990002'; classId=3; bedId=464; building='知行一号楼';   room='204' },
  @{ account='walk_stu03'; name='赵磊'; gender='MALE';   studentNo='2025990003'; classId=6; bedId=598; building='明德一号楼';   room='101' },
  @{ account='walk_stu04'; name='孙宇'; gender='MALE';   studentNo='2025990004'; classId=1; bedId=610; building='明德一号楼';   room='301' },
  @{ account='walk_stu05'; name='李明'; gender='MALE';   studentNo='2025990005'; classId=5; bedId=478; building='明德二号楼';   room='101' },
  @{ account='walk_stu06'; name='王芳'; gender='FEMALE'; studentNo='2025990006'; classId=2; bedId=490; building='博雅三号楼';   room='301' },
  @{ account='walk_stu07'; name='林晓'; gender='FEMALE'; studentNo='2025990007'; classId=4; bedId=494; building='博雅三号楼';   room='302' },
  @{ account='walk_stu08'; name='郑爽'; gender='FEMALE'; studentNo='2025990008'; classId=1; bedId=678; building='博雅三号楼';   room='101' },
  @{ account='walk_stu09'; name='何雨'; gender='FEMALE'; studentNo='2025990009'; classId=5; bedId=506; building='博雅一号楼';   room='201' },
  @{ account='walk_stu10'; name='张伟'; gender='MALE';   studentNo='2025990010'; classId=6; bedId=502; building='博雅一号楼';   room='101' }
)
$managers = @(
  @{ account='walk_mgr01'; name='赵敏'; employeeNo='DM800001'; buildingId=3; building='明德一号楼'; phone='13900008001' },
  @{ account='walk_mgr02'; name='钱进'; employeeNo='DM800002'; buildingId=6; building='博雅一号楼'; phone='13900008002' }
)
$repairers = @(
  @{ account='walk_rep01'; name='李建国'; employeeNo='RP800001'; buildings=@(1,3);      buildingText='知行一号楼、明德一号楼'; phone='13900009001' },
  @{ account='walk_rep02'; name='张海';   employeeNo='RP800002'; buildings=@(1,4,6);    buildingText='知行一号楼、明德二号楼、博雅一号楼'; phone='13900009002' },
  @{ account='walk_rep03'; name='刘敏';   employeeNo='RP800003'; buildings=@(4,5);      buildingText='明德二号楼、博雅三号楼'; phone='13900009003' },
  @{ account='walk_rep04'; name='陈晨';   employeeNo='RP800004'; buildings=@(6,11);     buildingText='博雅一号楼、至善一号楼'; phone='13900009004' }
)
$workTypes = @(1, 2, 3)   # 水暖 / 电气 / 综合

$admin = @{ account='walk_admin'; name='孙倩'; employeeNo='SA800001' }

# ---- 0. 前置：给「2026 寒假留宿」批次补博雅一号楼（building 6）的申请规则 ----
Sql @"
INSERT INTO stay_building_rule(batch_id,building_id,application_deadline,auto_lock,published_at)
SELECT 41,6,'2026-12-20 23:59:59',1,NOW() FROM DUAL
WHERE NOT EXISTS(SELECT 1 FROM stay_building_rule WHERE batch_id=41 AND building_id=6);
"@ | Out-Null

$adminToken = (Api 'POST' '/auth/login' $null @{ loginAccount='admin'; password=$password }).token
if (-not $adminToken) { throw '管理员登录失败' }

function ExistingId($account) {
  $rows = Api 'GET' "/admin/users?account=$account" $adminToken $null
  $match = @($rows | Where-Object { $_.login_account -eq $account })
  if ($match.Count -gt 0) { return [long]$match[0].user_id }
  return $null
}

$created = @()

function EnsureUser($spec, $body) {
  $id = ExistingId $spec.account
  if ($null -ne $id) {
    Api 'PUT' "/admin/users/$id" $adminToken $body | Out-Null
    return [pscustomobject]@{ id = $id; reused = $true }
  }
  $newId = Api 'POST' '/admin/users' $adminToken $body
  return [pscustomobject]@{ id = [long]$newId; reused = $false }
}

foreach ($s in $students) {
  $body = @{
    account = $s.account; roleCode = 'STUDENT'; realName = $s.name; gender = $s.gender
    studentNo = $s.studentNo; classId = $s.classId; bedId = $s.bedId
    phone = '138' + $s.studentNo.Substring(2)
    password = $password; enrollmentStatus = 'ENROLLED'
  }
  $r = EnsureUser $s $body
  $created += [pscustomobject]@{ role='学生'; account=$s.account; name=$s.name; id=$r.id; detail="$($s.building) $($s.room)"; reused=$r.reused }
}

foreach ($m in $managers) {
  $body = @{
    account = $m.account; roleCode = 'DORM_MANAGER'; realName = $m.name; employeeNo = $m.employeeNo
    gender = 'FEMALE'; buildingId = $m.buildingId; phone = $m.phone; password = $password; onDuty = $true
  }
  $r = EnsureUser $m $body
  $created += [pscustomobject]@{ role='宿管'; account=$m.account; name=$m.name; id=$r.id; detail="负责 $($m.building)"; reused=$r.reused }
}

foreach ($rep in $repairers) {
  $body = @{
    account = $rep.account; roleCode = 'REPAIRER'; realName = $rep.name; employeeNo = $rep.employeeNo
    gender = 'MALE'; buildingIds = $rep.buildings; workTypeIds = $workTypes
    maxActiveOrders = 5; onDuty = $true; phone = $rep.phone; password = $password
  }
  $r = EnsureUser $rep $body
  $created += [pscustomobject]@{ role='维修'; account=$rep.account; name=$rep.name; id=$r.id; detail="负责 $($rep.buildingText)（水暖/电气/综合）"; reused=$r.reused }
}

$adminBody = @{
  account = $admin.account; roleCode = 'ADMIN'; realName = $admin.name; employeeNo = $admin.employeeNo
  gender = 'FEMALE'; phone = '13900007001'; password = $password
}
$r = EnsureUser $admin $adminBody
$created += [pscustomobject]@{ role='管理员'; account=$admin.account; name=$admin.name; id=$r.id; detail='系统管理员'; reused=$r.reused }

# ---- 2. 镜像到历史表 sys_user（派单资格校验依赖）------------------------------
$values = $created | ForEach-Object {
  $acct = $_.account -replace "'", "''"
  $name = $_.name -replace "'", "''"
  $role = switch ($_.role) { '学生' { 'STUDENT' } '宿管' { 'DORM_MANAGER' } '维修' { 'REPAIRER' } default { 'ADMIN' } }
  "($($_.id),'$acct','$passwordHash','$name','$role',1)"
}
Sql @"
INSERT INTO sys_user(user_id,login_account,password_hash,real_name,role_code,enabled)
VALUES $($values -join ',')
ON DUPLICATE KEY UPDATE login_account=VALUES(login_account),password_hash=VALUES(password_hash),real_name=VALUES(real_name),role_code=VALUES(role_code),enabled=1;
"@ | Out-Null

# ---- 3. 逐账号登录 + 数据可见性验证 -----------------------------------------
$checks = @()
foreach ($c in $created) {
  $note = ''
  try {
    $session = Api 'POST' '/auth/login' $null @{ loginAccount=$c.account; password=$password }
    switch ($c.role) {
      '学生' {
        $homes = @(Api 'GET' '/accommodations/current' $session.token $null)
        $stay = @(Api 'GET' '/stay/current' $session.token $null)
        $note = "登录OK；住宿=" + ($homes | ForEach-Object { "$($_.building_name)$($_.room_no)-$($_.bed_no)" }) -join ',' + "；可申请批次=" + $stay.Count
      }
      '宿管' {
        $bs = @(Api 'GET' '/buildings' $session.token $null)
        $pending = @(Api 'GET' '/stay/applications?status=PENDING_REVIEW' $session.token $null)
        $note = "登录OK；负责楼栋=" + (($bs | ForEach-Object { $_.building_name }) -join ',') + "；待审核申请=" + $pending.Count
      }
      '维修' {
        $stats = Api 'GET' '/repairer-stats' $session.token $null
        $note = "登录OK；待接单=" + $stats.pendingAccept + "；维修中=" + $stats.inRepair
      }
      default { $note = '登录OK；管理员权限' }
    }
    $checks += [pscustomobject]@{ account=$c.account; ok=$true; note=$note }
  } catch {
    $checks += [pscustomobject]@{ account=$c.account; ok=$false; note=$_.Exception.Message }
  }
}

# ---- 4. 输出 ----------------------------------------------------------------
$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('s')
  password = $password
  accounts = $created
  checks = $checks
}
$outDir = Join-Path $root 'test-results'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$report | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $outDir 'seed-accounts.json') -Encoding UTF8

Write-Output ''
Write-Output ("{0,-14} {1,-6} {2,-10} {3,-6} {4}" -f '账号','角色','姓名','ID','范围 / 说明')
Write-Output ('-' * 96)
foreach ($c in $created) {
  Write-Output ("{0,-14} {1,-6} {2,-10} {3,-6} {4}" -f $c.account, $c.role, $c.name, $c.id, $c.detail)
}
Write-Output ''
Write-Output '登录校验：'
foreach ($k in $checks) {
  Write-Output ("  [{0}] {1,-14} {2}" -f $(if ($k.ok) { 'OK' } else { 'FAIL' }), $k.account, $k.note)
}
$failed = @($checks | Where-Object { -not $_.ok }).Count
Write-Output ''
Write-Output "共 $($created.Count) 个账号，登录校验失败 $failed 个；统一密码：$password"
if ($failed -gt 0) { exit 1 }



