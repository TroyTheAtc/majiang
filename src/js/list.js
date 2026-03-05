/**
 * 牌谱列表：渲染、长按删除、点击编辑
 * 鸿蒙对应：pages/ListPage.ets、列表与滑动/长按交互
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  var add = window.MahjongApp && window.MahjongApp.add;
  var view = window.MahjongApp && window.MahjongApp.view;
  var stats = window.MahjongApp && window.MahjongApp.stats;
  if (!data || !add || !view) return;

  const LONG_PRESS_MS = 500;
  const listEl = document.getElementById('record-list');

  function clearShowDelete() {
    if (!listEl) return;
    listEl.querySelectorAll('.record-item.show-delete').forEach(function (el) {
      el.classList.remove('show-delete');
      el._longPressShown = false;
    });
  }

  function doEdit(item) {
    clearShowDelete();
    var id = item.getAttribute('data-id');
    var list = data.getRecords();
    var r = list.find(function (x) { return x.id === id; });
    if (!r) return;
    add.setEditingId(id);
    add.fillForm(r);
    view.switchView('add');
  }

  function renderList() {
    const list = data.getRecords();
    var sorted = list.slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
    });
    const thisYearList = data.recordsThisYear(list);
    const total = thisYearList.reduce(function (sum, r) { return sum + (r.amount || 0); }, 0);
    const totalEl = document.getElementById('total-amount');
    const emptyEl = document.getElementById('empty-tip');
    const getHideAmounts = data.getHideAmounts;
    const formatAmount = data.formatAmount;
    const escapeHtml = data.escapeHtml;

    totalEl.textContent = formatAmount(total);
    totalEl.className = 'summary-amount ' + (total >= 0 ? 'positive' : 'negative');

    listEl.innerHTML = '';
    if (sorted.length === 0) {
      emptyEl.classList.add('visible');
      return;
    }
    emptyEl.classList.remove('visible');

    var prevYear = null;
    sorted.forEach(function (r) {
      var year = (r.date || '').slice(0, 4);
      if (prevYear !== null && year !== prevYear) {
        var divLi = document.createElement('li');
        divLi.className = 'year-divider';
        divLi.setAttribute('aria-hidden', 'true');
        divLi.innerHTML = '<span class="year-divider-line"></span><span class="year-divider-text">' + escapeHtml(year ? year + '年' : '') + '</span><span class="year-divider-line"></span>';
        listEl.appendChild(divLi);
      }
      prevYear = year;

      const li = document.createElement('li');
      li.className = 'record-item';
      li.setAttribute('data-id', r.id);
      const amountClass = (r.amount || 0) >= 0 ? 'win' : 'loss';
      const winLossWord = (r.amount || 0) >= 0 ? 'WIN' : 'LOSE';
      const location = (r.location || '').trim() || '—';
      const hideMeta = getHideAmounts();
      const locationStr = hideMeta ? '**' : escapeHtml(location);
      const categoryStr = hideMeta ? '**' : escapeHtml(r.category || '—');
      const meta = '<span class="meta-winloss ' + amountClass + '">' + winLossWord + '</span> ' + locationStr + '·' + categoryStr;
      li.innerHTML =
        '<div class="left">' +
          '<div class="date">' + escapeHtml(r.date) + '</div>' +
          '<div class="meta">' + meta + '</div>' +
        '</div>' +
        '<span class="amount ' + amountClass + '">' + formatAmount(r.amount) + '</span>' +
        '<div class="record-actions">' +
          '<button type="button" class="btn-icon btn-delete" data-id="' + escapeHtml(r.id) + '" aria-label="删除"><img src="assets/images/shanchu.png" alt="" /></button>' +
        '</div>';
      listEl.appendChild(li);
    });
  }

  /* 列表事件委托 */
  var listActiveItem = null;
  var listTimer = null;
  var listLongPressTriggered = false;
  var listMoved = false;

  function listClearTimer() {
    if (listTimer) {
      clearTimeout(listTimer);
      listTimer = null;
    }
  }

  function listOnTouchStart(e) {
    var item = e.target.closest('.record-item');
    if (!item) return;
    listActiveItem = item;
    listLongPressTriggered = false;
    listMoved = false;
    listClearTimer();
    listTimer = setTimeout(function () {
      listTimer = null;
      listLongPressTriggered = true;
      listEl.querySelectorAll('.record-item').forEach(function (el) {
        el.classList.remove('show-delete');
        el._longPressShown = false;
      });
      item.classList.add('show-delete');
      item._longPressShown = true;
      item.classList.add('shake');
      setTimeout(function () { item.classList.remove('shake'); }, 350);
      if (navigator.vibrate) navigator.vibrate(40);
    }, LONG_PRESS_MS);
  }

  function listOnTouchMove() {
    listMoved = true;
    listClearTimer();
  }

  function listOnTouchEnd(e) {
    if (!listActiveItem) return;
    if (listLongPressTriggered) {
      listActiveItem._longPressShown = false;
      listClearTimer();
      listActiveItem = null;
      return;
    }
    if (listMoved) {
      listClearTimer();
      listActiveItem = null;
      return;
    }
    listClearTimer();
    if (e.type === 'touchend') {
      e.preventDefault();
      doEdit(listActiveItem);
    }
    listActiveItem = null;
  }

  function listOnTouchCancel() {
    listClearTimer();
    listActiveItem = null;
  }

  function listOnMouseDown(e) {
    var item = e.target.closest('.record-item');
    if (!item) return;
    listActiveItem = item;
    listMoved = false;
    listLongPressTriggered = false;
    listClearTimer();
    listTimer = setTimeout(function () {
      listTimer = null;
      listLongPressTriggered = true;
      listEl.querySelectorAll('.record-item').forEach(function (el) {
        el.classList.remove('show-delete');
        el._longPressShown = false;
      });
      item.classList.add('show-delete');
      item._longPressShown = true;
      item.classList.add('shake');
      setTimeout(function () { item.classList.remove('shake'); }, 350);
      if (navigator.vibrate) navigator.vibrate(40);
    }, LONG_PRESS_MS);
  }

  function listOnMouseMove() {
    listMoved = true;
    listClearTimer();
  }

  function listOnMouseUp() {
    if (!listActiveItem) return;
    if (listLongPressTriggered) {
      listActiveItem._longPressShown = false;
    }
    listClearTimer();
    listActiveItem = null;
  }

  function listOnClick(e) {
    var delBtn = e.target.closest('.btn-delete');
    if (delBtn) {
      e.stopPropagation();
      e.preventDefault();
      if (confirm('确定删除这条记录？')) {
        data.deleteRecord(delBtn.getAttribute('data-id'));
        renderList();
        if (stats && stats.renderStats) stats.renderStats();
        if (navigator.vibrate) navigator.vibrate(30);
      }
      return;
    }
    var item = e.target.closest('.record-item');
    if (item) {
      if (item._longPressShown) {
        item._longPressShown = false;
        e.preventDefault();
        return;
      }
      doEdit(item);
    }
  }

  if (listEl) {
    listEl.addEventListener('touchstart', listOnTouchStart, { passive: true });
    listEl.addEventListener('touchmove', listOnTouchMove, { passive: true });
    listEl.addEventListener('touchend', listOnTouchEnd, { passive: false });
    listEl.addEventListener('touchcancel', listOnTouchCancel, { passive: true });
    listEl.addEventListener('mousedown', listOnMouseDown);
    listEl.addEventListener('mousemove', listOnMouseMove);
    listEl.addEventListener('mouseup', listOnMouseUp);
    listEl.addEventListener('mouseleave', listClearTimer);
    listEl.addEventListener('click', listOnClick);
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.list = { renderList: renderList, clearShowDelete: clearShowDelete };
})();
