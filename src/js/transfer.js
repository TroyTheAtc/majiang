/**
 * 导入/导出：JSON 文件导出与导入（含鸿蒙 / iOS 适配）
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
  var lastExportUrl = '';
  var isExporting = false;

  function isMobile() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  }

  function isWechat() {
    return /MicroMessenger/i.test(navigator.userAgent);
  }

  function isHarmonyOS() {
    return /HarmonyOS|HMOS|OpenHarmony/i.test(navigator.userAgent);
  }

  function isIOS() {
    if (isHarmonyOS()) return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function hideExportLinkWrap() {
    var wrap = document.getElementById('transfer-export-link-wrap');
    if (wrap) wrap.style.display = 'none';
  }

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

  function revokeLastExportUrl() {
    if (lastExportUrl) {
      try { URL.revokeObjectURL(lastExportUrl); } catch (e) {}
      lastExportUrl = '';
    }
  }

  function attemptDownload(url, filename) {
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    try {
      if (typeof MouseEvent === 'function') {
        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      } else {
        a.click();
      }
    } catch (e) {
      a.click();
    }
    setTimeout(function () {
      if (a.parentNode) document.body.removeChild(a);
    }, 2000);
  }

  function showCopyOnly(message) {
    var wrap = document.getElementById('transfer-export-link-wrap');
    var hint = wrap ? wrap.querySelector('.transfer-export-hint') : null;
    var link = document.getElementById('transfer-export-link');
    var copyBtn = document.getElementById('btn-export-copy');
    if (wrap) wrap.style.display = 'block';
    if (hint) hint.textContent = message;
    if (link) link.style.display = 'none';
    if (copyBtn) {
      copyBtn.style.display = 'block';
      copyBtn.textContent = '复制 JSON 文本';
      setTimeout(function () { try { copyBtn.click(); } catch (e) {} }, 300);
    }
  }

  function trySystemShare(url, jsonStr, filename) {
    if (!navigator.share) return false;
    try {
      var file = new File([jsonStr], filename, { type: 'application/json' });
      if (!navigator.canShare || !navigator.canShare({ files: [file] })) return false;
      navigator.share({
        files: [file],
        title: '麻将日记备份',
        text: '我的麻将记录备份'
      }).then(function () {
        alert('已分享');
        URL.revokeObjectURL(url);
        lastExportUrl = '';
        isExporting = false;
        closeTransferOverlay();
        if (window.MahjongApp && window.MahjongApp.view && window.MahjongApp.view.switchView) window.MahjongApp.view.switchView('list');
      }).catch(function () {
        setTimeout(function () {
          isExporting = false;
          revokeLastExportUrl();
        }, 60000);
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function doExportFallback(url, filename, hintText) {
    if (isMobile()) {
      var wrap = document.getElementById('transfer-export-link-wrap');
      var hint = wrap ? wrap.querySelector('.transfer-export-hint') : null;
      var link = document.getElementById('transfer-export-link');
      var copyBtn = document.getElementById('btn-export-copy');
      if (wrap) wrap.style.display = 'block';
      if (hint) hint.textContent = hintText || '正在尝试下载，若未成功请使用：';
      if (copyBtn) {
        copyBtn.style.display = 'block';
        copyBtn.textContent = '复制 JSON 文本（粘贴到备忘录保存）';
      }
      if (link) {
        link.href = url;
        link.download = filename;
        link.textContent = '点击下载 ' + filename;
        link.style.display = '';
      }
      setTimeout(function () { attemptDownload(url, filename); }, 300);
      setTimeout(function () {
        isExporting = false;
        revokeLastExportUrl();
      }, 60000);
      setTimeout(function () {
        closeTransferOverlay();
        if (window.MahjongApp && window.MahjongApp.view && window.MahjongApp.view.switchView) window.MahjongApp.view.switchView('list');
      }, 2000);
    } else {
      attemptDownload(url, filename);
      setTimeout(function () {
        URL.revokeObjectURL(url);
        lastExportUrl = '';
        isExporting = false;
        closeTransferOverlay();
        if (window.MahjongApp && window.MahjongApp.view && window.MahjongApp.view.switchView) window.MahjongApp.view.switchView('list');
      }, 2000);
    }
  }

  function exportToFile() {
    var records = getRecords();
    var jsonStr = JSON.stringify(records, null, 2);
    var dateStr = new Date().toISOString().slice(0, 10);
    var filename = 'mahjong-records-' + dateStr + '.json';
    lastExportJson = jsonStr;
    isExporting = true;
    revokeLastExportUrl();

    var blob = new Blob([jsonStr], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    lastExportUrl = url;

    setTimeout(function () { isExporting = false; }, 60000);

    if (isWechat()) {
      showCopyOnly('微信内限制自动下载，请复制文本后粘贴保存');
      URL.revokeObjectURL(url);
      lastExportUrl = '';
      isExporting = false;
      return;
    }

    if (isIOS()) {
      showCopyOnly('iOS 设备请使用「复制」或「分享」功能');
      trySystemShare(url, jsonStr, filename);
      return;
    }

    if (isHarmonyOS()) {
      if (trySystemShare(url, jsonStr, filename)) return;
      doExportFallback(url, filename, '鸿蒙设备：点击下载，或长按链接保存');
      return;
    }

    if (isMobile() && trySystemShare(url, jsonStr, filename)) return;

    doExportFallback(url, filename, '正在尝试下载，若未成功请使用：');
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

  function importFromFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      importFromJsonString(reader.result);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function openTransferOverlay() {
    revokeLastExportUrl();
    hideExportLinkWrap();
    hideImportPasteWrap();
    isExporting = false;
    var overlay = document.getElementById('transfer-overlay');
    if (overlay) {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeTransferOverlay() {
    hideExportLinkWrap();
    if (lastExportUrl && !isExporting) setTimeout(revokeLastExportUrl, 1000);
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
