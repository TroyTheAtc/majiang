/**
 * 统计页：总战绩、按对象/地点/年份；点击某项弹出详情卡片（总局数、胜利局数、胜率、场均得分）；
 * 年份卡片中显示最近连胜/连败（≥2 场才显示）。
 * 鸿蒙对应：pages/StatsPage.ets、viewmodel 统计逻辑
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  if (!data) return;

  /** 根据当前统计类型 + 选项 key 筛选记录 */
  function getRecordsForStat(records, statsType, key) {
    if (statsType === 'category') {
      return records.filter(function (r) { return r.category === key; });
    }
    if (statsType === 'location') {
      return records.filter(function (r) {
        var loc = (r.location || '').trim() || '—';
        return loc === key;
      });
    }
    if (statsType === 'year') {
      return records.filter(function (r) {
        var y = (r.date || '').slice(0, 4) || '—';
        return y === key;
      });
    }
    return [];
  }

  /** 计算详情：总局数、胜利局数、胜率、场均得分 */
  function getDetailStats(records) {
    var totalGames = records.length;
    var winGames = records.filter(function (r) { return (r.amount || 0) > 0; }).length;
    var sumAmount = records.reduce(function (s, r) { return s + (r.amount || 0); }, 0);
    var winRate = totalGames ? ((winGames / totalGames) * 100).toFixed(1) + '%' : '—';
    var avgScore = totalGames ? (sumAmount / totalGames) : null;
    return { totalGames: totalGames, winGames: winGames, winRate: winRate, avgScore: avgScore, sumAmount: sumAmount };
  }

  /** 最长连胜场数：按日期顺序遍历，连续 amount>0 的最大长度 */
  function getMaxWinStreak(records) {
    if (!records.length) return 0;
    var sorted = records.slice().sort(function (a, b) {
      var d = (a.date || '').localeCompare(b.date || '');
      return d !== 0 ? d : (a.id || '').localeCompare(b.id || '');
    });
    var max = 0;
    var cur = 0;
    for (var i = 0; i < sorted.length; i++) {
      if ((sorted[i].amount || 0) > 0) {
        cur++;
        if (cur > max) max = cur;
      } else {
        cur = 0;
      }
    }
    return max;
  }

  /** 最长连败场数：按日期顺序遍历，连续 amount<0 的最大长度 */
  function getMaxLossStreak(records) {
    if (!records.length) return 0;
    var sorted = records.slice().sort(function (a, b) {
      var d = (a.date || '').localeCompare(b.date || '');
      return d !== 0 ? d : (a.id || '').localeCompare(b.id || '');
    });
    var max = 0;
    var cur = 0;
    for (var j = 0; j < sorted.length; j++) {
      if ((sorted[j].amount || 0) < 0) {
        cur++;
        if (cur > max) max = cur;
      } else {
        cur = 0;
      }
    }
    return max;
  }

  /** 单场最多/最低得分：返回 { max, min }，无记录时为 null */
  function getSingleExtreme(records) {
    if (!records.length) return null;
    var max = records[0].amount != null ? Number(records[0].amount) : 0;
    var min = max;
    for (var i = 1; i < records.length; i++) {
      var amt = records[i].amount != null ? Number(records[i].amount) : 0;
      if (amt > max) max = amt;
      if (amt < min) min = amt;
    }
    return { max: max, min: min };
  }

  /** 最近连胜/连败：按日期倒序，从最近一场开始数，连续赢或连续输的场数；仅当 ≥2 时返回 */
  function getRecentStreak(records) {
    if (!records.length) return null;
    var sorted = records.slice().sort(function (a, b) {
      var d = (b.date || '').localeCompare(a.date || '');
      if (d !== 0) return d;
      return (b.id || '').localeCompare(a.id || '');
    });
    var first = sorted[0];
    var amt = first.amount != null ? Number(first.amount) : 0;
    if (amt > 0) {
      var count = 1;
      for (var i = 1; i < sorted.length; i++) {
        if ((sorted[i].amount || 0) > 0) count++; else break;
      }
      return count >= 2 ? { type: 'win', count: count } : null;
    }
    if (amt < 0) {
      var countLoss = 1;
      for (var j = 1; j < sorted.length; j++) {
        if ((sorted[j].amount || 0) < 0) countLoss++; else break;
      }
      return countLoss >= 2 ? { type: 'loss', count: countLoss } : null;
    }
    return null;
  }

  function showDetailCard(displayName, statsType, key) {
    var records = data.getRecords();
    var subset = getRecordsForStat(records, statsType, key);
    var detail = getDetailStats(subset);
    var formatAmount = data.formatAmount;
    var getHideAmounts = data.getHideAmounts;

    var overlay = document.getElementById('stats-detail-overlay');
    var titleEl = document.getElementById('stats-detail-title');
    var streakWrap = document.getElementById('stats-detail-streak-wrap');
    var streakEl = document.getElementById('stats-detail-streak');
    var totalGamesEl = document.getElementById('stats-detail-total-games');
    var winGamesEl = document.getElementById('stats-detail-win-games');
    var winRateEl = document.getElementById('stats-detail-win-rate');
    var avgEl = document.getElementById('stats-detail-avg');
    var maxWinStreakEl = document.getElementById('stats-detail-max-win-streak');
    var maxLossStreakEl = document.getElementById('stats-detail-max-loss-streak');
    var singleMaxEl = document.getElementById('stats-detail-single-max');
    var singleMinEl = document.getElementById('stats-detail-single-min');

    if (!overlay || !titleEl) return;

    titleEl.textContent = displayName;
    totalGamesEl.textContent = String(detail.totalGames);
    winGamesEl.textContent = String(detail.winGames);
    winRateEl.textContent = getHideAmounts() ? '***' : detail.winRate;
    if (detail.avgScore !== null) {
      avgEl.textContent = getHideAmounts() ? '***' : formatAmount(Math.round(detail.avgScore));
      avgEl.className = detail.avgScore >= 0 ? 'positive' : 'negative';
    } else {
      avgEl.textContent = '—';
      avgEl.className = '';
    }

    var maxWin = getMaxWinStreak(subset);
    var maxLoss = getMaxLossStreak(subset);
    if (maxWinStreakEl) {
      maxWinStreakEl.textContent = maxWin > 0 ? maxWin + '场' : '—';
      maxWinStreakEl.className = maxWin > 0 ? 'positive' : '';
    }
    if (maxLossStreakEl) {
      maxLossStreakEl.textContent = maxLoss > 0 ? maxLoss + '场' : '—';
      maxLossStreakEl.className = maxLoss > 0 ? 'negative' : '';
    }

    var extreme = getSingleExtreme(subset);
    if (singleMaxEl && singleMinEl) {
      if (getHideAmounts()) {
        singleMaxEl.textContent = '***';
        singleMinEl.textContent = '***';
        singleMaxEl.className = 'detail-val';
        singleMinEl.className = 'detail-val';
      } else if (extreme === null) {
        singleMaxEl.textContent = '—';
        singleMinEl.textContent = '—';
        singleMaxEl.className = 'detail-val';
        singleMinEl.className = 'detail-val';
      } else {
        if (extreme.max <= 0) {
          singleMaxEl.textContent = '—';
          singleMaxEl.className = 'detail-val';
        } else {
          singleMaxEl.textContent = formatAmount(extreme.max);
          singleMaxEl.className = 'detail-val positive';
        }
        if (extreme.min >= 0) {
          singleMinEl.textContent = '—';
          singleMinEl.className = 'detail-val';
        } else {
          singleMinEl.textContent = formatAmount(extreme.min);
          singleMinEl.className = 'detail-val negative';
        }
      }
    }

    if (streakWrap && streakEl) {
      if (statsType === 'year') {
        streakWrap.setAttribute('aria-hidden', 'true');
        streakEl.textContent = '';
        streakEl.className = 'stats-detail-streak';
      } else {
        var streak = getRecentStreak(subset);
        if (streak && streak.count >= 2) {
          streakWrap.setAttribute('aria-hidden', 'false');
          streakEl.textContent = streak.type === 'win' ? streak.count + '连胜' : streak.count + '连败';
          streakEl.className = 'stats-detail-streak ' + (streak.type === 'win' ? 'streak-win' : 'streak-loss');
        } else {
          streakWrap.setAttribute('aria-hidden', 'true');
          streakEl.textContent = '';
          streakEl.className = 'stats-detail-streak';
        }
      }
    }

    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
  }

  function closeDetailCard() {
    var overlay = document.getElementById('stats-detail-overlay');
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

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
        items.push({ name: cat, sum: byCat[cat], key: cat });
      });
    } else if (statsType === 'location') {
      const byLoc = {};
      records.forEach(function (r) {
        var loc = (r.location || '').trim() || '—';
        if (byLoc[loc] === undefined) byLoc[loc] = 0;
        byLoc[loc] += (r.amount || 0);
      });
      Object.keys(byLoc).sort().forEach(function (loc) {
        items.push({ name: loc, sum: byLoc[loc], key: loc });
      });
    } else if (statsType === 'year') {
      const byYear = {};
      records.forEach(function (r) {
        var y = (r.date || '').slice(0, 4) || '—';
        if (byYear[y] === undefined) byYear[y] = 0;
        byYear[y] += (r.amount || 0);
      });
      Object.keys(byYear).sort(function (a, b) { return b.localeCompare(a); }).forEach(function (y) {
        var subset = getRecordsForStat(records, 'year', y);
        var streak = getRecentStreak(subset);
        var streakText = '';
        var streakClass = '';
        if (streak && streak.count >= 2) {
          streakText = streak.type === 'win' ? streak.count + '连胜' : streak.count + '连败';
          streakClass = streak.type === 'win' ? 'streak-win' : 'streak-loss';
        }
        items.push({ name: y + '年', sum: byYear[y], key: y, streakText: streakText, streakClass: streakClass });
      });
    }

    const listEl = document.getElementById('stats-category-list');
    listEl.innerHTML = '';
    items.forEach(function (item) {
      const li = document.createElement('li');
      li.className = 'stats-category-item';
      li.setAttribute('data-key', item.key);
      li.setAttribute('data-name', item.name);
      const sumClass = item.sum >= 0 ? 'positive' : 'negative';
      var streakHtml = '';
      if (item.streakText) {
        var arrowImg = (item.streakClass === 'streak-win') ? 'a-shangsheng2.png' : 'a-xiajiang2.png';
        streakHtml = '<span class="stats-item-streak-wrap"><span class="stats-item-streak ' + (item.streakClass || '') + '">' + escapeHtml(item.streakText) + '</span><img src="assets/images/' + arrowImg + '" alt="" class="stats-streak-arrow" /></span>';
      }
      li.innerHTML = '<span class="name">' + escapeHtml(item.name) + '</span><span class="stats-item-right">' + streakHtml + '<span class="sum ' + sumClass + '">' + formatAmount(item.sum) + '</span></span>';
      listEl.appendChild(li);
    });
  }

  function bindStatsDetail() {
    var listEl = document.getElementById('stats-category-list');
    if (!listEl || listEl._statsDetailBound) return;
    listEl._statsDetailBound = true;
    listEl.addEventListener('click', function (e) {
      var li = e.target && e.target.closest && e.target.closest('.stats-category-item');
      if (!li) return;
      var key = li.getAttribute('data-key');
      var name = li.getAttribute('data-name');
      var statsType = document.querySelector('.stats-type-btn.active')?.getAttribute('data-type') || 'category';
      if (key != null && name != null) showDetailCard(name, statsType, key);
    });
  }

  function bindDetailClose() {
    var overlay = document.getElementById('stats-detail-overlay');
    if (!overlay) return;
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeDetailCard();
    });
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.stats = { renderStats: renderStats, closeDetailCard: closeDetailCard };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      bindDetailClose();
      bindStatsDetail();
    });
  } else {
    bindDetailClose();
    bindStatsDetail();
  }
})();
