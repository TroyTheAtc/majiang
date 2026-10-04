/**
 * 新增/编辑：表单填充、编辑状态；对象子标签的添加/长按删除
 * 鸿蒙对应：pages/AddPage.ets、编辑态与表单逻辑
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  var longPress = window.MahjongApp && window.MahjongApp.longPress;
  if (!data || !longPress) return;

  var editingId = null;
  var escapeHtml = data.escapeHtml;
  var getCategories = data.getCategories;
  var addCategory = data.addCategory;
  var removeCategory = data.removeCategory;
  var todayStr = data.todayStr;

  var CHIP_SELECTOR = '.category-chip';
  var ADD_BTN_SELECTOR = '.category-add-btn';
  var categoryOptionsEl = null;

  /* 新增按钮在触摸端自己处理（长按工具通过 isExcluded 跳过它），
     否则触摸结束与随后的 click 会各弹一次输入框。 */
  var addBtnTouched = false;
  var addBtnMoved = false;

  /**
   * 取指定取值的对象单选项。
   * 不要拼 [value="..."] 选择器：那是 CSS 语法，需要 CSS 转义而非 HTML 转义，
   * 名称里带引号时必然选不中。直接遍历比对值最稳。
   */
  function findCategoryRadio(form, value) {
    var radios = form.querySelectorAll('[name="category"]');
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].value === value) return radios[i];
    }
    return null;
  }

  function fillForm(record) {
    var form = document.getElementById('form-add');
    if (!form) return;
    form.date.value = record.date || '';
    form.location.value = record.location || '';
    var catRadio = findCategoryRadio(form, record.category || '');
    if (catRadio) catRadio.checked = true;
    var amt = Number(record.amount) || 0;
    var winRadio = form.querySelector('[name="winloss"][value="win"]');
    var lossRadio = form.querySelector('[name="winloss"][value="loss"]');
    if (winRadio) winRadio.checked = amt >= 0;
    if (lossRadio) lossRadio.checked = amt < 0;
    form.amount.value = Math.abs(amt) || '';
  }

  function setEditingId(id) {
    editingId = id;
  }

  function getEditingId() {
    return editingId;
  }

  function initForm() {
    editingId = null;
    clearCategoryShowDelete();
    var form = document.getElementById('form-add');
    if (form) {
      form.reset();
      var dateInput = form.querySelector('[name="date"]');
      if (dateInput) dateInput.value = todayStr();
    }
    renderCategoryOptions();
  }

  function clearCategoryShowDelete() {
    longPress.clearActive(categoryOptionsEl, { itemSelector: CHIP_SELECTOR });
  }

  function renderCategoryOptions() {
    categoryOptionsEl = document.getElementById('category-options');
    if (!categoryOptionsEl) return;
    var cats = getCategories();
    var first = cats[0];
    var html = '';
    cats.forEach(function (c) {
      var checked = c === first ? ' checked' : '';
      html += '<label class="chip category-chip" data-category="' + escapeHtml(c) + '">' +
        '<input type="radio" name="category" value="' + escapeHtml(c) + '"' + checked + ' />' +
        '<span class="category-chip-text">' + escapeHtml(c) + '</span>' +
        '<button type="button" class="category-chip-delete" aria-label="删除该对象"><img src="assets/images/shanchu.png" alt="" /></button>' +
        '</label>';
    });
    html += '<button type="button" class="category-add-btn" aria-label="新增对象"><img src="assets/images/tianjia.png" alt="" /></button>';
    categoryOptionsEl.innerHTML = html;
  }

  function doAddPrompt() {
    var name = prompt('输入新对象名称', '');
    if (name != null && (name = name.trim())) {
      if (addCategory(name)) {
        renderCategoryOptions();
        var form = document.getElementById('form-add');
        if (form) {
          var radio = findCategoryRadio(form, name);
          if (radio) radio.checked = true;
        }
        if (window.MahjongApp && window.MahjongApp.stats && window.MahjongApp.stats.renderStats) {
          window.MahjongApp.stats.renderStats();
        }
      } else {
        alert('该对象已存在');
      }
    }
  }

  /* 新增按钮：仅在触摸端自行处理。触摸被系统取消时只复位，不弹输入框。 */
  function onAddBtnTouchStart(e) {
    addBtnTouched = !!(e.target && e.target.closest && e.target.closest(ADD_BTN_SELECTOR));
    if (addBtnTouched) addBtnMoved = false;
  }

  function onAddBtnTouchMove() {
    if (addBtnTouched) addBtnMoved = true;
  }

  function onAddBtnTouchEnd(e) {
    if (!addBtnTouched) return;
    addBtnTouched = false;
    if (addBtnMoved) return;
    e.preventDefault(); /* 吞掉随后的 click，避免弹两次 */
    doAddPrompt();
  }

  function onAddBtnTouchCancel() {
    addBtnTouched = false;
  }

  function onCategoryOptionsClick(e) {
    var delBtn = e.target.closest('.category-chip-delete');
    if (delBtn) {
      e.preventDefault();
      e.stopPropagation();
      var chip = delBtn.closest('.category-chip');
      var name = chip && chip.getAttribute('data-category');
      if (name && removeCategory(name)) {
        renderCategoryOptions();
        if (window.MahjongApp && window.MahjongApp.stats && window.MahjongApp.stats.renderStats) {
          window.MahjongApp.stats.renderStats();
        }
        if (navigator.vibrate) navigator.vibrate(30);
      } else if (name) {
        alert('至少保留一个对象');
      }
      return;
    }
    var addBtn = e.target.closest(ADD_BTN_SELECTOR);
    if (addBtn) {
      e.preventDefault();
      doAddPrompt();
      return;
    }
    /* 长按已亮出删除按钮：这次点击只是收回 */
    var chip = e.target.closest(CHIP_SELECTOR);
    if (chip && chip._longPressShown) {
      e.preventDefault();
      chip._longPressShown = false;
      clearCategoryShowDelete();
    }
  }

  function bindCategoryOptionsEvents() {
    if (!categoryOptionsEl) return;

    /* 长按亮出该对象的删除按钮（公共工具）。
       这里不给 onTap：普通点击仍交给 click 事件处理（点到"删除该对象"才删得掉）；
       标记保留到 click，由 click 负责收回。 */
    longPress.bind(categoryOptionsEl, {
      itemSelector: CHIP_SELECTOR,
      clearFlagOnLift: false,
      isExcluded: function (target) {
        return !!(target && target.closest && target.closest(ADD_BTN_SELECTOR));
      }
    });

    categoryOptionsEl.addEventListener('touchstart', onAddBtnTouchStart, { passive: true });
    categoryOptionsEl.addEventListener('touchmove', onAddBtnTouchMove, { passive: true });
    categoryOptionsEl.addEventListener('touchend', onAddBtnTouchEnd, { passive: false });
    categoryOptionsEl.addEventListener('touchcancel', onAddBtnTouchCancel, { passive: true });
    categoryOptionsEl.addEventListener('click', onCategoryOptionsClick);
  }

  renderCategoryOptions();
  bindCategoryOptionsEvents();

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.add = {
    fillForm: fillForm,
    setEditingId: setEditingId,
    getEditingId: getEditingId,
    initForm: initForm,
    renderCategoryOptions: renderCategoryOptions,
    clearCategoryShowDelete: clearCategoryShowDelete
  };
})();
