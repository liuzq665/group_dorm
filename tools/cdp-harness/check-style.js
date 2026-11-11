const { connectPage } = require('./lib');

(async () => {
  const page = await connectPage('pages/home');
  const info = await page.evaluate(`(() => {
    const buttons = [...document.querySelectorAll('wx-button')].slice(0, 6);
    const sheets = [];
    for (const sheet of [...document.styleSheets]) {
      try { sheets.push({ count: sheet.cssRules.length, rules: [...sheet.cssRules].filter(rule => String(rule.selectorText || '').includes('button')).map(rule => rule.cssText.slice(0, 160)).slice(0, 20) }); }
      catch (error) { sheets.push({ error: String(error).slice(0, 40) }); }
    }
    return {
      buttons: buttons.map(button => ({ cls: String(button.className), rect: Math.round(button.getBoundingClientRect().width), display: getComputedStyle(button).display, width: getComputedStyle(button).width, flex: getComputedStyle(button).flex, minWidth: getComputedStyle(button).minWidth })),
      sheets
    };
  })()`);
  console.log(JSON.stringify(info, null, 2));
  page.close();
})().catch(error => { console.error(error.message); process.exit(1); });

