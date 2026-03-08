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

  var lastExportJson = '';

  function isMobile() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  }

  function hideExportLinkWrap() {
    var wrap = document.getElementById('transfer-export-link-wrap');
    if (wrap) wrap.style.display = 'none';
  }

  function exportToFile() {
    var records = getRecords();
    var jsonStr = JSON.stringify(records, null, 2);
    var now = new Date();
    var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var filename = 'mahjong-records-' + dateStr + '.json';
    if (isMobile()) {
      lastExportJson = jsonStr;
      var wrap = document.getElementById('transfer-export-link-wrap');
      var link = document.getElementById('transfer-export-link');
      if (wrap && link) {
        link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
        link.download = filename;
        link.textContent = filename;
        link.setAttribute('download', filename);
        wrap.style.display = 'block';
      }
    } else {
      var a = document.createElement('a');
      a.download = filename;
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
    hideExportLinkWrap();
    var overlay = document.getElementById('transfer-overlay');
    if (overlay) {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeTransferOverlay() {
    hideExportLinkWrap();
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

    var btnExportCopy = document.getElementById('btn-export-copy');
    if (btnExportCopy) btnExportCopy.addEventListener('click', function () {
      if (!lastExportJson) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastExportJson).then(function () { alert('已复制到剪贴板'); }).catch(function () { alert('复制失败'); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = lastExportJson;
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
    });

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
