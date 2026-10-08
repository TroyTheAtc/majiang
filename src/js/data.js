/**
 * 数据层：存储、记录 CRUD、格式化、工具
 * 鸿蒙对应：model/Record.ets、首选项或关系型数据库
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'mahjong_records';
  const HIDE_AMOUNTS_KEY = 'mahjong_hide_amounts';
  const CATEGORIES_KEY = 'mahjong_categories';
  const LAST_STAKE_KEY = 'mahjong_last_stake';
  const DEFAULT_CATEGORIES = ['机场', '家人', '同事', '同学', '朋友'];

  /** 资源版本号：改版本时此处与 index.html 的 ?v= 同步（index.html 无构建，无法自动注入） */
  const APP_VERSION = '2.1.1';

  /**
   * 本地时区的 YYYY-MM-DD。
   * 不能用 new Date().toISOString().slice(0,10)：那是 UTC 日期，
   * 北京时间 00:00–08:00 会得到"昨天"。
   */
  function todayStr(base) {
    var d = base ? new Date(base) : new Date();
    if (isNaN(d.getTime())) return '';
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  function getCategories() {
    try {
      var raw = localStorage.getItem(CATEGORIES_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch (e) {}
    return DEFAULT_CATEGORIES.slice();
  }

  /**
   * 本地存储写入失败提示（每次会话只弹一次，避免连点刷屏）。
   * localStorage 失败并不罕见：配额写满、Safari 无痕、隐私模式禁用站点数据都会抛异常。
   * 不 catch 的话异常会往上冒，调用方以为存成功了 —— 数据就静默丢了。
   */
  var saveFailureNotified = false;
  function notifySaveFailure() {
    if (saveFailureNotified) return;
    saveFailureNotified = true;
    try {
      alert('保存失败：本机浏览器存储不可用或已写满。\n建议先用「数据导入/导出」导出一份备份，再清理空间/退出无痕模式后重试。');
    } catch (e) {}
  }

  function saveCategories(arr) {
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(arr));
      return true;
    } catch (e) {
      notifySaveFailure();
      return false;
    }
  }

  function addCategory(name) {
    var s = (name || '').trim();
    if (!s) return false;
    var cats = getCategories();
    if (cats.indexOf(s) !== -1) return false;
    cats.push(s);
    saveCategories(cats);
    return true;
  }

  function removeCategory(name) {
    var cats = getCategories();
    if (cats.length <= 1) return false;
    var idx = cats.indexOf(name);
    if (idx === -1) return false;
    cats.splice(idx, 1);
    saveCategories(cats);
    return true;
  }

  /**
   * 底注（每底的金额）。0 表示"没填"。
   *
   * 为什么要有这个字段：+500 在 5 元底的桌和 50 元底的桌完全不是一回事，
   * 没有它，所有按金额的统计都把不同量级的牌局混在一起算。
   *
   * 允许小数（2.5 / 0.5 这种底注是真实存在的），保留两位小数：
   * 一是和输入框 step="0.01" 对齐，二是防止浮点噪声（2.5 存成 2.5000000000000004）
   * 把「按底注统计」的分组键拆成两组。
   */
  function normalizeStake(v) {
    const n = Number(v);
    if (!(n > 0) || !isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  }

  /**
   * 今日大胡：一行自由文本（如"清一色、碰碰胡"），留空表示没记。
   *
   * 为什么不做成"有/无"开关或多选：大胡的牌型各地叫法不一（清一色 / 碰碰胡 /
   * 十三幺 / 大三元……），写死选项一定漏；让人自己填一句最省事，也不会因为
   * 选项不匹配而记不下去。长度截到 DAHU_MAX，避免一条备注把列表撑爆。
   */
  const DAHU_MAX = 40;

  function normalizeDahu(v) {
    if (v == null) return '';
    return String(v).replace(/\s+/g, ' ').trim().slice(0, DAHU_MAX);
  }

  /** 上次用过的底注：搓一把时预填，省得每次重输（大概率就一直打同一个底） */
  function getLastStake() {
    try {
      return normalizeStake(localStorage.getItem(LAST_STAKE_KEY));
    } catch (e) {
      return 0;
    }
  }

  function setLastStake(v) {
    const n = normalizeStake(v);
    if (!n) return;
    try {
      localStorage.setItem(LAST_STAKE_KEY, String(n));
    } catch (e) {}
  }

  function getHideAmounts() {
    try {
      return localStorage.getItem(HIDE_AMOUNTS_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setHideAmounts(hide) {
    try {
      localStorage.setItem(HIDE_AMOUNTS_KEY, hide ? '1' : '0');
    } catch (e) {}
  }

  function getRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  /** 写入战绩。返回是否真的写进去了，调用方据此决定要不要清空表单（失败时保留，别让用户白填） */
  function saveRecords(records) {
    var raw;
    try {
      raw = JSON.stringify(records);
    } catch (e) {
      notifySaveFailure();
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY, raw);
      return true;
    } catch (e) {
      notifySaveFailure();
      return false;
    }
  }

  function addRecord(record) {
    const list = getRecords();
    list.unshift({
      id: String(Date.now()),
      date: record.date,
      category: record.category,
      location: (record.location || '').trim(),
      amount: record.amount,
      stake: normalizeStake(record.stake),
      dahu: normalizeDahu(record.dahu)
    });
    return saveRecords(list);
  }

  function deleteRecord(id) {
    let list = getRecords();
    list = list.filter(function (r) { return r.id !== id; });
    return saveRecords(list);
  }

  function updateRecord(id, record) {
    const list = getRecords();
    const idx = list.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return false;
    list[idx] = {
      id: id,
      date: record.date,
      category: record.category,
      location: (record.location || '').trim(),
      amount: record.amount,
      stake: normalizeStake(record.stake),
      dahu: normalizeDahu(record.dahu)
    };
    return saveRecords(list);
  }

  function formatAmount(n) {
    if (getHideAmounts()) return '***';
    const num = Number(n);
    if (num > 0) return '+' + num;
    if (num < 0) return String(num);
    return '0';
  }

  function recordsThisYear(records) {
    var y = new Date().getFullYear();
    return records.filter(function (r) {
      var ry = (r.date || '').slice(0, 4);
      return ry === String(y);
    });
  }

  /* 同时转义引号：多处把它用在 value="..." / data-xxx="..." 属性里，
     只转 & < > 的话，名称里带引号会撑破属性（用户可自定义"对象"名称）。 */
  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (ch) { return ESCAPE_MAP[ch]; });
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.data = {
    STORAGE_KEY: STORAGE_KEY,
    HIDE_AMOUNTS_KEY: HIDE_AMOUNTS_KEY,
    CATEGORIES_KEY: CATEGORIES_KEY,
    LAST_STAKE_KEY: LAST_STAKE_KEY,
    APP_VERSION: APP_VERSION,
    todayStr: todayStr,
    getCategories: getCategories,
    saveCategories: saveCategories,
    addCategory: addCategory,
    removeCategory: removeCategory,
    DAHU_MAX: DAHU_MAX,
    normalizeStake: normalizeStake,
    normalizeDahu: normalizeDahu,
    getLastStake: getLastStake,
    setLastStake: setLastStake,
    getHideAmounts: getHideAmounts,
    setHideAmounts: setHideAmounts,
    getRecords: getRecords,
    saveRecords: saveRecords,
    notifySaveFailure: notifySaveFailure,
    addRecord: addRecord,
    deleteRecord: deleteRecord,
    updateRecord: updateRecord,
    formatAmount: formatAmount,
    recordsThisYear: recordsThisYear,
    escapeHtml: escapeHtml
  };
})();
