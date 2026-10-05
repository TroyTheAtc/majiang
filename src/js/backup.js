/**
 * 备份提醒
 *
 * 数据只存在本机浏览器的 localStorage 里（按域名隔离）：清「网站数据」、换手机、
 * 换浏览器都会一次性丢光，且无痕模式下关窗即清。这里做一层温和的提醒：
 * 距上次导出超过 INTERVAL_DAYS 天（或从未导出过）就在页面顶部提示一次，
 * 点「稍后」搁置 SNOOZE_DAYS 天，导出成功由 transfer.js 调 markBackedUp() 收尾。
 *
 * 鸿蒙对应：首选项 + 定期提醒（或直接改为云端同步）
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  if (!data) return;

  var LAST_KEY = 'mahjong_last_backup';
  var SNOOZE_KEY = 'mahjong_backup_snooze';
  var INTERVAL_DAYS = 14;
  var SNOOZE_DAYS = 3;

  function read(key) {
    try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function drop(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  /** 两个 YYYY-MM-DD 之间差多少天；解析失败返回 Infinity（当作"很久没备份"） */
  function dayDiff(fromStr, toStr) {
    var a = new Date(fromStr + 'T00:00:00');
    var b = new Date(toStr + 'T00:00:00');
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return Infinity;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function daysLater(baseStr, n) {
    var d = new Date(baseStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + n);
    return data.todayStr(d.getTime());
  }

  function getLastBackup() {
    return read(LAST_KEY);
  }

  function isSnoozed() {
    var until = read(SNOOZE_KEY);
    return !!until && data.todayStr() < until;
  }

  /** 有数据 + 未搁置 +（从未导出 或 距上次导出 ≥ INTERVAL_DAYS 天）→ 该提醒 */
  function shouldRemind() {
    if (data.getRecords().length <= 0) return false;
    if (isSnoozed()) return false;
    var last = getLastBackup();
    return !last || dayDiff(last, data.todayStr()) >= INTERVAL_DAYS;
  }

  function bannerEl() {
    return document.getElementById('backup-banner');
  }

  function hideBanner() {
    var el = bannerEl();
    if (el) el.hidden = true;
  }

  function renderBanner() {
    var el = bannerEl();
    if (!el) return;
    if (!shouldRemind()) {
      el.hidden = true;
      return;
    }
    var sub = document.getElementById('backup-banner-sub');
    if (sub) {
      var last = getLastBackup();
      var when = last
        ? '上次备份在 ' + last + '，已经 ' + dayDiff(last, data.todayStr()) + ' 天了'
        : '还没有备份过';
      sub.textContent = '战绩只存在这台设备里，清除网站数据或换手机都会丢。' + when + '，建议导出一份存到微信收藏或备忘录。';
    }
    el.hidden = false;
  }

  /** 导出成功时调用：记下日期、清掉搁置、收起提示条 */
  function markBackedUp() {
    write(LAST_KEY, data.todayStr());
    drop(SNOOZE_KEY);
    hideBanner();
  }

  /** 稍后再说：搁置 SNOOZE_DAYS 天 */
  function snooze() {
    var until = daysLater(data.todayStr(), SNOOZE_DAYS);
    if (until) write(SNOOZE_KEY, until);
    hideBanner();
  }

  /** 去备份：切到「算账」页并打开导入/导出弹层（弹层挂在该视图内） */
  function goBackup() {
    var app = window.MahjongApp || {};
    if (app.view && app.view.switchView) app.view.switchView('stats');
    if (app.transfer && app.transfer.openTransferOverlay) app.transfer.openTransferOverlay();
  }

  function bind() {
    var go = document.getElementById('backup-banner-go');
    var later = document.getElementById('backup-banner-later');
    if (go) go.addEventListener('click', goBackup);
    if (later) later.addEventListener('click', snooze);
    renderBanner();
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.backup = {
    INTERVAL_DAYS: INTERVAL_DAYS,
    SNOOZE_DAYS: SNOOZE_DAYS,
    renderBanner: renderBanner,
    hideBanner: hideBanner,
    shouldRemind: shouldRemind,
    getLastBackup: getLastBackup,
    markBackedUp: markBackedUp,
    snooze: snooze
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
