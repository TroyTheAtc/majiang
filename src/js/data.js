/**
 * 数据层：存储、记录 CRUD、格式化、工具
 * 鸿蒙对应：model/Record.ets、首选项或关系型数据库
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'mahjong_records';
  const HIDE_AMOUNTS_KEY = 'mahjong_hide_amounts';
  const CATEGORIES_KEY = 'mahjong_categories';
  const DEFAULT_CATEGORIES = ['机场', '家人', '同事', '同学', '朋友'];

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

  function saveCategories(arr) {
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(arr));
    } catch (e) {}
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

  function getHideAmounts() {
    return localStorage.getItem(HIDE_AMOUNTS_KEY) === '1';
  }

  function setHideAmounts(hide) {
    localStorage.setItem(HIDE_AMOUNTS_KEY, hide ? '1' : '0');
  }

  function getRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function addRecord(record) {
    const list = getRecords();
    list.unshift({
      id: String(Date.now()),
      date: record.date,
      category: record.category,
      location: (record.location || '').trim(),
      amount: record.amount
    });
    saveRecords(list);
  }

  function deleteRecord(id) {
    let list = getRecords();
    list = list.filter(function (r) { return r.id !== id; });
    saveRecords(list);
  }

  function updateRecord(id, record) {
    const list = getRecords();
    const idx = list.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return;
    list[idx] = {
      id: id,
      date: record.date,
      category: record.category,
      location: (record.location || '').trim(),
      amount: record.amount
    };
    saveRecords(list);
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

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.data = {
    STORAGE_KEY: STORAGE_KEY,
    HIDE_AMOUNTS_KEY: HIDE_AMOUNTS_KEY,
    CATEGORIES_KEY: CATEGORIES_KEY,
    getCategories: getCategories,
    saveCategories: saveCategories,
    addCategory: addCategory,
    removeCategory: removeCategory,
    getHideAmounts: getHideAmounts,
    setHideAmounts: setHideAmounts,
    getRecords: getRecords,
    saveRecords: saveRecords,
    addRecord: addRecord,
    deleteRecord: deleteRecord,
    updateRecord: updateRecord,
    formatAmount: formatAmount,
    recordsThisYear: recordsThisYear,
    escapeHtml: escapeHtml
  };
})();
