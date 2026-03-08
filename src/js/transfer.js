/**
 * 导入/导出：二维码生成与扫码、文件导出/导入
 * 单码不分片；数据过大时提示使用「导出为文件」
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  if (!data) return;

  var PAYLOAD_MAX = 2000;

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

  function showQRModal() {
    var records = getRecords();
    var json = JSON.stringify(records);
    var compressed = '';
    if (typeof LZString !== 'undefined') {
      compressed = LZString.compressToEncodedURIComponent(json);
    } else {
      compressed = encodeURIComponent(json);
    }

    var overlay = document.getElementById('transfer-qr-overlay');
    var container = document.getElementById('transfer-qr-container');
    var tooLarge = document.getElementById('transfer-qr-too-large');
    if (!overlay || !container) return;

    container.innerHTML = '';
    tooLarge.style.display = 'none';

    if (compressed.length > PAYLOAD_MAX) {
      tooLarge.style.display = 'block';
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      return;
    }

    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(container, {
          text: compressed,
          width: 220,
          height: 220,
          colorDark: '#000000',
          colorLight: '#ffffff'
        });
      } catch (err) {
        tooLarge.style.display = 'block';
      }
    } else {
      tooLarge.style.display = 'block';
    }
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeQRModal() {
    var overlay = document.getElementById('transfer-qr-overlay');
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function exportToFile() {
    var records = getRecords();
    var blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mahjong-records.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importFromPayload(str) {
    if (!str || typeof str !== 'string') return false;
    var json = '';
    if (typeof LZString !== 'undefined') {
      json = LZString.decompressFromEncodedURIComponent(str);
      if (!json) json = decodeURIComponent(str);
    } else {
      try {
        json = decodeURIComponent(str);
      } catch (e) {
        json = str;
      }
    }
    if (!json) return false;
    var arr;
    try {
      arr = JSON.parse(json);
    } catch (e) {
      return false;
    }
    if (!validateRecords(arr)) return false;
    saveRecords(normalizeRecords(arr));
    return true;
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

  var scanStream = null;
  var scanAnimationId = null;

  function stopScan() {
    if (scanAnimationId) {
      cancelAnimationFrame(scanAnimationId);
      scanAnimationId = null;
    }
    if (scanStream && scanStream.getTracks) {
      scanStream.getTracks().forEach(function (t) { t.stop(); });
      scanStream = null;
    }
    var video = document.getElementById('transfer-scan-video');
    if (video && video.srcObject) {
      video.srcObject = null;
    }
  }

  function closeScanModal() {
    stopScan();
    var overlay = document.getElementById('transfer-scan-overlay');
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function openTransferOverlay() {
    var overlay = document.getElementById('transfer-overlay');
    if (overlay) {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeTransferOverlay() {
    closeQRModal();
    closeScanModal();
    var overlay = document.getElementById('transfer-overlay');
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function tryDecodeFromImageData(imageData) {
    if (typeof jsQR === 'undefined') return null;
    return jsQR(imageData.data, imageData.width, imageData.height);
  }

  function onScanSuccess(payload) {
    closeScanModal();
    if (importFromPayload(payload)) {
      if (window.MahjongApp && window.MahjongApp.list && window.MahjongApp.list.renderList) window.MahjongApp.list.renderList();
      if (window.MahjongApp && window.MahjongApp.stats && window.MahjongApp.stats.renderStats) window.MahjongApp.stats.renderStats();
      if (window.MahjongApp && window.MahjongApp.view && window.MahjongApp.view.switchView) window.MahjongApp.view.switchView('list');
      alert('导入成功');
    } else {
      alert('无法识别或数据无效');
    }
  }

  function tickScan() {
    var video = document.getElementById('transfer-scan-video');
    var canvas = document.getElementById('transfer-scan-canvas');
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      scanAnimationId = requestAnimationFrame(tickScan);
      return;
    }
    var w = video.videoWidth;
    var h = video.videoHeight;
    if (w && h) {
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      var imageData = ctx.getImageData(0, 0, w, h);
      var code = tryDecodeFromImageData(imageData);
      if (code && code.data) {
        onScanSuccess(code.data);
        return;
      }
    }
    scanAnimationId = requestAnimationFrame(tickScan);
  }

  function startCamera() {
    var video = document.getElementById('transfer-scan-video');
    if (!video) return;
    stopScan();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('当前浏览器不支持摄像头，请使用「选择图片」导入');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (stream) {
        scanStream = stream;
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        video.play();
        tickScan();
      })
      .catch(function (err) {
        alert('无法使用摄像头：' + (err.message || '请使用「选择图片」导入'));
      });
  }

  function showScanModal() {
    var overlay = document.getElementById('transfer-scan-overlay');
    if (overlay) {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      startCamera();
    }
  }

  function decodeFromFile(file) {
    if (!file || typeof URL === 'undefined') return;
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      var canvas = document.getElementById('transfer-scan-canvas');
      if (!canvas) {
        URL.revokeObjectURL(url);
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      var imageData = ctx.getImageData(0, 0, img.width, img.height);
      var code = tryDecodeFromImageData(imageData);
      URL.revokeObjectURL(url);
      if (code && code.data) {
        onScanSuccess(code.data);
      } else {
        alert('未识别到有效二维码');
      }
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      alert('图片加载失败');
    };
    img.src = url;
  }

  function bind() {
    var btnOpenTransfer = document.getElementById('btn-open-transfer');
    var btnExportQr = document.getElementById('btn-export-qr');
    var btnImportScan = document.getElementById('btn-import-scan');
    var btnExportFile = document.getElementById('btn-export-file');
    var btnImportFile = document.getElementById('btn-import-file');
    var inputImportFile = document.getElementById('input-import-file');
    var btnScanChooseImage = document.getElementById('btn-scan-choose-image');
    var inputScanImage = document.getElementById('input-scan-image');

    if (btnOpenTransfer) btnOpenTransfer.addEventListener('click', openTransferOverlay);
    document.querySelectorAll('.close-transfer-btn').forEach(function (btn) {
      btn.addEventListener('click', closeTransferOverlay);
    });
    var mainOverlay = document.getElementById('transfer-overlay');
    if (mainOverlay) mainOverlay.addEventListener('click', function (e) {
      if (e.target === mainOverlay) closeTransferOverlay();
    });

    if (btnExportQr) btnExportQr.addEventListener('click', showQRModal);
    if (btnExportFile) btnExportFile.addEventListener('click', exportToFile);
    if (btnImportScan) btnImportScan.addEventListener('click', showScanModal);

    if (btnImportFile && inputImportFile) {
      btnImportFile.addEventListener('click', function () { inputImportFile.click(); });
      inputImportFile.addEventListener('change', function () {
        var f = inputImportFile.files && inputImportFile.files[0];
        if (f) importFromFile(f);
        inputImportFile.value = '';
      });
    }

    document.querySelectorAll('.transfer-modal-close').forEach(function (btn) {
      btn.addEventListener('click', closeQRModal);
    });
    document.getElementById('transfer-qr-overlay') && document.getElementById('transfer-qr-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeQRModal();
    });

    document.querySelectorAll('.transfer-scan-close').forEach(function (btn) {
      btn.addEventListener('click', closeScanModal);
    });
    document.getElementById('transfer-scan-overlay') && document.getElementById('transfer-scan-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeScanModal();
    });

    if (btnScanChooseImage && inputScanImage) {
      btnScanChooseImage.addEventListener('click', function () { inputScanImage.click(); });
      inputScanImage.addEventListener('change', function () {
        var f = inputScanImage.files && inputScanImage.files[0];
        if (f) decodeFromFile(f);
        inputScanImage.value = '';
      });
    }
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.transfer = { showQRModal: showQRModal, closeQRModal: closeQRModal, closeScanModal: closeScanModal, openTransferOverlay: openTransferOverlay, closeTransferOverlay: closeTransferOverlay };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
