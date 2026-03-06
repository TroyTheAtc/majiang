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
  var CATEGORIES = data.CATEGORIES;
  var renderList = list.renderList;
  var renderStats = stats ? stats.renderStats : function () {};
  var initForm = add.initForm;

  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var viewId = tab.getAttribute('data-view');
      if (viewId === 'add') initForm();
      switchView(viewId);
    });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.record-item')) return;
    document.querySelectorAll('.record-item.show-delete').forEach(function (el) {
      el.classList.remove('show-delete');
      el._longPressShown = false;
    });
  });

  document.querySelectorAll('.stats-type-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.stats-type-btn').forEach(function (b) { b.classList.remove('active'); });
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
      category: (form.querySelector('[name="category"]:checked') || {}).value || CATEGORIES[0],
      location: form.location.value,
      amount: amount
    };
    if (add.getEditingId()) {
      updateRecord(add.getEditingId(), formData);
      add.setEditingId(null);
    } else {
      addRecord(formData);
    }
    form.reset();
    form.date.value = new Date().toISOString().slice(0, 10);
    renderList();
    renderStats();
    switchView('list');
  });

  var dateInput = document.querySelector('[name="date"]');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  var viewDivine = document.getElementById('view-divine');
  if (viewDivine) {
    viewDivine.addEventListener('change', function (e) {
      if (e.target.id === 'divine-date-picker') {
        var v = e.target.value;
        if (v && window.MahjongApp && window.MahjongApp.divine) {
          try { localStorage.setItem('divine_last_date', v); } catch (err) {}
          window.MahjongApp.divine.renderDivine(v);
        }
      }
    });
  }

  updateEyeButton();
  renderList();
})();
