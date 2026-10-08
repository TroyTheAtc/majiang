/**
 * 入口：Tab、眼睛按钮、表单提交、初始化
 * 鸿蒙对应：EntryAbility、路由与全局 UI 状态
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  var view = window.MahjongApp && window.MahjongApp.view;
  var add = window.MahjongApp && window.MahjongApp.add;
  var list = window.MahjongApp && window.MahjongApp.list;
  var stats = window.MahjongApp && window.MahjongApp.stats;
  if (!data || !view || !add || !list) return;

  var switchView = view.switchView;
  var getRecords = data.getRecords;
  var getHideAmounts = data.getHideAmounts;
  var setHideAmounts = data.setHideAmounts;
  var addRecord = data.addRecord;
  var updateRecord = data.updateRecord;
  var getCategories = data.getCategories;
  var todayStr = data.todayStr;
  var renderList = list.renderList;
  var renderStats = stats ? stats.renderStats : function () {};
  var initForm = add.initForm;
  var backup = window.MahjongApp && window.MahjongApp.backup;
  var renderBanner = (backup && backup.renderBanner) || function () {};

  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var viewId = tab.getAttribute('data-view');
      if (viewId === 'add') initForm();
      switchView(viewId);
    });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.record-item')) return;
    if (list.clearShowDelete) list.clearShowDelete();
    if (e.target.closest('.category-chip') || e.target.closest('.category-add-btn')) return;
    if (add.clearCategoryShowDelete) add.clearCategoryShowDelete();
  });

  document.querySelectorAll('.stats-type-btn[data-type]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.stats-type-btn[data-type]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderStats();
    });
  });

  function updateEyeButton() {
    var hide = getHideAmounts();
    document.querySelectorAll('.btn-eye').forEach(function (btn) {
      var img = btn.querySelector('img');
      if (img) img.src = hide ? 'assets/images/eye-close.png' : 'assets/images/yanjing.png';
      btn.setAttribute('aria-label', hide ? '显示金额' : '隐藏金额');
    });
  }

  document.querySelectorAll('.btn-eye').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setHideAmounts(!getHideAmounts());
      updateEyeButton();
      renderList();
      renderStats();
    });
  });

  document.getElementById('form-add').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var winloss = (form.querySelector('[name="winloss"]:checked') || {}).value;
    var amount = parseInt(form.amount.value, 10) || 0;
    if (winloss === 'loss') amount = -amount;
    var formData = {
      date: form.date.value,
      category: (form.querySelector('[name="category"]:checked') || {}).value || (getCategories()[0] || ''),
      location: form.location.value,
      amount: amount,
      stake: data.normalizeStake(form.stake.value),
      dahu: data.normalizeDahu(form.dahu.value)
    };
    /* 写不进去（存储写满 / 无痕模式禁用）时保留表单与编辑态，让用户先备份再重试；
       失败提示由 data.js 统一弹出，这里不重复。 */
    var editingId = add.getEditingId();
    var saved = editingId ? updateRecord(editingId, formData) : addRecord(formData);
    if (!saved) return;
    if (formData.stake > 0) data.setLastStake(formData.stake);
    add.setEditingId(null);
    form.reset();
    form.date.value = todayStr();
    renderList();
    renderStats();
    renderBanner();
    switchView('list');
  });

  var dateInput = document.querySelector('[name="date"]');
  if (dateInput) dateInput.value = todayStr();

  /* 清理历史遗留键：早期版本用它记住"上次查看的日期"，会让占卜页跨天仍停在前一天。
     现在改为每次进入占卜页都按今天渲染，这个键不再使用。 */
  try { localStorage.removeItem('divine_last_date'); } catch (e) {}

  var viewDivine = document.getElementById('view-divine');
  if (viewDivine) {
    viewDivine.addEventListener('change', function (e) {
      if (e.target.id === 'divine-date-picker') {
        var v = e.target.value;
        if (v && window.MahjongApp && window.MahjongApp.divine) {
          window.MahjongApp.divine.renderDivine(v);
        }
      }
    });
  }

  /* ---------- 昵称与版本号 ---------- */
  /** 把命主昵称同步到页头、浏览器标题与主屏图标名（昵称可在占卜页「命主设置」里改） */
  function syncNick() {
    var fate = window.MahjongApp && window.MahjongApp.fate;
    var nick = (fate && fate.getNick) ? fate.getNick() : '老婆';
    var node = document.getElementById('logo-nick');
    if (node) node.textContent = nick;
    var title = nick + '的麻将日记';
    document.title = title;
    var meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (meta) meta.setAttribute('content', title);
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.app = { syncNick: syncNick };

  updateEyeButton();
  renderList();
  renderBanner();
  syncNick();
  var versionNode = document.getElementById('app-version');
  if (versionNode) versionNode.textContent = 'v' + data.APP_VERSION;
})();
