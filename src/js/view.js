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
      /* 进入占卜页先给「占卜今日麻运」按钮，不直接抛结果；
         点按钮后才按「今天」起卦（同人同天结果恒定）。
         不记忆上次选定的日期，避免"打开还停在前一天"。 */
      window.MahjongApp.divine.renderIdle();
    }
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.view = { switchView: switchView };
})();
