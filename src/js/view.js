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
      /* 每次进入占卜页都按「今天」渲染。
         以前这里会读 localStorage 里的 divine_last_date（上次选定的日期），
         于是今天打开时还停在前一天选的日期，看起来像"没刷新"。已去掉这个记忆；
         要看别的日期，在页面里的日期选择器上选（页面提供了"回到今天"）。 */
      window.MahjongApp.divine.renderDivine(window.MahjongApp.data.todayStr());
    }
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.view = { switchView: switchView };
})();
