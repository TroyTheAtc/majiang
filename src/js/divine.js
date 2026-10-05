/**
 * 麻前占卜（渲染层）
 * 算法全部在 fate.js —— 本文件只负责渲染、命主设置与应验对账展示。
 * 鸿蒙对应：pages/DivinePage.ets
 *
 * 刻意保留的设计：
 * - 文案下标由 fate.rand01(seed) 决定（seed = 命主指纹 + 日期），
 *   所以"同人同天同一句、不同人不同句"。
 * - 本层不自行计算档位，只从 fate.getDay() 取；当日结果已被缓存，
 *   不会因为当天补记战绩等原因而在当天内变脸。
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  var fate = window.MahjongApp && window.MahjongApp.fate;
  if (!data) return;

  var escapeHtml = data.escapeHtml;
  var LEVEL_NAMES = (fate && fate.LEVEL_NAMES) || ['宜守', '平', '吉', '大吉'];
  /* 等级插图：WebP（512²，显示上限 140px，压缩后画质无损感知） */
  var levelImages = ['yishou.webp', 'ping.webp', 'ji.webp', 'daji.webp'];

  /** 每档 8 组文案：{ main 谶语 / sub 行动建议 } */
  var HINTS = {
    0: [
      { main: '云掩蟾宫，潮退沙白。守静以待，勿触锋芒。', sub: '运势低迷，今日不宜上桌，静观其变为上。' },
      { main: '月昏星匿，牌山如雾。宜观局，不宜入局。', sub: '手气混沌，看不清牌路，旁观比参战更明智。' },
      { main: '霜落寒窗，蛰虫俯穴。今日之局，避之则吉。', sub: '天时不利，蛰伏休息，强行出战恐有损失。' },
      { main: '逆风执炬，必有烧手之患。暂敛羽翼，以伺天时。', sub: '逆势而行容易自伤，今日宜守不宜攻。' },
      { main: '水涸石出，鱼困浅滩。非战之罪，实乃势不至。', sub: '时机未到，非你技不如人，改日再战为佳。' },
      { main: '寒潭无波，深不见底。此时涉水，徒劳无功。', sub: '今日气场不顺，坐下便是送分，不如早些离席。' },
      { main: '灯昏人散，席冷茶凉。识时务者，不做强求。', sub: '牌势已去就收手，硬撑只会越陷越深。' },
      { main: '秋霜杀草，岁不我与。养精蓄锐，待春再发。', sub: '今日运势不济，把位置留给别人，明日再来。' }
    ],
    1: [
      { main: '风过竹林，声动而叶不惊。可往，不可尽往。', sub: '有机会但需谨慎，小玩几局试探，不可恋战。' },
      { main: '溪云初起，山雨未至。小酌可也，酣饮不宜。', sub: '局势未明，小试手气无妨，大动干戈则凶。' },
      { main: '雾锁津渡，舟子缓行。试探深浅，再定去留。', sub: '先打几局摸摸底，顺风则进，逆风则退。' },
      { main: '春冰未泮，履之需谨慎。半步可试，大步则危。', sub: '时机尚可但不稳固，小动作安全，大动作冒险。' },
      { main: '棋到中局，胜负未分。观彼动静，再应其变。', sub: '今日变数较多，随机应变，不可固守一策。' },
      { main: '月照半窗，光而不明。有得有失，两相抵补。', sub: '今日输赢相当，打了也白打，权当消遣。' },
      { main: '竹影横斜，风来即散。无可无不可，随遇而安。', sub: '运势不温不火，去与不去都行，全凭心情。' },
      { main: '青石小径，曲折通幽。缓步而行，自有所至。', sub: '慢慢磨，别急着下注，稳中求个小胜。' }
    ],
    2: [
      { main: '东南有风，送暖入怀。轻舟可发，莫恋远方。', sub: '手气不错，可以出战，但记得见好就收。' },
      { main: '晨光初透，雀噪檐前。小利可图，大贪招损。', sub: '今日有小胜之机，贪心恋战则反噬。' },
      { main: '新雨之后，苔痕渐绿。顺势而取，过之则枯。', sub: '运势上升期，抓住机会，但不可过度索取。' },
      { main: '酒至微醺，花看半开。此中真意，适可而止。', sub: '今日佳境正当时，懂得收手才能留住胜果。' },
      { main: '雁阵南来，气爽天高。小试锋芒，见好便收。', sub: '天时地利兼备，适度参与，忌持久战。' },
      { main: '春江水暖，鸭戏清波。顺流而下，不必费力。', sub: '今日顺风顺水，稳稳地打，赢面在你这边。' },
      { main: '庭前花开，蝶自来去。香未散时，宜早归去。', sub: '牌运正旺，趁热打铁，但别等到花香散尽。' },
      { main: '轻舟已过，万重山色。风顺帆满，抓紧时机。', sub: '手感在线，今天是能赢钱的日子，赢够就走。' }
    ],
    3: [
      { main: '紫微临位，四方来朝。此时不举，更待何时？', sub: '运势爆棚，今日宜主动出击，放手一搏。' },
      { main: '天朗气清，惠风和畅。顺势而为，无往不利。', sub: '诸事顺遂，牌运亨通，大胆施展拳脚。' },
      { main: '潮平两岸阔，风正一帆悬。今日之局，如臂使指。', sub: '天时地利人和，今日打牌得心应手。' },
      { main: '三星高照，五福临门。牌运如泉涌，取之不竭。', sub: '吉星高照，手气正旺，今日多打几局有利可图。' },
      { main: '江流天地，月涌大江。气运如虹，当仁不让。', sub: '气势如虹，今日宜乘胜追击，扩大战果。' },
      { main: '日正中天，光被四表。举手投足，皆合其道。', sub: '今日运势登顶，怎么打怎么有，放心上桌。' },
      { main: '凤鸣高冈，百鸟来朝。天时在我，何惧一战。', sub: '运势正盛，今日是你的场子，尽可放手。' },
      { main: '长风万里，直挂云帆。此行必有所获。', sub: '吉日良辰，今日出手多有斩获，别浪费这一天。' }
    ]
  };

  var VERIFY_DAYS = 30;
  var lastDate = '';

  function fmtDelta(v) {
    if (!v) return '0';
    return (v > 0 ? '+' : '') + (Math.round(v * 100) / 100).toFixed(2);
  }

  function pickHint(seed, level) {
    var list = HINTS[level] || HINTS[1];
    var r = 0;
    if (fate && fate.rand01) {
      r = fate.rand01(seed, 'hint', 7);
    } else {
      r = 0;
    }
    var idx = Math.floor(r * list.length);
    if (idx < 0 || idx >= list.length) idx = 0;
    return list[idx];
  }

  /* ==================== 命主栏 ==================== */
  function renderFateBar(profile, res) {
    var nick = escapeHtml(profile.nick);
    if (profile.birth) {
      /* 未占卜（res 为空）时也把日主算出来展示，避免出现「日主未定」的错觉 */
      var gan = res && res.masterGan;
      var wx = res && res.masterWx;
      if (!gan && fate && fate.getDayMaster) {
        var dm = fate.getDayMaster(profile.birth);
        if (dm) { gan = dm.gan; wx = dm.wx; }
      }
      var master = gan
        ? '日主' + escapeHtml(gan) + escapeHtml(wx || '')
        : '日主未定';
      return '<div class="divine-fate-bar">' +
        '<span class="divine-fate-text">命主 <b>' + nick + '</b> · ' + master +
        '<span class="divine-fate-birth">' + escapeHtml(profile.birth) + '</span></span>' +
        '<button type="button" class="divine-fate-edit">修改</button>' +
        '</div>';
    }
    return '<div class="divine-fate-bar is-empty">' +
      '<span class="divine-fate-text">填上生日，麻运就只算你自己的</span>' +
      '<button type="button" class="divine-fate-edit">填写</button>' +
      '</div>';
  }

  /* ==================== 依据 ==================== */
  function renderBasis(res) {
    var rows = [];
    if (res.hasBirth && res.rel) {
      rows.push({
        personal: true,
        label: '你日主' + res.masterWx + '，今日' + res.dayGanZhi + '（' + res.dayWx + '）—— ' +
          res.relText + '，' + res.relLabel.replace(/·.*$/, ''),
        delta: res.relScore
      });
    } else if (!res.hasBirth) {
      rows.push({ personal: true, label: '未填生日，今日只按天时推算', delta: 0, muted: true });
    }
    (res.dayFactors || []).forEach(function (it) {
      rows.push({ personal: false, label: it.label, delta: it.delta });
    });
    if (!rows.length) return '';

    var html = '<div class="divine-basis">' +
      '<p class="divine-basis-title">推演依据</p><ul class="divine-basis-list">';
    rows.forEach(function (r) {
      html += '<li class="divine-basis-item' + (r.personal ? ' is-personal' : '') + (r.muted ? ' is-muted' : '') + '">' +
        '<span class="divine-basis-tag">' + (r.personal ? '命' : '天') + '</span>' +
        '<span class="divine-basis-label">' + escapeHtml(r.label) + '</span>' +
        (r.muted ? '' : '<span class="divine-basis-delta">' + fmtDelta(r.delta) + '</span>') +
        '</li>';
    });
    html += '</ul></div>';
    return html;
  }

  /* ==================== 应验对账 ==================== */
  function renderVerify(res) {
    var v;
    try {
      v = fate.getVerification(data.getRecords(), VERIFY_DAYS);
    } catch (e) {
      return '';
    }
    var today = data.todayStr();
    var html = '<div class="divine-verify">' +
      '<p class="divine-verify-title">应验对账</p>';

    if (v.today) {
      var lvName = LEVEL_NAMES[v.today.level] || '';
      html += '<p class="divine-verify-today ' + (v.today.hit ? 'is-hit' : 'is-miss') + '">' +
        '今日 ' + escapeHtml(lvName) + ' → 实际 ' + escapeHtml(data.formatAmount(v.today.total)) +
        (v.today.hit ? ' ✅ 应验' : ' ✖ 未应验') + '</p>';
    } else if (res.date === today) {
      html += '<p class="divine-verify-today is-pending">今日还没记战绩，记完自动对账</p>';
    }

    if (v.total > 0) {
      html += '<p class="divine-verify-stat">近 ' + v.recentDays + ' 天应验 ' +
        '<b>' + v.hitCount + '/' + v.total + '</b>（' + Math.round(v.hitRate * 100) + '%）</p>' +
        '<p class="divine-verify-detail">宜战 ' + v.aggressiveHits + '/' + v.aggressiveTotal +
        ' · 宜守避损 ' + v.defensiveHits + '/' + v.defensiveTotal + '</p>';
    } else {
      html += '<p class="divine-verify-empty">样本还不够 —— 战绩记录会自动与当日麻运核对</p>';
    }
    html += '</div>';
    return html;
  }

  /* ==================== 未占卜：起卦入口 ====================
     进入占卜页先不抛结果，只给「开始占卜」按钮；
     按钮要"长按蓄力"——进度条从左侧填满才成卦（同一人同一天结果恒定）。 */
  function renderIdle() {
    var container = document.getElementById('divine-content');
    if (!container) return;
    lastDate = '';

    if (!fate) {
      container.innerHTML = '<p class="divine-hint divine-hint-sub">占卜模块未加载，请刷新页面重试。</p>';
      return;
    }

    var profile = fate.getProfile();

    /* 历史回填：起卦前先把过去的战绩对账数据备好 */
    try { fate.backfill(data.getRecords()); } catch (e) {}

    container.innerHTML =
      renderFateBar(profile, null) +
      '<div class="divine-idle">' +
        '<p class="divine-idle-title">今日麻运</p>' +
        '<p class="divine-idle-sub">按住按钮不放，蓄满即成卦</p>' +
        '<button type="button" class="divine-draw-btn">' +
          '<span class="divine-draw-fill" aria-hidden="true"></span>' +
          '<span class="divine-draw-btn-text">开始占卜</span>' +
        '</button>' +
        '<p class="divine-idle-note">同一天只算一次，结果不会变</p>' +
      '</div>';
  }

  /* ==================== 起卦（长按蓄力） ==================== */
  /* 蓄满所需时长与进度条宽度同源：都用这一条的 rAF 推进，
     所以"进度条填满"与"出结果"发生在同一帧，不会一个先到。 */
  var HOLD_MS = 1000;
  var holdRaf = null;
  var holdStartAt = 0;
  var holdBtn = null;

  var rafFn = window.requestAnimationFrame
    ? function (cb) { return window.requestAnimationFrame(cb); }
    : function (cb) { return setTimeout(cb, 16); };
  var cafFn = window.cancelAnimationFrame
    ? function (id) { window.cancelAnimationFrame(id); }
    : function (id) { clearTimeout(id); };

  function setFill(btn, ratio) {
    if (!btn) return;
    var fill = btn.querySelector('.divine-draw-fill');
    if (fill) fill.style.width = (Math.max(0, Math.min(1, ratio)) * 100) + '%';
  }

  function endHold(done) {
    var btn = holdBtn;
    holdBtn = null;
    if (holdRaf) { cafFn(holdRaf); holdRaf = null; }
    if (!btn) return;
    btn.classList.remove('is-holding');
    if (done) {
      setFill(btn, 1);
      if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
      startDraw();
    } else {
      setFill(btn, 0);
    }
  }

  function tick() {
    if (!holdBtn) return;
    var r = (Date.now() - holdStartAt) / HOLD_MS;
    if (r >= 1) { endHold(true); return; }
    setFill(holdBtn, r);
    holdRaf = rafFn(tick);
  }

  function beginHold(btn) {
    if (holdBtn) endHold(false);
    holdBtn = btn;
    holdStartAt = Date.now();
    btn.classList.add('is-holding');
    setFill(btn, 0);
    holdRaf = rafFn(tick);
  }

  function startDraw() {
    /* 起卦即揭晓：结果本就是纯函数，同人同天恒定，这里只补一个淡入动画 */
    renderDivine(data.todayStr());
    var c = document.getElementById('divine-content');
    if (c) {
      c.classList.add('is-reveal');
      setTimeout(function () { c.classList.remove('is-reveal'); }, 700);
    }
  }

  /* ==================== 主渲染 ==================== */
  function renderDivine(dateStr) {
    var container = document.getElementById('divine-content');
    if (!container) return;
    if (!dateStr) dateStr = data.todayStr();
    lastDate = dateStr;

    if (!fate) {
      container.innerHTML = '<p class="divine-hint divine-hint-sub">占卜模块未加载，请刷新页面重试。</p>';
      return;
    }

    var profile = fate.getProfile();

    /* 历史回填：让"过去有战绩的日子"立刻能参与对账（算法是纯函数，可安全回溯） */
    try { fate.backfill(data.getRecords()); } catch (e) {}

    var res = fate.getDay(dateStr, profile);
    var isToday = dateStr === data.todayStr();

    var hints = pickHint(res.seed, res.level);
    var idx = hints.main.indexOf('。');
    var line1 = idx >= 0 ? hints.main.slice(0, idx + 1) : hints.main;
    var line2 = idx >= 0 ? hints.main.slice(idx + 1).trim() : '';
    var mainMarkup = line2
      ? '<span class="divine-quote-line1">' + escapeHtml(line1) + '</span><span class="divine-quote-line2">' + escapeHtml(line2) + '</span>'
      : escapeHtml(hints.main);

    var almanacExtra = [];
    if (res.caiPos) almanacExtra.push('财神' + res.caiPos + (res.caiPosDesc ? '（' + res.caiPosDesc + '）' : ''));
    if (res.xiPos) almanacExtra.push('喜神' + res.xiPos);
    if (res.chong) almanacExtra.push('冲' + res.chong);
    if (res.sha) almanacExtra.push('煞' + res.sha);

    container.innerHTML =
      renderFateBar(profile, res) +
      '<div class="divine-date divine-date-line">' +
        '<input type="date" id="divine-date-picker" class="divine-date-input" value="' + escapeHtml(dateStr) + '" />' +
        '<span class="divine-date-lunar"> · ' + escapeHtml(res.lunarText || '') + '</span>' +
        (isToday ? '' : '<button type="button" class="divine-date-today">回到今天</button>') +
      '</div>' +
      '<p class="divine-level-label">当日麻运</p>' +
      '<div class="divine-level divine-level-' + res.level + '">' +
        '<img src="assets/images/' + levelImages[res.level] + '?v=' + data.APP_VERSION + '" alt="' + LEVEL_NAMES[res.level] + '" class="divine-level-img" decoding="async" />' +
      '</div>' +
      '<p class="divine-hint divine-hint-main">' + mainMarkup + '</p>' +
      '<div class="divine-hint-divider"></div>' +
      '<p class="divine-hint divine-hint-sub">' + escapeHtml(hints.sub) + '</p>' +
      renderBasis(res) +
      '<div class="divine-almanac">' +
        '<p class="divine-yi">宜 ' + (res.yi && res.yi.length ? escapeHtml(res.yi.join('、')) : '—') + '</p>' +
        '<p class="divine-ji">忌 ' + (res.ji && res.ji.length ? escapeHtml(res.ji.join('、')) : '—') + '</p>' +
        (almanacExtra.length ? '<p class="divine-extra">' + escapeHtml(almanacExtra.join(' · ')) + '</p>' : '') +
      '</div>' +
      renderVerify(res);
  }

  /* ==================== 命主设置面板 ==================== */
  function el(id) { return document.getElementById(id); }

  function updateFateHint() {
    var hint = el('fate-hint');
    if (!hint) return;
    var birth = el('input-fate-birth') ? el('input-fate-birth').value : '';
    if (!birth) {
      hint.textContent = '不填生日也能用（按天时推算），填了才算你自己的命。';
      return;
    }
    var dm = fate.getDayMaster(birth);
    hint.textContent = dm
      ? '你的日主：' + dm.gan + '（' + dm.wx + '）—— 每日麻运会结合它与当天干支推算。'
      : '这个日期算不出日主，请检查一下。';
  }

  function openFatePanel() {
    if (!fate) return;
    var p = fate.getProfile();
    if (el('input-fate-nick')) el('input-fate-nick').value = p.nick;
    if (el('input-fate-birth')) el('input-fate-birth').value = p.birth || '';
    updateFateHint();
    var ov = el('fate-overlay');
    if (ov) { ov.classList.add('is-open'); ov.setAttribute('aria-hidden', 'false'); }
  }

  function closeFatePanel() {
    var ov = el('fate-overlay');
    if (ov) { ov.classList.remove('is-open'); ov.setAttribute('aria-hidden', 'true'); }
  }

  function saveFatePanel() {
    var nick = el('input-fate-nick') ? el('input-fate-nick').value : '';
    var birth = el('input-fate-birth') ? el('input-fate-birth').value : '';
    if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
      alert('生日格式不正确');
      return;
    }
    fate.saveProfile({ nick: nick, birth: birth });
    closeFatePanel();
    syncPageChrome();
    if (lastDate) renderDivine(lastDate); else renderIdle();
  }

  function clearFateBirth() {
    var cur = fate.getProfile();
    fate.saveProfile({ nick: cur.nick, birth: '' });
    if (el('input-fate-birth')) el('input-fate-birth').value = '';
    updateFateHint();
    syncPageChrome();
    if (lastDate) renderDivine(lastDate); else renderIdle();
  }

  /** 昵称变化后同步页面标题（页头与浏览器标题） */
  function syncPageChrome() {
    if (window.MahjongApp && window.MahjongApp.app && window.MahjongApp.app.syncNick) {
      window.MahjongApp.app.syncNick();
      return;
    }
    var nick = fate ? fate.getNick() : '老婆';
    var node = document.getElementById('logo-nick');
    if (node) node.textContent = nick;
    document.title = nick + '的麻将日记';
  }

  /* ==================== 绑定 ==================== */
  var container = document.getElementById('divine-content');

  function drawBtnOf(e) {
    var t = e.target;
    return (t && t.closest) ? t.closest('.divine-draw-btn') : null;
  }

  if (container) {
    container.addEventListener('click', function (e) {
      if (e.target.closest('.divine-fate-edit')) {
        e.preventDefault();
        openFatePanel();
        return;
      }
      if (e.target.closest('.divine-date-today')) {
        e.preventDefault();
        renderDivine(data.todayStr());
      }
    });

    /* 「开始占卜」是长按蓄力：按下开始填进度，松手/移开即作废。
       用 touch + mouse 两套（与 longpress.js 同思路），不依赖 PointerEvent。 */
    container.addEventListener('touchstart', function (e) {
      var btn = drawBtnOf(e);
      if (btn) beginHold(btn);
    }, { passive: true });

    container.addEventListener('touchmove', function () {
      if (holdBtn) endHold(false);
    }, { passive: true });

    container.addEventListener('touchend', function () {
      if (holdBtn) endHold(false);
    }, { passive: true });

    container.addEventListener('touchcancel', function () {
      if (holdBtn) endHold(false);
    }, { passive: true });

    container.addEventListener('mousedown', function (e) {
      var btn = drawBtnOf(e);
      if (btn) { e.preventDefault(); beginHold(btn); }
    });

    container.addEventListener('mouseup', function () {
      if (holdBtn) endHold(false);
    });

    container.addEventListener('mouseleave', function () {
      if (holdBtn) endHold(false);
    });
  }

  function bindFatePanel() {
    var save = el('btn-fate-save');
    var clear = el('btn-fate-clear');
    var birthInput = el('input-fate-birth');
    if (save) save.addEventListener('click', saveFatePanel);
    if (clear) clear.addEventListener('click', clearFateBirth);
    if (birthInput) birthInput.addEventListener('change', updateFateHint);
    document.querySelectorAll('.close-fate-btn').forEach(function (btn) {
      btn.addEventListener('click', closeFatePanel);
    });
    var ov = el('fate-overlay');
    if (ov) {
      ov.addEventListener('click', function (e) {
        if (e.target === ov) closeFatePanel();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindFatePanel);
  } else {
    bindFatePanel();
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.divine = {
    renderIdle: renderIdle,
    renderDivine: renderDivine,
    openFatePanel: openFatePanel,
    closeFatePanel: closeFatePanel,
    syncPageChrome: syncPageChrome
  };
})();
