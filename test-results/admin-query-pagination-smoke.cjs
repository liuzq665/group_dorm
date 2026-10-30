const { chromium } = require('../../tools/er-drawio-runtime/node_modules/playwright-core');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:5175/login');
    await page.locator('[name="loginAccount"]').fill('admin');
    await page.locator('[name="password"]').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await page.getByRole('heading', { name: '工作台' }).waitFor();

    await page.locator('.nav-group[data-nav-group="dorm"] summary').click();
    await page.locator('[data-page="buildings"]').click();
    await page.locator('[data-resource-filter="buildings"]').waitFor();
    assert.equal(await page.getByRole('button', { name: '批量删除' }).count(), 1);
    const range = page.locator('[data-resource-filter="buildings"] .range-control').first();
    assert.equal(await range.evaluate(element => Math.round(element.getBoundingClientRect().height)), 38);
    const rangeFonts = await range.locator('input').first().evaluate(element => ({
      value: getComputedStyle(element).fontSize,
      placeholder: getComputedStyle(element, '::placeholder').fontSize
    }));
    assert.ok(Number.parseFloat(rangeFonts.value) >= 14, JSON.stringify(rangeFonts));
    assert.equal(rangeFonts.placeholder, '11px');
    const buildingHeaders = await page.locator('.resource-table thead').innerText();
    assert.match(buildingHeaders, /总床位/);
    assert.match(buildingHeaders, /空闲床位/);
    const buildingRows = await page.locator('.resource-table tbody tr').evaluateAll(rows => rows.map(item => [...item.cells].map(cell => cell.textContent.trim())));
    const demoBuildingName = buildingRows.find(cells => cells[4] === '男生' && Number(cells[6]) === 48)?.[2];
    assert.ok(demoBuildingName, 'Expected a 48-bed male building in the current database');
    const buildingFilters = page.locator('[data-resource-filter="buildings"]');
    await buildingFilters.locator('[name="keyword"]').fill(demoBuildingName);
    await buildingFilters.locator('button[type="submit"]').click();
    await page.getByText('共 1 条').waitFor();
    const selectedBuilding = page.locator('.resource-table tbody tr:not([hidden])').filter({ hasText: demoBuildingName });
    assert.equal(await selectedBuilding.count(), 1);
    const buildingCells = await selectedBuilding.locator('td').allInnerTexts();
    const totalBeds = Number(buildingCells[6]);
    const availableBeds = Number(buildingCells[7]);
    assert.equal(totalBeds, 48);
    assert.ok(Number.isInteger(availableBeds) && availableBeds >= 0 && availableBeds <= totalBeds, JSON.stringify(buildingCells));
    const resourceTable = page.locator('.resource-table .table');
    const widths = await resourceTable.evaluate(element => ({ table: element.getBoundingClientRect().width, parent: element.parentElement.clientWidth }));
    assert.ok(widths.table >= widths.parent - 1 && widths.table <= widths.parent + 1, JSON.stringify(widths));
    const filterControlHeights = await buildingFilters.locator('.field input[name="keyword"],.field select,.filter-actions button').evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().height)));
    assert.ok(filterControlHeights.length >= 3 && filterControlHeights.every(height => height === 38), JSON.stringify(filterControlHeights));

    await selectedBuilding.locator('[data-action="resource-detail"]').click();
    let buildingDetailDialog = page.locator('dialog.dialog');
    const buildingDetailRoomPanel = buildingDetailDialog.locator('[data-building-room-panel]');
    const detailRoomTable = buildingDetailRoomPanel.locator('.building-room-table');
    const detailRoomTotal = Number((await buildingDetailRoomPanel.locator('[data-building-room-summary]').innerText()).match(/\d+/)?.[0]);
    assert.equal(await buildingDetailDialog.locator('details').count(), 0);
    assert.equal(await detailRoomTable.getAttribute('data-table-page-size'), '5');
    assert.equal(await detailRoomTable.locator('tbody tr:not([hidden])').count(), Math.min(5, detailRoomTotal));
    if (detailRoomTotal > 5) {
      const detailPager = detailRoomTable.locator('.table-pagination');
      assert.equal(await detailPager.locator('[data-table-page-label]').innerText(), `1 / ${Math.ceil(detailRoomTotal / 5)}`);
      await detailPager.locator('[data-table-page-step="1"]').click();
      assert.equal(await detailRoomTable.locator('tbody tr:not([hidden])').count(), Math.min(5, detailRoomTotal - 5));
    }
    const detailBodyOverflow = await buildingDetailDialog.locator('.dialog-body').evaluate(element => element.scrollHeight - element.clientHeight);
    assert.ok(detailBodyOverflow <= 1, `Building detail should fit without a vertical scrollbar: ${detailBodyOverflow}px`);
    await buildingDetailDialog.locator('[data-close]').click();

    await selectedBuilding.locator('[data-action="resource-edit"]').click();
    const buildingDialog = page.locator('dialog.dialog');
    const roomPanel = buildingDialog.locator('[data-building-room-panel]');
    const floorFilter = roomPanel.locator('[data-building-floor-filter]');
    const addRoomButton = roomPanel.locator('[data-building-room-add]');
    const addControlLayout = await roomPanel.locator('.building-room-tools').evaluate(element => {
      const floor = element.querySelector('.building-floor-filter'), select = floor.querySelector('select'), add = element.querySelector('[data-building-room-add]');
      return { selectHeight: select.getBoundingClientRect().height, addHeight: add.getBoundingClientRect().height, selectBottom: select.getBoundingClientRect().bottom, addBottom: add.getBoundingClientRect().bottom, addRight: add.getBoundingClientRect().right, toolsRight: element.getBoundingClientRect().right };
    });
    assert.equal(Math.round(addControlLayout.selectHeight), 38);
    assert.equal(Math.round(addControlLayout.addHeight), 38);
    assert.ok(Math.abs(addControlLayout.selectBottom - addControlLayout.addBottom) < 1, JSON.stringify(addControlLayout));
    assert.ok(addControlLayout.toolsRight - addControlLayout.addRight < 2, JSON.stringify(addControlLayout));
    const buildingRoomTable = roomPanel.locator('.building-room-table');
    const buildingRoomHeaders = await buildingRoomTable.locator('thead th').allInnerTexts();
    assert.deepEqual(buildingRoomHeaders, ['楼层', '宿舍号', '性别限制', '容量', '操作']);
    assert.equal(await roomPanel.locator('details').count(), 0);
    assert.equal(await buildingRoomTable.getAttribute('data-table-page-size'), '5');
    assert.equal(await buildingRoomTable.locator('tbody tr:not([hidden])').count(), 5);
    const editBodyOverflow = await buildingDialog.locator('.dialog-body').evaluate(element => element.scrollHeight - element.clientHeight);
    assert.ok(editBodyOverflow <= 1, `Building edit should fit without a vertical scrollbar: ${editBodyOverflow}px`);

    const createRoomForm = roomPanel.locator('.building-room-create');
    await addRoomButton.click();
    assert.equal(await createRoomForm.isVisible(), true);
    const createControlLayout = await createRoomForm.locator('.building-room-create-grid').evaluate(element => {
      const controls = [...element.querySelectorAll('.field input,.field select,.actions button')];
      return controls.map(control => ({ height: Math.round(control.getBoundingClientRect().height), bottom: Math.round(control.getBoundingClientRect().bottom) }));
    });
    assert.ok(createControlLayout.every(item => item.height === 38), JSON.stringify(createControlLayout));
    assert.equal(new Set(createControlLayout.map(item => item.bottom)).size, 1, JSON.stringify(createControlLayout));
    await createRoomForm.locator('[name="newRoomNo"]').fill('cancel-room-smoke');
    await createRoomForm.locator('[data-building-room-cancel]').click();
    assert.equal(await createRoomForm.isVisible(), false);
    assert.equal(await createRoomForm.locator('[name="newRoomNo"]').inputValue(), '');

    const buildingId = Number(await roomPanel.getAttribute('data-building-id'));
    let newRoomPayload;
    const interceptNewRoom = async route => {
      newRoomPayload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data: 999999 }) });
    };
    await page.route('**/api/v1/admin/resources/rooms', interceptNewRoom);
    await addRoomButton.click();
    await createRoomForm.locator('[name="newRoomNo"]').fill('smoke-new-room');
    await createRoomForm.locator('[name="newRoomFloor"]').fill('9');
    await createRoomForm.locator('[name="newRoomCapacity"]').fill('4');
    const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/admin/resources/rooms');
    await createRoomForm.locator('[data-building-room-save]').click();
    await createResponse;
    await createRoomForm.waitFor({ state: 'hidden' });
    await page.unroute('**/api/v1/admin/resources/rooms', interceptNewRoom);
    assert.deepEqual(newRoomPayload, { buildingId, roomNo: 'smoke-new-room', floorNo: 9, designCapacity: 4, genderLimit: '男生' });

    const firstRoomRow = buildingRoomTable.locator('tbody tr:not([hidden])').first();
    const roomId = await firstRoomRow.getAttribute('data-row-id');
    const originalRoomCells = await firstRoomRow.locator('td').allInnerTexts();
    await firstRoomRow.locator('[data-building-room-edit]').click();
    let editedRoomRow = buildingRoomTable.locator(`tr[data-row-id="${roomId}"]`);
    const roomEditControls = editedRoomRow.locator('[data-room-floor],[data-room-no],[data-room-gender],[data-room-capacity],button');
    assert.equal(await roomEditControls.count(), 6);
    const roomEditHeights = await roomEditControls.evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().height)));
    assert.ok(roomEditHeights.every(height => height === 38), JSON.stringify(roomEditHeights));
    await editedRoomRow.locator('[data-building-room-edit-cancel]').click();
    assert.deepEqual(await buildingRoomTable.locator(`tr[data-row-id="${roomId}"] td`).allInnerTexts(), originalRoomCells);

    let updatedRoomPayload;
    const interceptRoomUpdate = async route => {
      updatedRoomPayload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data: Number(roomId) }) });
    };
    await page.route('**/api/v1/admin/resources/rooms/*', interceptRoomUpdate);
    await buildingRoomTable.locator(`tr[data-row-id="${roomId}"] [data-building-room-edit]`).click();
    editedRoomRow = buildingRoomTable.locator(`tr[data-row-id="${roomId}"]`);
    await editedRoomRow.locator('[data-room-no]').fill(`smoke-room-${roomId}`);
    const updateResponse = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === `/api/v1/admin/resources/rooms/${roomId}`);
    await editedRoomRow.locator('[data-building-room-edit-save]').click();
    await updateResponse;
    await editedRoomRow.locator('[data-room-no]').waitFor({ state: 'detached' });
    await page.unroute('**/api/v1/admin/resources/rooms/*', interceptRoomUpdate);
    assert.deepEqual(updatedRoomPayload, { buildingId, roomNo: `smoke-room-${roomId}`, floorNo: Number(originalRoomCells[0]), designCapacity: Number(originalRoomCells[3]), genderLimit: originalRoomCells[2] });
    await buildingDialog.locator('[data-close]').click();

    await page.locator('[data-page="beds"]').click();
    await page.locator('[data-resource-filter="beds"]').waitFor();
    const bedFilters = page.locator('[data-resource-filter="beds"]');
    const bedHeaders = await page.locator('.resource-table thead th').allInnerTexts();
    assert.ok(bedHeaders.includes('楼层'));
    const gridColumns = async () => bedFilters.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    const filterRowCounts = async () => bedFilters.evaluate(form => {
      const groups = [];
      for (const child of form.children) {
        const rect = child.getBoundingClientRect();
        let row = groups.find(group => rect.top < group.bottom && rect.bottom > group.top);
        if (!row) groups.push(row = { top: rect.top, bottom: rect.bottom, count: 0 });
        row.top = Math.min(row.top, rect.top);
        row.bottom = Math.max(row.bottom, rect.bottom);
        row.count++;
      }
      return groups.map(row => row.count);
    });
    assert.equal(await gridColumns(), 4);
    assert.deepEqual(await filterRowCounts(), [4, 4]);
    assert.deepEqual(await bedFilters.evaluate(form => [...form.children].map(child => child.querySelector('[name]')?.name || 'actions')), ['buildingId', 'roomId', 'floorNo', 'bedNo', 'genderLimit', 'studentName', 'bedStatus', 'actions']);
    await page.setViewportSize({ width: 1024, height: 900 });
    assert.equal(await gridColumns(), 3);
    assert.deepEqual(await filterRowCounts(), [3, 3, 2]);
    await page.setViewportSize({ width: 800, height: 900 });
    assert.equal(await gridColumns(), 2);
    assert.deepEqual(await filterRowCounts(), [2, 2, 2, 2]);
    await page.setViewportSize({ width: 1440, height: 960 });
    assert.equal(await bedFilters.locator('[name="bedNo"]').evaluate(element => element.tagName), 'SELECT');
    assert.equal(await bedFilters.locator('[name="studentName"]').count(), 1);
    assert.equal(await bedFilters.locator('[name="genderLimit"]').count(), 1);
    assert.deepEqual(await bedFilters.locator('[name="bedStatus"] option').allTextContents(), ['全部状态', '可分配', '已入住', '停用']);
    const buildingOption = await bedFilters.locator('[name="buildingId"] option').filter({ hasText: demoBuildingName }).getAttribute('value');
    await bedFilters.locator('[name="buildingId"]').selectOption(buildingOption);
    await bedFilters.locator('[name="floorNo"]').selectOption('1');
    const roomOptions = await bedFilters.locator('[name="roomId"] option').allTextContents();
    assert.equal(roomOptions[0].trim(), '全部宿舍');
    assert.ok(roomOptions.length >= 2, JSON.stringify(roomOptions));
    await bedFilters.locator('button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('.resource-table tbody tr:not([hidden])')?.cells[2]?.textContent.trim() === '1');
    assert.equal(await page.locator('.resource-table tbody tr:not([hidden])').count(), 8);
    const occupiedFloorCells = await page.locator('.resource-table tbody tr:not([hidden])').first().locator('td').allInnerTexts();
    assert.equal(occupiedFloorCells[2].trim(), '1');
    assert.equal(occupiedFloorCells[5].trim(), '已入住');
    await bedFilters.locator('[name="floorNo"]').selectOption('6');
    await bedFilters.locator('button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('.resource-table tbody tr:not([hidden])')?.cells[2]?.textContent.trim() === '6');
    const availableFloorCells = await page.locator('.resource-table tbody tr:not([hidden])').first().locator('td').allInnerTexts();
    assert.equal(availableFloorCells[2].trim(), '6');
    assert.equal(availableFloorCells[5].trim(), '可分配');

    await page.locator('[data-page="rooms"]').click();
    const roomFilters = page.locator('[data-resource-filter="rooms"]');
    await roomFilters.waitFor();
    const roomHeaders = await page.locator('.resource-table thead th').allInnerTexts();
    assert.ok(roomHeaders.indexOf('宿舍号') < roomHeaders.indexOf('楼层'), JSON.stringify(roomHeaders));
    assert.ok(roomHeaders.includes('床位数'));
    assert.ok(roomHeaders.includes('空闲床位'));
    assert.equal(roomHeaders.includes('容量'), false);
    const roomBuildingOption = await roomFilters.locator('[name="buildingId"] option').filter({ hasText: demoBuildingName }).getAttribute('value');
    await roomFilters.locator('[name="buildingId"]').selectOption(roomBuildingOption);
    await roomFilters.locator('[name="floorNo"]').selectOption('1');
    await roomFilters.locator('[name="roomId"]').selectOption({ index: 1 });
    await roomFilters.locator('button[type="submit"]').click();
    await page.getByText('共 1 条').waitFor();
    const roomRow = page.locator('.resource-table tbody tr:not([hidden])').first();
    const roomCells = await roomRow.locator('td').allInnerTexts();
    assert.equal(Number(roomCells[5]), 4);
    assert.ok(Number.isInteger(Number(roomCells[6])) && Number(roomCells[6]) >= 0, JSON.stringify(roomCells));
    await roomRow.locator('[data-action="resource-detail"]').click();
    let resourceDialog = page.locator('dialog.dialog');
    assert.match(await resourceDialog.innerText(), /床位与入住学生/);
    const roomStudentCells = await resourceDialog.locator('.detail-section .table tbody tr').first().locator('td').allInnerTexts();
    assert.equal(roomStudentCells.length, 5);
    assert.ok(roomStudentCells.slice(1).every(value => value.trim() !== '-'), JSON.stringify(roomStudentCells));
    const initialRoomOccupants = await resourceDialog.locator('.detail-section .table tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim())));
    await resourceDialog.locator('[data-room-occupants]').click();
    await page.locator('dialog .room-occupant-choice').first().waitFor();
    resourceDialog = page.locator('dialog.dialog');
    assert.ok(await resourceDialog.evaluate(element => element.classList.contains('room-edit-dialog')));
    assert.equal(await resourceDialog.locator('.room-occupant-choice').count(), 4);
    assert.ok(await resourceDialog.locator('.student-picker-table .table-pagination').count());
    assert.equal(await resourceDialog.locator('.room-occupant-choice select').count(), 0);
    assert.equal(await resourceDialog.locator('.room-occupant-editor [data-bed-select]').count(), 4);
    assert.equal(await resourceDialog.locator('.student-picker-table tbody tr:not([hidden])').count(), 7);
    assert.equal(await resourceDialog.locator('.room-occupant-edit-actions button').count(), 2);
    assert.equal(await resourceDialog.locator('.room-occupant-edit-actions [type="submit"]').innerText(), '保存调整');
    assert.equal(await resourceDialog.locator('.dialog-footer [type="submit"]').count(), 0);
    const detailPickerButtonSize = await resourceDialog.locator('[data-student-search]').evaluate(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
    const detailAdjustmentButtonSizes = await resourceDialog.locator('.room-occupant-edit-actions button').evaluateAll(elements => elements.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
    assert.ok(detailAdjustmentButtonSizes.every(size => Math.abs(size.width - detailPickerButtonSize.width) < 1 && Math.abs(size.height - detailPickerButtonSize.height) < 1), JSON.stringify({ detailPickerButtonSize, detailAdjustmentButtonSizes }));
    const detailDialogBody = resourceDialog.locator('.dialog-body');
    const detailDialogScroll = await detailDialogBody.evaluate(element => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
    assert.ok(detailDialogScroll.scrollHeight <= detailDialogScroll.clientHeight + 1, JSON.stringify(detailDialogScroll));
    assert.equal(await resourceDialog.locator('.room-occupant-grid').evaluate(element => getComputedStyle(element).position), 'sticky');
    const occupiedBedIndex = await resourceDialog.locator('.room-occupant-choice').evaluateAll(cards => cards.findIndex(card => card.querySelector('[data-bed-student-id]').value !== ''));
    assert.notEqual(occupiedBedIndex, -1);
    let detailOccupantUpdates = 0;
    const observeRoomOccupantUpdates = request => {
      if (request.method() === 'PUT' && /\/admin\/rooms\/\d+\/occupants$/.test(new URL(request.url()).pathname)) detailOccupantUpdates++;
    };
    page.on('request', observeRoomOccupantUpdates);
    await resourceDialog.locator('.room-occupant-choice').nth(occupiedBedIndex).locator('[data-bed-clear]').click();
    await resourceDialog.locator('[data-room-occupants-cancel]').click();
    await resourceDialog.waitFor({ state: 'detached' });
    page.off('request', observeRoomOccupantUpdates);
    assert.equal(detailOccupantUpdates, 0);
    await roomRow.locator('[data-action="resource-detail"]').click();
    resourceDialog = page.locator('dialog.dialog');
    const roomOccupantsAfterCancel = await resourceDialog.locator('.detail-section .table tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim())));
    assert.deepEqual(roomOccupantsAfterCancel, initialRoomOccupants);
    await resourceDialog.locator('[data-room-occupants]').click();
    await page.locator('dialog .room-occupant-choice').first().waitFor();
    resourceDialog = page.locator('dialog.dialog');
    let detailSavePayload;
    const interceptRoomOccupantSave = async route => {
      detailSavePayload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data: null }) });
    };
    await page.route('**/api/v1/admin/rooms/*/occupants', interceptRoomOccupantSave);
    await resourceDialog.locator('.room-occupant-edit-actions [type="submit"]').click();
    await resourceDialog.waitFor({ state: 'detached' });
    await page.unroute('**/api/v1/admin/rooms/*/occupants', interceptRoomOccupantSave);
    assert.equal(detailSavePayload.occupants.length, 4);

    await roomRow.locator('[data-action="resource-edit"]').click();
    await page.getByRole('heading', { name: '编辑宿舍' }).waitFor();
    resourceDialog = page.locator('dialog.dialog');
    assert.equal(await resourceDialog.locator('[data-room-occupants]').count(), 1);
    assert.equal(await resourceDialog.locator('[data-room-edit-occupants]').isVisible(), false);
    assert.equal(await resourceDialog.locator('[data-room-beds-summary] tbody tr').count(), 4);
    await resourceDialog.locator('[name="roomNo"]').fill('draft-room-name');
    await resourceDialog.locator('[data-room-occupants]').click();
    await resourceDialog.locator('[data-room-edit-occupants] .room-occupant-choice').first().waitFor();
    assert.equal(await resourceDialog.locator('.room-occupant-choice').count(), 4);
    assert.equal(await resourceDialog.locator('[data-room-edit-main]').isVisible(), false);
    assert.ok(await resourceDialog.locator('.student-picker-table .table-pagination').count());
    const studentResults = resourceDialog.locator('[data-student-picker-results]');
    assert.equal(await resourceDialog.locator('.student-picker-results-scroll').count(), 0);
    assert.equal(await studentResults.locator('.student-picker-table tbody tr:not([hidden])').count(), 7);
    const pickerPager = studentResults.locator('.student-picker-table .table-pagination');
    assert.match(await pickerPager.locator('[data-table-page-label]').innerText(), /^1 \/ \d+$/);
    await pickerPager.locator('[data-table-page-step="1"]').click();
    assert.equal(await studentResults.locator('.student-picker-table tbody tr:not([hidden])').count(), 7);
    assert.match(await pickerPager.locator('[data-table-page-label]').innerText(), /^2 \/ \d+$/);
    await pickerPager.locator('[data-table-page-step="-1"]').click();
    const filterWidths = await resourceDialog.locator('.student-picker-filter-grid .field input,.student-picker-filter-grid .field select').evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().width)));
    assert.ok(filterWidths.every(width => width <= 180), JSON.stringify(filterWidths));
    const filterRows = await resourceDialog.locator('.student-picker-filter-grid').evaluate(element => [...element.children].map(child => Math.round(child.getBoundingClientRect().bottom)));
    assert.equal(new Set(filterRows).size, 1, JSON.stringify(filterRows));
    const pickerButtonSize = await resourceDialog.locator('[data-student-search]').evaluate(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
    const adjustmentButtonSizes = await resourceDialog.locator('.room-occupant-edit-actions button').evaluateAll(elements => elements.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
    assert.ok(adjustmentButtonSizes.every(size => Math.abs(size.width - pickerButtonSize.width) < 1 && Math.abs(size.height - pickerButtonSize.height) < 1), JSON.stringify({ pickerButtonSize, adjustmentButtonSizes }));
    const dialogBody = resourceDialog.locator('.dialog-body');
    const dialogScroll = await dialogBody.evaluate(element => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
    assert.ok(dialogScroll.scrollHeight <= dialogScroll.clientHeight + 1, JSON.stringify(dialogScroll));
    const bedGrid = resourceDialog.locator('[data-room-edit-occupants] .room-occupant-grid');
    assert.equal(await bedGrid.evaluate(element => getComputedStyle(element).position), 'sticky');
    await page.setViewportSize({ width: 1440, height: 540 });
    assert.ok(await dialogBody.evaluate(element => element.scrollHeight > element.clientHeight));
    await dialogBody.evaluate(element => { element.scrollTop = 180; });
    const stickyPosition = await bedGrid.evaluate(element => ({ top: element.getBoundingClientRect().top, containerTop: element.closest('.dialog-body').getBoundingClientRect().top }));
    assert.ok(Math.abs(stickyPosition.top - stickyPosition.containerTop) < 2, JSON.stringify(stickyPosition));
    await dialogBody.evaluate(element => { element.scrollTop = 0; });
    await page.setViewportSize({ width: 1440, height: 960 });
    await resourceDialog.locator('.room-occupant-choice [data-bed-clear]').first().click();
    await resourceDialog.locator('[data-room-occupants-save]').click();
    assert.equal(await resourceDialog.locator('[data-room-edit-main]').isVisible(), true);
    assert.equal(await resourceDialog.locator('.dialog-footer [type="submit"]').isVisible(), true);
    assert.equal(await resourceDialog.locator('[name="roomNo"]').inputValue(), 'draft-room-name');
    const stagedStudentCells = await resourceDialog.locator('[data-room-beds-summary] tbody tr').first().locator('td').allInnerTexts();
    assert.equal(stagedStudentCells[1].trim(), '-');
    assert.equal(stagedStudentCells[2].trim(), '-');
    await resourceDialog.locator('[data-room-occupants]').click();
    await resourceDialog.locator('.room-occupant-choice [data-bed-select]').first().click();
    await resourceDialog.locator('.room-occupant-choice [data-bed-clear]').first().click();
    await resourceDialog.locator('[data-room-occupants-cancel]').click();
    assert.equal(await resourceDialog.locator('[name="roomNo"]').inputValue(), 'draft-room-name');
    assert.equal((await resourceDialog.locator('[data-room-beds-summary] tbody tr').first().locator('td').nth(1).innerText()).trim(), '-');
    await resourceDialog.locator('[data-close]').click();

    await page.locator('[data-page="beds"]').click();
    const occupiedBedFilters = page.locator('[data-resource-filter="beds"]');
    const occupiedBuildingOption = await occupiedBedFilters.locator('[name="buildingId"] option').filter({ hasText: demoBuildingName }).getAttribute('value');
    await occupiedBedFilters.locator('[name="buildingId"]').selectOption(occupiedBuildingOption);
    await occupiedBedFilters.locator('[name="floorNo"]').selectOption('1');
    await occupiedBedFilters.locator('[name="roomId"]').selectOption({ index: 1 });
    await occupiedBedFilters.locator('[name="bedStatus"]').selectOption('OCCUPIED');
    await occupiedBedFilters.locator('button[type="submit"]').click();
    await page.getByText('共 4 条').waitFor();
    const occupiedBedRow = page.locator('.resource-table tbody tr:not([hidden])').first();
    await occupiedBedRow.locator('[data-action="resource-detail"]').click();
    resourceDialog = page.locator('dialog.dialog');
    assert.match(await resourceDialog.innerText(), /学生基本信息/);
    assert.match(await resourceDialog.innerText(), /床位状态\s+已入住/);
    await resourceDialog.locator('[data-close]').click();
    await occupiedBedRow.locator('[data-action="resource-edit"]').click();
    await page.locator('dialog [data-bed-occupants]').waitFor();
    resourceDialog = page.locator('dialog.dialog');
    assert.equal(await resourceDialog.locator('[data-bed-occupants]').count(), 1);
    assert.equal(await resourceDialog.locator('.student-picker').count(), 0);
    assert.equal(await resourceDialog.locator('[name="managementStatus"] option:checked').textContent(), '正常使用');
    const bedId = await occupiedBedRow.getAttribute('data-row-id');
    const initialBedStudent = await resourceDialog.locator('[data-bed-student-id]').inputValue();
    const initialBedSummary = await resourceDialog.locator('[data-bed-occupant-summary]').innerText();
    assert.ok(initialBedStudent);
    let bedUpdatePayload;
    const interceptBedUpdate = async route => {
      bedUpdatePayload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data: Number(bedId) }) });
    };
    await page.route('**/api/v1/admin/resources/beds/*', interceptBedUpdate);
    await resourceDialog.locator('[data-bed-occupants]').click();
    assert.equal(await resourceDialog.locator('[data-bed-edit-main]').isVisible(), false);
    assert.equal(await resourceDialog.locator('[data-bed-edit-occupants]').isVisible(), true);
    assert.equal(await resourceDialog.locator('[data-bed-student-picker] .student-picker').count(), 1);
    await resourceDialog.locator('[data-bed-student-clear]').click();
    await resourceDialog.locator('[data-bed-occupants-cancel]').click();
    assert.equal(await resourceDialog.locator('[data-bed-student-id]').inputValue(), initialBedStudent);
    assert.equal(await resourceDialog.locator('[data-bed-occupant-summary]').innerText(), initialBedSummary);
    assert.equal(bedUpdatePayload, undefined);
    await resourceDialog.locator('[data-bed-occupants]').click();
    await resourceDialog.locator('[data-bed-student-clear]').click();
    await resourceDialog.locator('[data-bed-occupants-save]').click();
    assert.equal(await resourceDialog.locator('[data-bed-edit-main]').isVisible(), true);
    assert.equal(await resourceDialog.locator('[data-bed-student-id]').inputValue(), '');
    assert.match(await resourceDialog.locator('[data-bed-occupant-summary]').innerText(), /当前床位暂无入住学生/);
    assert.equal(bedUpdatePayload, undefined);
    const bedUpdateResponse = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === `/api/v1/admin/resources/beds/${bedId}`);
    await resourceDialog.locator('.dialog-footer [type="submit"]').click();
    await bedUpdateResponse;
    await resourceDialog.waitFor({ state: 'detached' });
    await page.unroute('**/api/v1/admin/resources/beds/*', interceptBedUpdate);
    assert.equal(bedUpdatePayload.studentId, null);

    await occupiedBedFilters.locator('[name="buildingId"]').selectOption('');
    await occupiedBedFilters.locator('[name="floorNo"]').selectOption('');
    await occupiedBedFilters.locator('[name="bedStatus"]').selectOption('AVAILABLE');
    await occupiedBedFilters.locator('button[type="submit"]').click();
    await page.locator('.resource-result-count').filter({ hasText: '共 124 条' }).waitFor();
    const availableRows = page.locator('.resource-table tbody tr:not([hidden])');
    assert.equal(await availableRows.count(), 8);
    assert.ok((await availableRows.locator('td:nth-child(6)').allTextContents()).every(value => value.trim() === '可分配'));
    assert.ok((await availableRows.locator('td:nth-child(7)').allTextContents()).every(value => value.trim() === '-'));
    await occupiedBedFilters.locator('[name="bedStatus"]').selectOption('DISABLED');
    await occupiedBedFilters.locator('button[type="submit"]').click();
    await page.locator('.resource-result-count').filter({ hasText: '共 0 条' }).waitFor();

    await page.route('**/api/v1/admin/users?*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, message: 'ok', data: Array.from({ length: 23 }, (_, index) => ({
        user_id: index + 100,
        student_no: `202600${String(index + 1).padStart(4, '0')}`,
        real_name: `学生${index + 1}`,
        login_account: `student${index + 1}`,
        department_name: '信息学院',
        major_name: '软件工程',
        grade: '2026级',
        class_name: '软件工程1班',
        current_building: null,
        enabled: 1,
        gender: 'FEMALE',
        enrollment_status: 'ENROLLED'
      })) })
    }));
    await page.locator('.nav-group[data-nav-group="roles"] summary').click();
    await page.locator('[data-page="students"]').click();
    await page.locator('.role-table-students .table-pagination').waitFor();
    assert.equal(await page.getByRole('button', { name: '批量删除' }).count(), 1);
    assert.equal(await page.locator('.role-table-students tbody tr:not([hidden])').count(), 8);
    const desktopActions = page.locator('.role-table-students tbody tr:not([hidden]) td:last-child .actions').first();
    const desktopActionTops = await desktopActions.locator('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().top));
    assert.ok(Math.max(...desktopActionTops) - Math.min(...desktopActionTops) < 1, JSON.stringify(desktopActionTops));
    const desktopActionLeftGap = await desktopActions.evaluate(element => {
      const header = element.closest('table').querySelector('thead th:last-child');
      const headingTextLeft = header.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(header).paddingLeft);
      return element.querySelector('button').getBoundingClientRect().left - headingTextLeft;
    });
    assert.ok(Math.abs(desktopActionLeftGap) < 1, `${desktopActionLeftGap}px left gap in the role table action column`);
    assert.ok(await desktopActions.evaluate(element => element.scrollWidth <= element.clientWidth));
    await page.locator('.role-table-students [data-select-row]').first().check();
    const pageInput = page.locator('.role-table-students [data-table-page-input]');
    await pageInput.fill('3');
    await page.locator('.role-table-students [data-table-page-jump]').click();
    assert.equal(await page.locator('.role-table-students [data-table-page-label]').textContent(), '3 / 3');
    assert.equal(await page.locator('.role-table-students tbody tr:not([hidden])').count(), 7);
    assert.equal(await page.locator('.role-table-students tbody tr:not([hidden])').first().getAttribute('data-table-row-index'), '16');
    assert.equal(await page.locator('.role-table-students [data-select-row]:checked').count(), 1);
    await pageInput.fill('2');
    await pageInput.press('Enter');
    assert.equal(await page.locator('.role-table-students [data-table-page-label]').textContent(), '2 / 3');
    assert.equal(await page.locator('.role-table-students tbody tr:not([hidden])').count(), 8);
    assert.equal(await page.locator('.role-table-students tbody tr:not([hidden])').first().getAttribute('data-table-row-index'), '8');
    assert.equal(await page.locator('.role-table-students [data-select-row]:checked').count(), 1);
    await page.locator('.role-table-students [data-select-all]').check();
    assert.equal(await page.locator('.role-table-students [data-select-row]:checked').count(), 9);
    await page.locator('.role-table-students [data-table-page-step="1"]').click();
    assert.equal(await page.locator('.role-table-students tbody tr:not([hidden])').count(), 7);
    assert.equal(await page.locator('.role-table-students [data-select-all]').isChecked(), false);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileActions = page.locator('.role-table-students tbody tr:not([hidden]) td:last-child .actions').first();
    const mobileActionLayout = await mobileActions.evaluate(element => ({
      display: getComputedStyle(element).display,
      flexWrap: getComputedStyle(element).flexWrap,
      buttonTops: [...element.querySelectorAll('button')].map(button => button.getBoundingClientRect().top)
    }));
    assert.equal(mobileActionLayout.display, 'flex');
    assert.equal(mobileActionLayout.flexWrap, 'nowrap');
    assert.ok(Math.max(...mobileActionLayout.buttonTops) - Math.min(...mobileActionLayout.buttonTops) < 1, JSON.stringify(mobileActionLayout));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log('Admin query smoke passed: role column spacing, two-row responsive bed filters, 5-row building room paging, staged occupancy edits, admin pagination, mobile width.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
