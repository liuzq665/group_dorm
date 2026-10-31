from pathlib import Path
import sys
import tempfile
sys.path.insert(0, str(Path(tempfile.gettempdir()) / "dorm-playwright"))
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
errors = []
failed_responses = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" and "Failed to load resource" not in message.text else None)
    page.on("response", lambda response: failed_responses.append(f"{response.status} {response.url}") if response.status >= 400 else None)
    page.goto("http://127.0.0.1:5187/login")
    page.wait_for_load_state("networkidle")
    page.get_by_label("账号").fill("admin")
    page.get_by_label("密码").fill("123456")
    page.get_by_role("button", name="登录").click()
    page.get_by_role("heading", name="工作台").wait_for()
    page.wait_for_timeout(1200)

    toc = page.locator(".dashboard-toc")
    toc_box = toc.bounding_box()
    assert toc_box and toc_box["x"] > 1100 and toc_box["y"] > 300
    page.screenshot(path=str(ROOT / "test-results" / "dashboard-index-smoke.png"), full_page=True)

    page.locator('button[data-page="messages"]').click()
    page.get_by_role("heading", name="站内消息").wait_for()
    assert page.locator('.message-filter-tabs button.active').first.inner_text() == "未读"
    assert page.locator('.message-filter-tabs[aria-label="通知来源"] button.active').inner_text() == "系统通知"
    page.get_by_role("button", name="查看详情").first.click()
    page.get_by_role("dialog").get_by_role("heading", name="消息详情").wait_for()
    assert page.get_by_role("dialog").get_by_text("维修工单待人工处理提醒").count() > 0
    page.get_by_role("dialog").get_by_role("button", name="关闭").first.click()
    assert page.get_by_role("button", name="清除未读").count() == 1

    page.get_by_text("报修管理", exact=True).click()
    page.locator('button[data-page="repairs"]').click()
    page.get_by_role("heading", name="报修工单").wait_for()
    status_labels = page.locator(".repair-status-tabs button").all_inner_texts()
    assert status_labels[:3] == ["全部", "待人工处理", "待审核"]
    page.locator('.repair-status-tabs button[data-id="ALL"]').click()
    page.wait_for_timeout(400)
    assert page.locator(".repair-status-tabs button").count() == 3

    page.locator("summary").filter(has_text="宿舍管理").click()
    page.locator('button[data-page="accommodationHistory"]').click()
    page.get_by_role("heading", name="住宿历史").wait_for()
    page.locator("#accommodation-history-filter-form").wait_for()
    assert page.locator(".table tbody tr").count() > 0
    page.screenshot(path=str(ROOT / "test-results" / "accommodation-history-smoke.png"), full_page=True)
    assert not errors, "Browser errors: " + " | ".join(errors) + " | responses: " + " | ".join(failed_responses)
    browser.close()

print("Dashboard directory, unread message detail, repair tabs, and accommodation history passed.")
