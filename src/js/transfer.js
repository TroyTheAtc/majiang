/**
 * 导入/导出：JSON 文件导出与导入
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

  function isMobile() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  }

  function exportToFile() {
    var records = getRecords();
    var jsonStr = JSON.stringify(records, null, 2);
    var now = new Date();
    var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var filename = 'mahjong-records-' + dateStr + '.json';
    var a = document.createElement('a');
    a.download = filename;
    if (isMobile()) {
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      var blob = new Blob([jsonStr], { type: 'application/json' });
      a.href = URL.createObjectURL(blob);
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 2000);
    }
  }

  function importFromFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var text = reader.result;
      if (typeof text !== 'string') return;
      var arr;
      try {
        arr = JSON.parse(text);
      } catch (e) {
        alert('文件格式无效');
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
    };
    reader.readAsText(file, 'UTF-8');
  }

  function openTransferOverlay() {
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
    var btnExportFile = document.getElementById('btn-export-file');
    var btnImportFile = document.getElementById('btn-import-file');
    var inputImportFile = document.getElementById('input-import-file');

    if (btnOpenTransfer) btnOpenTransfer.addEventListener('click', openTransferOverlay);
    document.querySelectorAll('.close-transfer-btn').forEach(function (btn) {
      btn.addEventListener('click', closeTransferOverlay);
    });
    var mainOverlay = document.getElementById('transfer-overlay');
    if (mainOverlay) mainOverlay.addEventListener('click', function (e) {
      if (e.target === mainOverlay) closeTransferOverlay();
    });

    if (btnExportFile) btnExportFile.addEventListener('click', exportToFile);

    if (btnImportFile && inputImportFile) {
      btnImportFile.addEventListener('click', function () { inputImportFile.click(); });
      inputImportFile.addEventListener('change', function () {
        var f = inputImportFile.files && inputImportFile.files[0];
        if (f) importFromFile(f);
        inputImportFile.value = '';
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
