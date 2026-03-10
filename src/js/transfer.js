/**
 * 导入/导出：仅复制 JSON 导出、粘贴导入
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  if (!data) return;

  function getRecords() {
    return data.getRecords();
  }
  function saveRecords(records) {
    data.saveRecords(records);
  }

  function validateRecords(arr) {
    if (!Array.isArray(arr)) return false;
    var cats = (data.getCategories && data.getCategories()) || [];
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      if (r == null || typeof r !== 'object') return false;
      if (typeof r.date !== 'string' || typeof r.category !== 'string') return false;
      if (r.amount !== undefined && typeof r.amount !== 'number') return false;
      if (cats.indexOf(r.category) === -1) return false;
    }
    return true;
  }

  function normalizeRecords(arr) {
    return arr.map(function (r, i) {
      return {
        id: r.id && String(r.id) ? String(r.id) : 'imp_' + Date.now() + '_' + i,
        date: String(r.date || '').slice(0, 10),
        category: String(r.category || ''),
        location: typeof r.location === 'string' ? r.location.trim() : '',
        amount: r.amount != null ? Number(r.amount) : 0
      };
    });
  }

  var lastExportJson = '';

  function hideImportPasteWrap() {
    var wrap = document.getElementById('transfer-import-paste-wrap');
    var ta = document.getElementById('input-import-paste');
    if (wrap) wrap.style.display = 'none';
    if (ta) ta.value = '';
  }

  function showImportPasteWrap() {
    var wrap = document.getElementById('transfer-import-paste-wrap');
    var ta = document.getElementById('input-import-paste');
    if (wrap) wrap.style.display = 'block';
    if (ta) { ta.value = ''; ta.focus(); }
  }

  function doCopyJson() {
    var records = getRecords();
    var jsonStr = JSON.stringify(records, null, 2);
    lastExportJson = jsonStr;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonStr).then(function () { alert('已复制到剪贴板'); }).catch(function () { alert('复制失败'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = jsonStr;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        alert('已复制到剪贴板');
      } catch (e) { alert('复制失败'); }
      document.body.removeChild(ta);
    }
  }

  function importFromJsonString(text) {
    if (typeof text !== 'string') return;
    var trimmed = text.trim();
    if (!trimmed) {
      alert('没有可导入的内容');
      return;
    }
    var arr;
    try {
      arr = JSON.parse(trimmed);
    } catch (e) {
      alert('格式无效，请确认是完整的 JSON 数据');
      return;
    }
    if (!validateRecords(arr)) {
      alert('数据格式不符合要求');
      return;
    }
    saveRecords(normalizeRecords(arr));
    if (window.MahjongApp && window.MahjongApp.list && window.MahjongApp.list.renderList) window.MahjongApp.list.renderList();
    if (window.MahjongApp && window.MahjongApp.stats && window.MahjongApp.stats.renderStats) window.MahjongApp.stats.renderStats();
    if (window.MahjongApp && window.MahjongApp.view && window.MahjongApp.view.switchView) window.MahjongApp.view.switchView('list');
    alert('导入成功');
  }

  function openTransferOverlay() {
    hideImportPasteWrap();
    var overlay = document.getElementById('transfer-overlay');
    if (overlay) {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeTransferOverlay() {
    var overlay = document.getElementById('transfer-overlay');
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function bind() {
    var btnOpenTransfer = document.getElementById('btn-open-transfer');
    var btnExportCopy = document.getElementById('btn-export-copy');

    if (btnOpenTransfer) btnOpenTransfer.addEventListener('click', openTransferOverlay);
    document.querySelectorAll('.close-transfer-btn').forEach(function (btn) {
      btn.addEventListener('click', closeTransferOverlay);
    });
    var mainOverlay = document.getElementById('transfer-overlay');
    if (mainOverlay) mainOverlay.addEventListener('click', function (e) {
      if (e.target === mainOverlay) closeTransferOverlay();
    });

    if (btnExportCopy) btnExportCopy.addEventListener('click', doCopyJson);

    var btnImportPaste = document.getElementById('btn-import-paste');
    var inputImportPaste = document.getElementById('input-import-paste');
    var btnImportPasteConfirm = document.getElementById('btn-import-paste-confirm');
    if (btnImportPaste) {
      btnImportPaste.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(function (t) {
            if (t && t.trim()) {
              importFromJsonString(t);
            } else {
              showImportPasteWrap();
            }
          }).catch(function () { showImportPasteWrap(); });
        } else {
          showImportPasteWrap();
        }
      });
    }
    if (btnImportPasteConfirm && inputImportPaste) {
      btnImportPasteConfirm.addEventListener('click', function () {
        importFromJsonString(inputImportPaste.value);
        hideImportPasteWrap();
      });
    }
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.transfer = { openTransferOverlay: openTransferOverlay, closeTransferOverlay: closeTransferOverlay };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
