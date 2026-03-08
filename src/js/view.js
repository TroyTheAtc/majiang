/**
 * 视图切换：Tab 与三视图显示
 * 鸿蒙对应：路由 / 页面栈
 */
(function () {
  'use strict';

  function switchView(viewId) {
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
    var view = document.getElementById('view-' + viewId);
    var tab = document.querySelector('.tab[data-view="' + viewId + '"]');
    if (view) view.classList.add('active');
    if (tab) tab.classList.add('active');
    if (viewId === 'stats' && window.MahjongApp && window.MahjongApp.stats) {
      window.MahjongApp.stats.renderStats();
    }
    if (viewId === 'divine' && window.MahjongApp && window.MahjongApp.divine) {
      var dateStr = new Date().toISOString().slice(0, 10);
      window.MahjongApp.divine.renderDivine(dateStr);
    }
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.view = { switchView: switchView };
})();
