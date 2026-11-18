/**
 * 弹层与底部导航的互斥控制。
 *
 * 自定义 tabBar 由微信渲染在独立的 tab-bar 根节点上（不在页面 DOM 内），
 * 页面里的 .modal-mask 无论 z-index 多高都无法盖住它：
 *   - 弹层较高时（如批次配置表单）底部操作按钮会被 tabBar 压住；
 *   - 弹层打开时仍可点底部导航切页，弹层内容还会残留在上一页。
 * 因此打开页面内弹层时隐藏自定义 tabBar，关闭时恢复。
 */
function setTabBarHidden(page, hidden) {
  try {
    const bar = page && typeof page.getTabBar === 'function' ? page.getTabBar() : null;
    if (bar) bar.setData({ overlayHidden: !!hidden });
  } catch (error) {
    // 非 tabBar 页面或组件未挂载时忽略
  }
}

/** 弹层显隐统一入口：hidden=true 时隐藏 tabBar */
function overlay(page, hidden) {
  setTabBarHidden(page, hidden);
}

module.exports = { overlay, setTabBarHidden };
