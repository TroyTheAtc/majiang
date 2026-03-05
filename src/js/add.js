/**
 * 新增/编辑：表单填充、编辑状态
 * 鸿蒙对应：pages/AddPage.ets、编辑态与表单逻辑
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  if (!data) return;

  var editingId = null;
  var escapeHtml = data.escapeHtml;

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
    var form = document.getElementById('form-add');
    if (form) {
      form.reset();
      var dateInput = form.querySelector('[name="date"]');
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    }
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.add = {
    fillForm: fillForm,
    setEditingId: setEditingId,
    getEditingId: getEditingId,
    initForm: initForm
  };
})();
