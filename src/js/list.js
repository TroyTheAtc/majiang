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
  var longPress = window.MahjongApp && window.MahjongApp.longPress;
  if (!data || !add || !view || !longPress) return;

  var listEl = document.getElementById('record-list');
  var LIST_ITEM = '.record-item';
  var DELETE_BTN = '.btn-delete';

  function clearShowDelete() {
    longPress.clearActive(listEl, { itemSelector: LIST_ITEM });
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

  /** 删除一条记录（触摸端与桌面端共用） */
  function doDelete(id) {
    if (!id) return;
    if (!confirm('确定删除这条记录？')) return;
    data.deleteRecord(id);
    renderList();
    if (stats && stats.renderStats) stats.renderStats();
    /* 删到一条不剩时备份提醒就没必要了（提醒条件要求"有数据"） */
    var backup = window.MahjongApp && window.MahjongApp.backup;
    if (backup && backup.renderBanner) backup.renderBanner();
    if (navigator.vibrate) navigator.vibrate(30);
  }

  /** 删除按钮本身不参与长按/短按追踪，让它的原生 click 正常工作。
      （触摸端原本就是因为这里的短按把 touchend 吞掉，才点不掉记录。） */
  function isDeleteTarget(target) {
    return !!(target && target.closest && target.closest(DELETE_BTN));
  }

  /** 触摸端短按卡片本体（删除按钮已排除，走 click）：
      亮出删除按钮时轻点 = 收回；否则进编辑页。 */
  function onTapItem(item) {
    if (!item) return;
    if (item._longPressShown) {
      clearShowDelete();
      return;
    }
    doEdit(item);
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

  /* 列表交互：长按亮出删除按钮（公共工具负责 touch/mouse 双套与长按计时），
     短按进编辑页，删除按钮走点击委托。 */
  longPress.bind(listEl, {
    itemSelector: LIST_ITEM,
    /* 长按后抬手，浏览器补发的那次 click 交给公共工具吞掉（否则会把刚亮出的
       删除按钮又收回去、并跳进编辑页），所以这里不能抬手就清标记。 */
    clearFlagOnLift: false,
    swallowReleaseClick: true,
    isExcluded: isDeleteTarget,
    onTap: onTapItem
  });

  function listOnClick(e) {
    var delBtn = e.target.closest(DELETE_BTN);
    if (delBtn) {
      e.preventDefault();
      e.stopPropagation();
      doDelete(delBtn.getAttribute('data-id'));
      return;
    }
    var item = e.target.closest(LIST_ITEM);
    if (!item) return;
    /* 长按已亮出操作按钮：这次点击只是收起来，不进编辑页 */
    if (item._longPressShown) {
      e.preventDefault();
      clearShowDelete();
      return;
    }
    doEdit(item);
  }

  if (listEl) listEl.addEventListener('click', listOnClick);

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.list = { renderList: renderList, clearShowDelete: clearShowDelete };
})();
