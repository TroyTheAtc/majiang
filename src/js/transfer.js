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
    /* 必须把 data 层的返回值透传出去：导入流程靠它判断是否真的写成功 */
    return data.saveRecords(records);
  }

  /**
   * 备份内容校验：只查"格式对不对"，不查"业务上合不合法"。
   *
   * 这里曾经有一条额外校验，要求记录里的对象必须存在于**当前**对象列表中。
   * 但删除对象不会清理历史记录，于是只要删过任何一个对象，之后导出的备份就必然
   * 带着它的名字，恢复时整份被拒（提示还只有一句"数据格式不符合要求"，看不出原因）。
   * **备份的意义就是能恢复**，这条必须去掉。
   *
   * 配置表只该管"录入时候选什么"，不该当作历史数据合法性的判据：
   * 删过的对象、改过名字的人，它们的旧记录都仍然合法。
   */
  function validateRecords(arr) {
    if (!Array.isArray(arr)) return false;
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      if (r == null || typeof r !== 'object') return false;
      if (typeof r.date !== 'string' || typeof r.category !== 'string') return false;
      if (r.amount !== undefined && typeof r.amount !== 'number') return false;
      if (r.stake !== undefined && r.stake !== null && typeof r.stake !== 'number') return false;
      if (r.dahu !== undefined && r.dahu !== null && typeof r.dahu !== 'string') return false;
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
        amount: r.amount != null ? Number(r.amount) : 0,
        /* 旧备份没有底注字段 → 归一成 0（未填），不报错也不丢其他字段 */
        stake: data.normalizeStake ? data.normalizeStake(r.stake) : 0,
        /* 今日大胡：旧备份没有 → 空串 */
        dahu: data.normalizeDahu ? data.normalizeDahu(r.dahu) : ''
      };
    });
  }

  var lastExportJson = '';
  /* 备份文本偏大时系统分享面板会卡住甚至失败，超过这个量就劝用户改走「存为文件」 */
  var SHARE_TEXT_MAX = 500 * 1024;

  function buildExportJson(pretty) {
    return JSON.stringify(buildExportPayload(), null, pretty ? 2 : 0);
  }

  function backupFileName() {
    return '麻将日记备份-' + data.todayStr() + '.json';
  }

  /* Web Share API 的门槛：https（或 localhost）+ 用户手势，缺一不可 */
  function canShare() {
    return !!(navigator.share && window.isSecureContext);
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

  /** 导出内容：战绩 + 命主档案（换设备不丢"命"） */
  function buildExportPayload() {
    var fate = window.MahjongApp && window.MahjongApp.fate;
    return {
      app: 'mahjong',
      version: data.APP_VERSION,
      exportedAt: new Date().toISOString(),
      fate: (fate && fate.getExportProfile) ? fate.getExportProfile() : null,
      records: getRecords()
    };
  }

  /** 导出成功：告诉备份模块记下日期并收起「该备份一下了」提示条 */
  function notifyExported() {
    var app = window.MahjongApp || {};
    if (app.backup && app.backup.markBackedUp) app.backup.markBackedUp();
  }

  function writeClipboard(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        notifyExported();
        alert(okMsg);
      }).catch(function () { alert('复制失败'); });
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      notifyExported();
      alert(okMsg);
    } catch (e) { alert('复制失败'); }
    document.body.removeChild(ta);
  }

  function doCopyJson(okMsg) {
    lastExportJson = buildExportJson(true);
    writeClipboard(lastExportJson, okMsg || '已复制到剪贴板');
  }

  /**
   * 分享备份（可直接存进备忘录）
   *
   * 网页没有任何接口能直接往备忘录里写数据，唯一的路是唤起系统分享面板，
   * 由用户在面板里选「备忘录」——iOS 上选完就新建一条笔记。
   * share() 必须在 click 的同步链里调用（要用户手势），所以它前面不能有 await。
   */
  function doShareText() {
    var json = buildExportJson(true);
    lastExportJson = json;

    if (!canShare()) {
      /* 微信内置浏览器、部分定制 ROM 会返回 undefined，退回剪贴板并说清下一步 */
      doCopyJson('这台浏览器的分享面板不可用，已改为复制，粘贴到备忘录即可');
      return;
    }
    if (json.length > SHARE_TEXT_MAX) {
      alert('战绩数据偏大（约 ' + Math.round(json.length / 1024) + 'KB），分享面板可能处理不了。请改用「存为文件」。');
      return;
    }
    /* 前面加一行说明，方便日后在备忘录里认出这是什么；导入时会自动跳过这行 */
    var text = '麻将日记备份 ' + data.todayStr() + '（整段粘贴回「粘贴导入」即可恢复）\n\n' + json;
    navigator.share({ title: '麻将日记备份 ' + data.todayStr(), text: text })
      .then(function () { notifyExported(); })
      .catch(function () { /* 用户取消：不算备份成功，不改日期也不打扰 */ });
  }

  /**
   * 存为文件
   *
   * 优先走分享面板的「存储到文件」（落进「文件」App，开了 iCloud 就自动同步，
   * 换手机也还在）；不支持时退回浏览器下载。
   * MIME 故意写 text/plain —— Safari 对可分享文件类型有白名单，
   * application/json 不在名单里会被 canShare 判否；扩展名仍是 .json，
   * 落到文件 App 后依旧是 json 文件。
   */
  function doSaveFile() {
    var file;
    try {
      file = new File([buildExportJson(true)], backupFileName(), { type: 'text/plain' });
    } catch (e) {
      alert('生成备份文件失败，请改用「复制 JSON」');
      return;
    }

    if (canShare() && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: file.name })
        .then(function () { notifyExported(); })
        .catch(function () {});
      return;
    }

    var url = '';
    try { url = URL.createObjectURL(file); } catch (e) {}
    if (!url) {
      alert('这台设备不支持保存文件，请改用「复制 JSON」');
      return;
    }
    var a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    notifyExported();
    alert('已保存备份文件：' + file.name);
  }

  /**
   * 从一段文字里抠出 JSON
   *
   * 用户从备忘录整段复制时，前后可能带着说明文字或被补了签名。
   * 合法 JSON 走这一步是空操作（首尾本来就是括号），所以可以无条件先过一遍。
   */
  function trimToJson(text) {
    var b = text.indexOf('[');
    var c = text.indexOf('{');
    var start = b === -1 ? c : (c === -1 ? b : Math.min(b, c));
    if (start < 0) return text;
    if (start > 0) text = text.slice(start);
    var end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
    if (end !== -1 && end < text.length - 1) text = text.slice(0, end + 1);
    return text;
  }

  /** 从文件恢复：与粘贴导入共用同一条校验/落库链路 */
  function onImportFileChange(e) {
    var input = e.target;
    var f = input && input.files && input.files[0];
    if (!f) return;
    var done = function () { if (input) input.value = ''; };
    if (!window.FileReader) {
      alert('这台设备不支持读取文件，请改用「粘贴导入」');
      done();
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      importFromJsonString(String(reader.result || ''));
      done();
    };
    reader.onerror = function () { alert('读取文件失败'); done(); };
    reader.readAsText(f);
  }

  /**
   * 兼容两种备份：
   *   旧版 → 纯记录数组 [ {...} ]
   *   新版 → { app, version, exportedAt, fate:{nick,birth}, records:[...] }
   */
  function importFromJsonString(text) {
    if (typeof text !== 'string') return;
    var trimmed = trimToJson(text.trim());
    if (!trimmed) {
      alert('没有可导入的内容');
      return;
    }
    var parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      alert('格式无效，请确认是完整的 JSON 数据');
      return;
    }
    var arr, fatePayload = null;
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.records)) {
      arr = parsed.records;
      fatePayload = parsed.fate || null;
    } else {
      alert('数据格式不符合要求');
      return;
    }
    if (!validateRecords(arr)) {
      alert('数据格式不符合要求');
      return;
    }
    /* 写不进去（存储满/被禁用）就别报"导入成功"——失败提示由 data.js 统一弹 */
    if (!saveRecords(normalizeRecords(arr))) return;
    if (fatePayload && window.MahjongApp && window.MahjongApp.fate) {
      window.MahjongApp.fate.applyImportProfile(fatePayload);
    }
    if (window.MahjongApp && window.MahjongApp.list && window.MahjongApp.list.renderList) window.MahjongApp.list.renderList();
    if (window.MahjongApp && window.MahjongApp.stats && window.MahjongApp.stats.renderStats) window.MahjongApp.stats.renderStats();
    if (window.MahjongApp && window.MahjongApp.app && window.MahjongApp.app.syncNick) window.MahjongApp.app.syncNick();
    if (window.MahjongApp && window.MahjongApp.backup && window.MahjongApp.backup.renderBanner) window.MahjongApp.backup.renderBanner();
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
    var btnExportShare = document.getElementById('btn-export-share');
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

    if (btnExportCopy) btnExportCopy.addEventListener('click', function () { doCopyJson(); });
    if (btnExportShare) btnExportShare.addEventListener('click', doShareText);
    if (btnExportFile) btnExportFile.addEventListener('click', doSaveFile);

    if (btnImportFile && inputImportFile) {
      btnImportFile.addEventListener('click', function () { inputImportFile.click(); });
      inputImportFile.addEventListener('change', onImportFileChange);
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
  window.MahjongApp.transfer = {
    openTransferOverlay: openTransferOverlay,
    closeTransferOverlay: closeTransferOverlay,
    buildExportJson: buildExportJson,
    backupFileName: backupFileName,
    trimToJson: trimToJson
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
