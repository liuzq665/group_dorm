/** 探针：列出 CDP 目标，并对当前页面截图 + 输出布局度量 */
const { targets, connectPage } = require('./lib');

(async () => {
  const list = await targets();
  console.log('CDP 目标：');
  for (const target of list) {
    if (['webview', 'page'].includes(target.type)) console.log(`- [${target.type}] ${target.title}`);
  }
  const page = await connectPage('pages/');
  const metrics = await page.evaluate(`(() => {
    const de = document.documentElement;
    return {
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      bodyText: (document.body.innerText || '').slice(0, 300)
    };
  })()`);
  console.log('页面度量：', JSON.stringify(metrics, null, 2));
  const saved = await page.screenshot('test-results/visual/probe-current.png');
  console.log('截图：', saved);
  page.close();
})().catch(error => {
  console.error('探针失败：', error.message);
  process.exit(1);
});
