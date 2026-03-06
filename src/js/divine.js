/**
 * 麻前占卜：黄历宜忌为主，历史同期胜率微调
 * 等级：大吉 / 吉 / 平 / 宜守（无凶）
 * 鸿蒙对应：pages/DivinePage.ets
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  if (!data) return;

  var lunarMonthNames = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  var lunarDayNames = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

  /* 公历转农历：使用 solarlunar 库（CDN 引入），返回 { year, month, day } 供宜忌与展示用 */
  function solar2lunar(y, m, d) {
    var api = (window.solarLunar && (window.solarLunar.solar2lunar || (window.solarLunar.default && window.solarLunar.default.solar2lunar)))
      ? (window.solarLunar.solar2lunar ? window.solarLunar : window.solarLunar.default)
      : null;
    if (!api || typeof api.solar2lunar !== 'function') {
      return { year: 1900, month: 1, day: 1, gzYear: '' };
    }
    var r = api.solar2lunar(y, m, d);
    if (!r) return { year: 1900, month: 1, day: 1, gzYear: '' };
    return { year: r.lYear, month: r.lMonth, day: r.lDay, gzYear: r.gzYear || '' };
  }

  function formatLunarMD(month, day) {
    var mStr = (lunarMonthNames[month - 1] || '') + '月';
    var dStr = lunarDayNames[day - 1] || ('初' + day);
    return mStr + dStr;
  }


  /* 黄历宜忌：key 为 "月-日"（农历），诸事皆宜/诸事不宜一并写入表内 */
  var almanac = {
    '1-1': { yi: ['诸事皆宜', '祭祀', '祈福', '会友'], ji: ['开市', '嫁娶'] },
    '1-5': { yi: ['祭祀', '会友'], ji: ['诸事不宜', '博戏', '求财'] },
    '1-15': { yi: ['祭祀', '祈福'], ji: ['诸事不宜', '博戏', '动土'] },
    '1-8': { yi: ['诸事皆宜', '求财', '纳财', '会友'], ji: [] },
    '1-18': { yi: ['诸事皆宜', '求财', '纳财'], ji: [] },
    '1-28': { yi: ['诸事皆宜', '求财', '纳财', '开市'], ji: [] },
    '2-2': { yi: ['祭祀', '会友'], ji: ['诸事不宜', '博戏'] },
    '2-8': { yi: ['诸事皆宜', '求财', '纳财'], ji: [] },
    '2-15': { yi: ['祭祀'], ji: ['诸事不宜', '博戏'] },
    '5-5': { yi: ['祭祀', '祈福'], ji: ['诸事不宜', '博戏', '动土'] },
    '8-15': { yi: ['会友', '祈福'], ji: ['诸事不宜', '博戏'] },
    '12-8': { yi: ['祭祀', '祈福'], ji: ['诸事不宜', '博戏'] },
    '12-23': { yi: ['祭祀'], ji: ['诸事不宜', '博戏', '求财'] }
  };

  function getAlmanac(lunarMonth, lunarDay) {
    var key = lunarMonth + '-' + lunarDay;
    var a = almanac[key];
    if (a) return { yi: a.yi.slice(), ji: a.ji.slice() };
    /* 默认：初一、十五忌博戏；初八、十八、二十八宜求财；诸事皆宜/诸事不宜随日写入 */
    var yi = ['会友'];
    var ji = [];
    if (lunarDay === 1 || lunarDay === 15) {
      ji.push('诸事不宜', '博戏');
    } else {
      yi.unshift('诸事皆宜');
    }
    if (lunarDay === 8 || lunarDay === 18 || lunarDay === 28) yi.push('求财', '纳财');
    return { yi: yi, ji: ji };
  }

  /* 根据宜忌得到基础等级：0=宜守 1=平 2=吉 3=大吉（按流程图顺序判定） */
  function almanacToLevel(yi, ji) {
    var hasJiBo = ji.some(function (x) { return x === '博戏' || x === '赌博'; });
    var hasJiAll = ji.some(function (x) { return x === '诸事不宜'; });
    var hasYiCai = yi.some(function (x) { return x === '求财' || x === '纳财'; });
    var hasYiAll = yi.some(function (x) { return x === '诸事皆宜'; });
    /* 忌博戏 或 不宜求财 或 诸事不宜，任一成立 → 0 */
    if (hasJiBo || !hasYiCai || hasJiAll) return 0;
    /* 是否有"诸事皆宜"？ 是 → 3 */
    if (hasYiAll) return 3;
    /* 是否有"宜求财/纳财"？ 是 → 2，否 → 1 */
    if (hasYiCai) return 2;
    return 1;
  }

  /* 历史同期：农历月日相同 */
  function getSamePeriodStats(solarDateStr, records) {
    var parts = solarDateStr.split('-');
    if (parts.length !== 3) return { total: 0, wins: 0, winRate: 0 };
    var lunar = solar2lunar(parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10));
    var same = records.filter(function (r) {
      var p = (r.date || '').split('-');
      if (p.length !== 3) return false;
      var l2 = solar2lunar(parseInt(p[0], 10), parseInt(p[1], 10), parseInt(p[2], 10));
      return l2.month === lunar.month && l2.day === lunar.day;
    });
    var total = same.length;
    var wins = same.filter(function (r) { return (r.amount || 0) > 0; }).length;
    var winRate = total > 0 ? wins / total : 0;
    return { total: total, wins: wins, winRate: winRate };
  }

  /* 同期微调等级：不设阈值，有数据就调 */
  function applySamePeriodAdjust(level, samePeriod) {
    if (samePeriod.total === 0) return level;
    var r = samePeriod.winRate;
    if (r > 0.6) return Math.min(3, level + 1);
    if (r < 0.4) return Math.max(0, level - 1);
    return level;
  }

  var levelNames = ['宜守', '平', '吉', '大吉'];
  var levelImages = ['yishou.png', 'ping.png', 'ji.png', 'daji.png'];
  var levelHints = {
    0: [
      { main: '云掩蟾宫，潮退沙白。守静以待，勿触锋芒。', sub: '运势低迷，今日不宜上桌，静观其变为上。' },
      { main: '月昏星匿，牌山如雾。宜观局，不宜入局。', sub: '手气混沌，看不清牌路，旁观比参战更明智。' },
      { main: '霜落寒窗，蛰虫俯穴。今日之局，避之则吉。', sub: '天时不利，蛰伏休息，强行出战恐有损失。' },
      { main: '逆风执炬，必有烧手之患。暂敛羽翼，以伺天时。', sub: '逆势而行容易自伤，今日宜守不宜攻。' },
      { main: '水涸石出，鱼困浅滩。非战之罪，实乃势不至。', sub: '时机未到，非你技不如人，改日再战为佳。' }
    ],
    1: [
      { main: '风过竹林，声动而叶不惊。可往，不可尽往。', sub: '有机会但需谨慎，小玩几局试探，不可恋战。' },
      { main: '溪云初起，山雨未至。小酌可也，酣饮不宜。', sub: '局势未明，小试手气无妨，大动干戈则凶。' },
      { main: '雾锁津渡，舟子缓行。试探深浅，再定去留。', sub: '先打几局摸摸底，顺风则进，逆风则退。' },
      { main: '春冰未泮，履之需谨慎。半步可试，大步则危。', sub: '时机尚可但不稳固，小动作安全，大动作冒险。' },
      { main: '棋到中局，胜负未分。观彼动静，再应其变。', sub: '今日变数较多，随机应变，不可固守一策。' }
    ],
    2: [
      { main: '东南有风，送暖入怀。轻舟可发，莫恋远方。', sub: '手气不错，可以出战，但记得见好就收。' },
      { main: '晨光初透，雀噪檐前。小利可图，大贪招损。', sub: '今日有小胜之机，贪心恋战则反噬。' },
      { main: '新雨之后，苔痕渐绿。顺势而取，过之则枯。', sub: '运势上升期，抓住机会，但不可过度索取。' },
      { main: '酒至微醺，花看半开。此中真意，适可而止。', sub: '今日佳境正当时，懂得收手才能留住胜果。' },
      { main: '雁阵南来，气爽天高。小试锋芒，见好便收。', sub: '天时地利兼备，适度参与，忌持久战。' }
    ],
    3: [
      { main: '紫微临位，四方来朝。此时不举，更待何时？', sub: '运势爆棚，今日宜主动出击，放手一搏。' },
      { main: '天朗气清，惠风和畅。顺势而为，无往不利。', sub: '诸事顺遂，牌运亨通，大胆施展拳脚。' },
      { main: '潮平两岸阔，风正一帆悬。今日之局，如臂使指。', sub: '天时地利人和，今日打牌得心应手，无往不胜。' },
      { main: '三星高照，五福临门。牌运如泉涌，取之不竭。', sub: '吉星高照，手气正旺，今日多打几局有利可图。' },
      { main: '江流天地，月涌大江。气运如虹，当仁不让。', sub: '气势如虹，今日宜乘胜追击，扩大战果。' }
    ]
  };

  function renderDivine(dateStr) {
    if (!dateStr) dateStr = new Date().toISOString().slice(0, 10);
    var parts = dateStr.split('-');
    if (parts.length !== 3) return;
    var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    var lunar = solar2lunar(y, m, d);
    var alm = getAlmanac(lunar.month, lunar.day);
    var baseLevel = almanacToLevel(alm.yi, alm.ji);
    var records = data.getRecords();
    var same = getSamePeriodStats(dateStr, records);
    var finalLevel = applySamePeriodAdjust(baseLevel, same);

    var hints = levelHints[finalLevel];
    var chosen = hints[Math.floor(Math.random() * hints.length)];
    var samePrefix = same.total > 0 ? (same.winRate >= 0.5 ? '历史同期无双牌浪，' : '历史同期手气欠佳，') : '';
    var hintMain = chosen.main;
    var hintSub = chosen.sub;

    var idx = hintMain.indexOf('。');
    var line1 = idx >= 0 ? hintMain.slice(0, idx + 1) : hintMain;
    var line2 = idx >= 0 ? hintMain.slice(idx + 1).trim() : '';
    var mainMarkup = line2
      ? '<span class="divine-quote-line1">' + data.escapeHtml(line1) + '</span><span class="divine-quote-line2">' + data.escapeHtml(line2) + '</span>'
      : data.escapeHtml(hintMain);

    var levelImg = levelImages[finalLevel];
    var levelAlt = levelNames[finalLevel];

    var container = document.getElementById('divine-content');
    if (!container) return;
    container.innerHTML =
      '<div class="divine-date">' + dateStr + ' · ' + (lunar.gzYear ? lunar.gzYear + '年' : '') + formatLunarMD(lunar.month, lunar.day) + '</div>' +
      '<div class="divine-almanac">' +
        '<p class="divine-yi">宜 ' + (alm.yi.length ? alm.yi.join('、') : '—') + '</p>' +
        '<p class="divine-ji">忌 ' + (alm.ji.length ? alm.ji.join('、') : '—') + '</p>' +
      '</div>' +
      '<p class="divine-level-label">今日麻运</p>' +
      '<div class="divine-level divine-level-' + finalLevel + '"><img src="assets/images/' + levelImg + '?v=1.5.4" alt="' + levelAlt + '" class="divine-level-img" decoding="async" /></div>' +
      '<p class="divine-hint divine-hint-main">' + mainMarkup + '</p>' +
      '<div class="divine-hint-divider"></div>' +
      '<p class="divine-hint divine-hint-sub">' + data.escapeHtml(hintSub) + '</p>' +
      (samePrefix ? '<p class="divine-hint divine-hint-same">' + data.escapeHtml(samePrefix) + '</p>' : '');
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.divine = { renderDivine: renderDivine };
})();
