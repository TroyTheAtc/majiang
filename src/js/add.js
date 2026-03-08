/**
 * 新增/编辑：表单填充、编辑状态；对象子标签的添加/长按删除
 * 鸿蒙对应：pages/AddPage.ets、编辑态与表单逻辑
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  if (!data) return;

  var editingId = null;
  var escapeHtml = data.escapeHtml;
  var getCategories = data.getCategories;
  var addCategory = data.addCategory;
  var removeCategory = data.removeCategory;

  var LONG_PRESS_MS = 500;
  var categoryOptionsEl = null;
  var catLongPressTimer = null;
  var catActiveChip = null;
  var catLongPressTriggered = false;
  var catMoved = false;

  function fillForm(record) {
    var form = document.getElementById('form-add');
    if (!form) return;
    form.date.value = record.date || '';
    form.location.value = record.location || '';
    var catRadio = form.querySelector('[name="category"][value="' + escapeHtml(record.category || '') + '"]');
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
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    }
    renderCategoryOptions();
  }

  function clearCategoryShowDelete() {
    if (!categoryOptionsEl) return;
    categoryOptionsEl.querySelectorAll('.category-chip.show-delete').forEach(function (el) {
      el.classList.remove('show-delete');
      el._catLongPressShown = false;
    });
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

  function catClearTimer() {
    if (catLongPressTimer) {
      clearTimeout(catLongPressTimer);
      catLongPressTimer = null;
    }
  }

  function catOnTouchStart(e) {
    var chip = e.target.closest('.category-chip');
    if (!chip) return;
    catActiveChip = chip;
    catLongPressTriggered = false;
    catMoved = false;
    catClearTimer();
    catLongPressTimer = setTimeout(function () {
      catLongPressTimer = null;
      catLongPressTriggered = true;
      clearCategoryShowDelete();
      chip.classList.add('show-delete');
      chip._catLongPressShown = true;
      chip.classList.add('shake');
      setTimeout(function () { chip.classList.remove('shake'); }, 350);
      if (navigator.vibrate) navigator.vibrate(40);
    }, LONG_PRESS_MS);
  }

  function catOnTouchMove() {
    catMoved = true;
    catClearTimer();
  }

  function catOnTouchEnd() {
    if (!catActiveChip) return;
    catClearTimer();
    catActiveChip = null;
  }

  function catOnMouseDown(e) {
    var chip = e.target.closest('.category-chip');
    if (!chip) return;
    catActiveChip = chip;
    catMoved = false;
    catLongPressTriggered = false;
    catClearTimer();
    catLongPressTimer = setTimeout(function () {
      catLongPressTimer = null;
      catLongPressTriggered = true;
      clearCategoryShowDelete();
      chip.classList.add('show-delete');
      chip._catLongPressShown = true;
      chip.classList.add('shake');
      setTimeout(function () { chip.classList.remove('shake'); }, 350);
      if (navigator.vibrate) navigator.vibrate(40);
    }, LONG_PRESS_MS);
  }

  function catOnMouseMove() {
    catMoved = true;
    catClearTimer();
  }

  function catOnMouseUp() {
    if (catActiveChip) catClearTimer();
    catActiveChip = null;
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
    var addBtn = e.target.closest('.category-add-btn');
    if (addBtn) {
      e.preventDefault();
      var name = prompt('输入新对象名称', '');
      if (name != null && (name = name.trim())) {
        if (addCategory(name)) {
          renderCategoryOptions();
          var form = document.getElementById('form-add');
          if (form) {
            var radio = form.querySelector('[name="category"][value="' + escapeHtml(name) + '"]');
            if (radio) radio.checked = true;
          }
          if (window.MahjongApp && window.MahjongApp.stats && window.MahjongApp.stats.renderStats) {
            window.MahjongApp.stats.renderStats();
          }
        } else {
          alert('该对象已存在');
        }
      }
      return;
    }
    var chip = e.target.closest('.category-chip');
    if (chip && chip._catLongPressShown) {
      e.preventDefault();
      chip._catLongPressShown = false;
      clearCategoryShowDelete();
    }
  }

  function bindCategoryOptionsEvents() {
    if (!categoryOptionsEl) return;
    categoryOptionsEl.addEventListener('touchstart', catOnTouchStart, { passive: true });
    categoryOptionsEl.addEventListener('touchmove', catOnTouchMove, { passive: true });
    categoryOptionsEl.addEventListener('touchend', catOnTouchEnd, { passive: true });
    categoryOptionsEl.addEventListener('touchcancel', catOnTouchEnd, { passive: true });
    categoryOptionsEl.addEventListener('mousedown', catOnMouseDown);
    categoryOptionsEl.addEventListener('mousemove', catOnMouseMove);
    categoryOptionsEl.addEventListener('mouseup', catOnMouseUp);
    categoryOptionsEl.addEventListener('mouseleave', catClearTimer);
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
