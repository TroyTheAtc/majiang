(function () {
  'use strict';

  const STORAGE_KEY = 'mahjong_records';
  const CATEGORIES = ['机场', '家人', '同事', '同学', '朋友'];

  function getRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function addRecord(record) {
    const list = getRecords();
    list.unshift({
      id: String(Date.now()),
      date: record.date,
      category: record.category,
      location: (record.location || '').trim(),
      amount: record.amount
    });
    saveRecords(list);
  }

  function deleteRecord(id) {
    let list = getRecords();
    list = list.filter(function (r) { return r.id !== id; });
    saveRecords(list);
  }

  function formatAmount(n) {
    const num = Number(n);
    if (num > 0) return '+' + num;
    if (num < 0) return String(num);
    return '0';
  }

  function renderList() {
    const list = getRecords();
    const total = list.reduce(function (sum, r) { return sum + (r.amount || 0); }, 0);
    const totalEl = document.getElementById('total-amount');
    const listEl = document.getElementById('record-list');
    const emptyEl = document.getElementById('empty-tip');

    totalEl.textContent = formatAmount(total);
    totalEl.className = 'summary-amount ' + (total >= 0 ? 'positive' : 'negative');

    listEl.innerHTML = '';
    if (list.length === 0) {
      emptyEl.classList.add('visible');
      return;
    }
    emptyEl.classList.remove('visible');

    list.forEach(function (r) {
      const li = document.createElement('li');
      li.className = 'record-item';
      const meta = [r.category, r.location].filter(Boolean).join(' · ') || '—';
      const amountClass = (r.amount || 0) >= 0 ? 'win' : 'loss';
      li.innerHTML =
        '<div class="left">' +
          '<div class="date">' + escapeHtml(r.date) + '</div>' +
          '<div class="meta"><span class="category">' + escapeHtml(r.category) + '</span>' + escapeHtml(meta) + '</div>' +
        '</div>' +
        '<span class="amount ' + amountClass + '">' + formatAmount(r.amount) + '</span>' +
        '<button type="button" class="btn-delete" data-id="' + escapeHtml(r.id) + '" aria-label="删除">删除</button>';
      listEl.appendChild(li);
    });

    listEl.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (confirm('确定删除这条记录？')) {
          deleteRecord(btn.getAttribute('data-id'));
          renderList();
          renderStats();
        }
      });
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function getPeriodRange(period) {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 1);
    if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    }
    return { start: start, end: new Date(now.getTime() + 86400000) };
  }

  function filterByPeriod(records, period) {
    if (period === 'all') return records;
    var range = getPeriodRange(period);
    return records.filter(function (r) {
      var d = new Date(r.date);
      return d >= range.start && d < range.end;
    });
  }

  function renderStats() {
    const records = getRecords();
    const period = document.querySelector('.period-btn.active')?.getAttribute('data-period') || 'all';
    const filtered = filterByPeriod(records, period);

    const total = filtered.reduce(function (sum, r) { return sum + (r.amount || 0); }, 0);
    const totalEl = document.getElementById('stats-total-amount');
    totalEl.textContent = formatAmount(total);
    totalEl.className = 'stats-total-amount ' + (total >= 0 ? 'positive' : 'negative');

    const byCat = {};
    CATEGORIES.forEach(function (c) { byCat[c] = 0; });
    filtered.forEach(function (r) {
      if (byCat[r.category] !== undefined) byCat[r.category] += (r.amount || 0);
    });

    const listEl = document.getElementById('stats-category-list');
    listEl.innerHTML = '';
    CATEGORIES.forEach(function (cat) {
      const sum = byCat[cat];
      const li = document.createElement('li');
      li.className = 'stats-category-item';
      const sumClass = sum >= 0 ? 'positive' : 'negative';
      li.innerHTML = '<span class="name">' + escapeHtml(cat) + '</span><span class="sum ' + sumClass + '">' + formatAmount(sum) + '</span>';
      listEl.appendChild(li);
    });
  }

  function switchView(viewId) {
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
    var view = document.getElementById('view-' + viewId);
    var tab = document.querySelector('.tab[data-view="' + viewId + '"]');
    if (view) view.classList.add('active');
    if (tab) tab.classList.add('active');
    if (viewId === 'stats') renderStats();
  }

  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchView(tab.getAttribute('data-view'));
    });
  });

  document.querySelectorAll('.period-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.period-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderStats();
    });
  });

  document.getElementById('form-add').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var winloss = (form.querySelector('[name="winloss"]:checked') || {}).value;
    var amount = parseInt(form.amount.value, 10) || 0;
    if (winloss === 'loss') amount = -amount;
    addRecord({
      date: form.date.value,
      category: (form.querySelector('[name="category"]:checked') || {}).value || CATEGORIES[0],
      location: form.location.value,
      amount: amount
    });
    form.reset();
    form.date.value = new Date().toISOString().slice(0, 10);
    renderList();
    switchView('list');
  });

  // 默认日期为今天
  var dateInput = document.querySelector('[name="date"]');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  renderList();
})();
