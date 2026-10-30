const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');
const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('账号', { exact: true }).fill('admin');
    await page.getByLabel('密码', { exact: true }).fill('123456');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.getByRole('heading', { name: '工作台', exact: true }).waitFor();

    await page.locator('.nav-group[data-nav-group="roles"] summary').click();
    await page.locator('[data-page="students"]').click();
    await page.locator('#user-filter-form').waitFor();
    assert.equal(await page.locator('#list-search').count(), 0);
    for (const name of ['realName', 'studentNo', 'buildingName', 'roomNo', 'departmentId', 'majorId', 'grade', 'classId', 'enabled', 'accommodation']) {
      assert.equal(await page.locator(`#user-filter-form [name="${name}"]`).count(), 1, `${name} filter missing`);
    }
    assert.equal(await page.locator('#user-filter-form input[list]').count(), 2);
    const studentHeaders = await page.locator('.role-table thead th').allInnerTexts();
    for (const label of ['学院', '专业', '年级']) assert.ok(studentHeaders.includes(label), `${label} column missing`);
    assert.equal(await page.locator('.role-table').count(), 1);
    assert.equal(await page.locator('.role-table').evaluate(el => getComputedStyle(el).overflowX), 'auto');
    const studentTable = page.locator('.role-table');
    assert.equal(await studentTable.locator('thead th:last-child').evaluate(el => getComputedStyle(el).position), 'static');
    assert.ok(await studentTable.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    assert.equal(await page.locator('[data-action="assign"]').count(), 1);
    const firstRow = page.locator('.role-table tbody tr').first();
    await page.locator('[data-select-all]').check();
    assert.ok(await page.locator('[data-select-row]:checked').count() > 0);
    await page.locator('[data-select-all]').uncheck();
    assert.equal(await page.locator('[data-select-row]:checked').count(), 0);
    const department = await page.locator('[name="departmentId"]').evaluate(select => select.options[1]?.value || '');
    if (department) {
      await page.locator('[name="departmentId"]').selectOption(department);
      const permittedMajors = await page.locator('[name="majorId"] option').evaluateAll(items => items.slice(1).map(item => item.value));
      assert.ok(permittedMajors.length > 0);
      await page.locator('[name="majorId"]').selectOption(permittedMajors[0]);
      const permittedGrades = await page.locator('[name="grade"] option').evaluateAll(items => items.slice(1).map(item => item.value));
      assert.ok(permittedGrades.length > 0);
      await page.locator('[name="grade"]').selectOption(permittedGrades[0]);
      assert.ok(await page.locator('[name="classId"] option').count() > 1);
      await page.locator('#user-filter-form button[type="submit"]').click();
      await page.locator('#user-filter-form').waitFor();
      assert.equal(await page.locator('[name="departmentId"]').inputValue(), department);
      assert.equal(await page.locator('[name="majorId"]').inputValue(), permittedMajors[0]);
    }
    await page.locator('[data-action="user-filter-reset"]').click();
    await page.locator('#user-filter-form').waitFor();
    await firstRow.locator('[data-select-row]').check();
    await page.locator('[data-action="assign"]').click();
    const assignment = page.locator('dialog');
    await assignment.waitFor();
    for (const name of ['studentId', 'buildingFilter', 'roomFilter', 'bedNoFilter', 'bedId']) assert.equal(await assignment.locator(`[name="${name}"]`).count(), 1);
    const selectedStudent = await assignment.locator('[name="studentId"]').inputValue();
    const permittedBeds = await page.evaluate(async studentId => {
      const headers = { Authorization: `Bearer ${sessionStorage.getItem('dorm_token')}` };
      const [studentResponse, bedsResponse] = await Promise.all([fetch(`/api/v1/admin/users/${studentId}`, { headers }), fetch('/api/v1/beds', { headers })]);
      const student = (await studentResponse.json()).data, beds = (await bedsResponse.json()).data;
      return beds.filter(bed => bed.management_status === 'AVAILABLE' && (!bed.student_id || Number(bed.student_id) === Number(studentId)) && (bed.gender_limit === '混合' || student.gender === 'MALE' && bed.gender_limit === '男生' || student.gender === 'FEMALE' && bed.gender_limit === '女生')).map(bed => String(bed.bed_id)).sort();
    }, selectedStudent);
    const displayedBeds = await assignment.locator('[name="bedId"] option').evaluateAll(options => options.filter(option => option.value).map(option => option.value).sort());
    assert.deepEqual(displayedBeds, permittedBeds);
    await assignment.locator('[data-close]').click();
    if (await firstRow.count()) {
      await firstRow.locator('[data-action="user-detail"]').click();
      const dialog = page.locator('dialog');
      await dialog.waitFor();
      assert.equal(await dialog.locator('.detail-summary').count(), 0);
      if (await dialog.locator('[data-record="accommodationHistory"]').count()) {
        await dialog.locator('[data-record="accommodationHistory"]').click();
        assert.match(await dialog.innerText(), /住宿历史/);
        await dialog.locator('[data-record-back]').click();
      }
      await dialog.locator('[data-close]').click();
      await firstRow.locator('[data-action="user-edit"]').click();
      await page.locator('dialog .edit-grid').waitFor();
      assert.equal(await page.locator('dialog .edit-grid').count(), 1);
      assert.equal(await page.locator('dialog [name="departmentId"]').count(), 1);
      assert.equal(await page.locator('dialog [name="majorId"]').count(), 1);
      assert.equal(await page.locator('dialog [name="grade"]').count(), 1);
      assert.equal(await page.locator('dialog [name="classId"]').count(), 1);
      assert.equal(await page.locator('dialog [data-student-assign]').count(), 1);
      await page.locator('dialog [data-student-assign]').click();
      await page.locator('dialog [name="studentId"]').waitFor();
      assert.equal(await page.locator('dialog [name="studentId"] option').count(), 1);
      assert.equal(await page.locator('dialog [name="studentId"]').inputValue(), await firstRow.getAttribute('data-row-id'));
      await page.locator('dialog [data-close]').click();
      await firstRow.locator('[data-action="user-edit"]').click();
      await page.locator('dialog .edit-grid').waitFor();
      await page.locator('dialog [data-close]').click();
    }
    for (const [pageName, filters] of [['managers', ['realName', 'employeeNo', 'managerBuildingName', 'enabled', 'onDuty']], ['repairers', ['realName', 'employeeNo', 'workTypeName', 'repairBuildingName', 'enabled', 'onDuty']]]) {
      await page.locator(`[data-page="${pageName}"]`).click();
      await page.locator('#user-filter-form').waitFor();
      for (const name of filters) assert.equal(await page.locator(`#user-filter-form [name="${name}"]`).count(), 1, `${pageName}: ${name} filter missing`);
      const buildingFilterName = pageName === 'managers' ? 'managerBuildingName' : 'repairBuildingName';
      const buildingFilter = page.locator(`#user-filter-form [name="${buildingFilterName}"]`);
      const buildingOption = await buildingFilter.evaluate(select => select.options[1]?.value || '');
      assert.ok(buildingOption, `${pageName} building options missing`);
      const filterRequest = page.waitForRequest(request => request.url().includes('/admin/users?') && new URL(request.url()).searchParams.has(buildingFilterName));
      await buildingFilter.selectOption(buildingOption);
      await page.locator('#user-filter-form button[type="submit"]').click();
      await filterRequest;
      assert.equal(await page.locator(`#user-filter-form [name="${buildingFilterName}"]`).inputValue(), buildingOption);
      await page.locator('[data-action="user-filter-reset"]').click();
      await page.locator('#user-filter-form').waitFor();
      assert.equal(await page.locator('.role-table').evaluate(el => getComputedStyle(el).overflowX), 'auto');
      assert.equal(await page.locator('[data-action="worker-scope-select"], [data-action="manager-scope-select"]').count(), 1);
      const staffRow = page.locator('.role-table tbody tr').first();
      const actionRows = await staffRow.locator('td:last-child .actions button').evaluateAll(buttons => buttons.map(button => Math.round(button.getBoundingClientRect().top)));
      assert.equal(new Set(actionRows).size, 1, `${pageName} row actions wrapped`);
      const staffId = await staffRow.getAttribute('data-row-id');
      let editPayload;
      const userRoute = `**/api/v1/admin/users/${staffId}`;
      await page.route(userRoute, async route => {
        if (route.request().method() !== 'PUT') return route.continue();
        editPayload = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data: Number(staffId) }) });
      });
      await staffRow.locator('[data-action="user-edit"]').click();
      await page.locator('dialog .edit-grid').waitFor();
      const changedScopes = pageName === 'managers' ? ['buildingIds'] : ['workTypeIds', 'buildingIds'];
      const selectedScopeIds = {};
      for (const name of changedScopes) {
        const unchecked = page.locator(`dialog input[name="${name}"]:not(:checked)`);
        const adding = await unchecked.count() > 0;
        const target = (adding ? unchecked : page.locator(`dialog input[name="${name}"]:checked`)).first();
        assert.ok(await target.count() > 0, `${pageName} ${name} options missing`);
        const details = target.locator('xpath=ancestor::details[1]');
        await details.locator('summary').click();
        selectedScopeIds[name] = { id: Number(await target.getAttribute('value')), included: adding };
        if (adding) await target.check(); else await target.uncheck();
      }
      const updateResponse = page.waitForResponse(response => response.url().endsWith(`/admin/users/${staffId}`) && response.request().method() === 'PUT');
      await page.locator('dialog button[type="submit"]').click();
      await updateResponse;
      for (const name of changedScopes) assert.equal(editPayload[name].includes(selectedScopeIds[name].id), selectedScopeIds[name].included, `${pageName} ${name} edit was not submitted`);
      await page.unroute(userRoute);
      await staffRow.locator('[data-select-row]').check();
      await page.locator(`[data-action="${pageName === 'managers' ? 'manager-scope-select' : 'worker-scope-select'}"]`).click();
      const scopeDialog = page.locator('dialog');
      await scopeDialog.waitFor();
      assert.equal(await scopeDialog.locator('.checkbox-dropdown').count(), pageName === 'repairers' ? 2 : 1);
      assert.ok(await scopeDialog.locator('input[type="checkbox"][name="buildingIds"]').count() > 0);
      if (pageName === 'repairers') {
        assert.ok(await scopeDialog.locator('input[type="checkbox"][name="workTypeIds"]').count() > 0);
        assert.doesNotMatch(await scopeDialog.innerText(), /undefined/);
        const values = await page.locator('.role-table tbody tr td').allInnerTexts();
        assert.ok(values.every(value => !value.includes(', ')));
        await scopeDialog.locator('[data-close]').click();
        await staffRow.locator('[data-action="user-detail"]').click();
        await page.getByRole('heading', { name: '维修人员详情', exact: true }).waitFor();
      } else {
        await scopeDialog.locator('[data-close]').click();
      }
      if (pageName === 'repairers') await page.locator('dialog [data-close]').click();
    }

    await page.setViewportSize({ width: 1024, height: 900 });
    await page.locator('[data-page="managers"]').click();
    await page.locator('#user-filter-form').waitFor();
    assert.equal(await page.locator('#user-filter-form').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 5);
    await page.locator('[data-page="repairers"]').click();
    await page.locator('#user-filter-form').waitFor();
    assert.equal(await page.locator('#user-filter-form').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 6);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-page="students"]').click();
    await page.locator('#user-filter-form').waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await page.locator('.role-table').evaluate(el => getComputedStyle(el).overflowX), 'auto');
    const mobileTable = page.locator('.role-table');
    assert.ok(await mobileTable.evaluate(el => el.scrollWidth > el.clientWidth));
    await mobileTable.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await page.waitForFunction(() => document.querySelector('.role-table').classList.contains('scroll-shifted'));
    assert.equal(await mobileTable.locator('thead th:last-child').evaluate(el => getComputedStyle(el).position), 'sticky');
    assert.deepEqual(errors, []);
    console.log('Browser checks passed for role filters, details, editing, scope tools, stacked values, and responsive tables.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
