/**
 * 统计页：总战绩、按对象/地点/年份
 * 鸿蒙对应：pages/StatsPage.ets、viewmodel 统计逻辑
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  if (!data) return;

  function renderStats() {
    const records = data.getRecords();
    const statsType = document.querySelector('.stats-type-btn.active')?.getAttribute('data-type') || 'category';
    const CATEGORIES = data.CATEGORIES;
    const formatAmount = data.formatAmount;
    const getHideAmounts = data.getHideAmounts;
    const escapeHtml = data.escapeHtml;

    const total = records.reduce(function (sum, r) { return sum + (r.amount || 0); }, 0);
    const totalEl = document.getElementById('stats-total-amount');
    totalEl.textContent = formatAmount(total);
    totalEl.className = 'stats-total-amount ' + (total >= 0 ? 'positive' : 'negative');

    var winCount = records.filter(function (r) { return (r.amount || 0) > 0; }).length;
    var winRateEl = document.getElementById('stats-win-rate');
    if (winRateEl) {
      winRateEl.textContent = records.length ? (getHideAmounts() ? '***' : ((winCount / records.length) * 100).toFixed(1) + '%') : '—';
      winRateEl.className = 'stats-win-rate ' + (total >= 0 ? 'positive' : 'negative');
    }

    var items = [];
    if (statsType === 'category') {
      const byCat = {};
      CATEGORIES.forEach(function (c) { byCat[c] = 0; });
      records.forEach(function (r) {
        if (byCat[r.category] !== undefined) byCat[r.category] += (r.amount || 0);
      });
      CATEGORIES.forEach(function (cat) {
        items.push({ name: cat, sum: byCat[cat] });
      });
    } else if (statsType === 'location') {
      const byLoc = {};
      records.forEach(function (r) {
        var loc = (r.location || '').trim() || '—';
        if (byLoc[loc] === undefined) byLoc[loc] = 0;
        byLoc[loc] += (r.amount || 0);
      });
      Object.keys(byLoc).sort().forEach(function (loc) {
        items.push({ name: loc, sum: byLoc[loc] });
      });
    } else if (statsType === 'year') {
      const byYear = {};
      records.forEach(function (r) {
        var y = (r.date || '').slice(0, 4) || '—';
        if (byYear[y] === undefined) byYear[y] = 0;
        byYear[y] += (r.amount || 0);
      });
      Object.keys(byYear).sort(function (a, b) { return b.localeCompare(a); }).forEach(function (y) {
        items.push({ name: y + '年', sum: byYear[y] });
      });
    }

    const listEl = document.getElementById('stats-category-list');
    listEl.innerHTML = '';
    items.forEach(function (item) {
      const li = document.createElement('li');
      li.className = 'stats-category-item';
      const sumClass = item.sum >= 0 ? 'positive' : 'negative';
      li.innerHTML = '<span class="name">' + escapeHtml(item.name) + '</span><span class="sum ' + sumClass + '">' + formatAmount(item.sum) + '</span>';
      listEl.appendChild(li);
    });
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.stats = { renderStats: renderStats };
})();
