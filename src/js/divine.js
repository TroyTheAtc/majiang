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

  /* 农历 1900-2100 年信息（每项低12位为12个月大小月 1=30天 0=29天，高4位为闰月月份 0=无闰） */
  var lunarInfo = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
    0x04ae0, 0x0a4b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
    0x0aad4, 0x092d0, 0x0d954, 0x0d4a0, 0x0da50, 0x1d552, 0x0b550, 0x056a0, 0x0a5b0, 0x0a6d6,
    0x0a2e0, 0x0e950, 0x06e95, 0x0d650, 0x0d2a0, 0x0da50, 0x0aa54, 0x056d0, 0x026d0, 0x092d0,
    0x0d954, 0x0b4a0, 0x0b4a0, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370,
    0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, 0x0a2e0, 0x0d2e0, 0x0d260,
    0x1ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250,
    0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255,
    0x06d20, 0x0ada0, 0x14b63, 0x09370, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4,
    0x0aae0, 0x0a2e0, 0x0d2e0, 0x0d260, 0x1ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04afb,
    0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0,
    0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370, 0x04970, 0x064b0,
    0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, 0x0a2e0, 0x0d2e0, 0x0d260, 0x1ea65, 0x0d530,
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0
  ];

  function getLunarMonthDays(year, month) {
    var idx = year - 1900;
    var info = lunarInfo[idx] || lunarInfo[Math.min(idx, lunarInfo.length - 1)];
    return 29 + ((info >> (month - 1)) & 1);
  }

  function getLunarYearDays(year) {
    var idx = year - 1900;
    var info = lunarInfo[idx] || lunarInfo[lunarInfo.length - 1];
    var total = 0;
    for (var m = 1; m <= 12; m++) total += getLunarMonthDays(year, m);
    var leap = (info >> 12) & 0xf;
    if (leap > 0) total += getLunarMonthDays(year, leap);
    return total;
  }

  function solar2lunar(y, m, d) {
    var base = new Date(1900, 0, 31);
    var target = new Date(y, m - 1, d);
    var offset = Math.floor((target - base) / 86400000);
    if (offset < 0) return { month: 1, day: 1, year: 1900 };

    var ly = 1900;
    while (ly <= 2100) {
      var days = getLunarYearDays(ly);
      if (offset < days) break;
      offset -= days;
      ly++;
    }

    var info = lunarInfo[ly - 1900] || lunarInfo[lunarInfo.length - 1];
    var leapMonth = (info >> 12) & 0xf;
    var lm = 1;
    while (lm <= 12) {
      var md = getLunarMonthDays(ly, lm);
      if (offset < md) break;
      offset -= md;
      if (leapMonth === lm) {
        var lmd = getLunarMonthDays(ly, lm);
        if (offset < lmd) break;
        offset -= lmd;
      }
      lm++;
    }
    return { year: ly, month: lm, day: offset + 1 };
  }

  function formatLunarMD(month, day) {
    var mStr = (lunarMonthNames[month - 1] || '') + '月';
    var dStr = lunarDayNames[day - 1] || ('初' + day);
    return mStr + dStr;
  }

  /* 黄历宜忌：key 为 "月-日"（农历），无则走默认 */
  var almanac = {
    '1-1': { yi: ['祭祀', '祈福', '会友'], ji: ['开市', '嫁娶'] },
    '1-5': { yi: ['祭祀', '会友'], ji: ['博戏', '求财'] },
    '1-15': { yi: ['祭祀', '祈福'], ji: ['博戏', '动土'] },
    '1-8': { yi: ['求财', '纳财', '会友'], ji: [] },
    '1-18': { yi: ['求财', '纳财'], ji: [] },
    '1-28': { yi: ['求财', '纳财', '开市'], ji: [] },
    '2-2': { yi: ['祭祀', '会友'], ji: ['博戏'] },
    '2-8': { yi: ['求财', '纳财'], ji: [] },
    '2-15': { yi: ['祭祀'], ji: ['博戏'] },
    '5-5': { yi: ['祭祀', '祈福'], ji: ['博戏', '动土'] },
    '8-15': { yi: ['会友', '祈福'], ji: ['博戏'] },
    '12-8': { yi: ['祭祀', '祈福'], ji: ['博戏'] },
    '12-23': { yi: ['祭祀'], ji: ['博戏', '求财'] }
  };

  function getAlmanac(lunarMonth, lunarDay) {
    var key = lunarMonth + '-' + lunarDay;
    var a = almanac[key];
    if (a) return { yi: a.yi.slice(), ji: a.ji.slice() };
    /* 默认：初一、十五忌博戏；初八、十八、二十八宜求财 */
    var yi = ['会友'];
    var ji = [];
    if (lunarDay === 1 || lunarDay === 15) ji.push('博戏');
    if (lunarDay === 8 || lunarDay === 18 || lunarDay === 28) yi.push('求财', '纳财');
    return { yi: yi, ji: ji };
  }

  /* 根据宜忌得到基础等级：0=宜守 1=平 2=吉 3=大吉 */
  function almanacToLevel(yi, ji) {
    var hasJiBo = ji.some(function (x) { return x === '博戏' || x === '赌博'; });
    var hasYiCai = yi.some(function (x) { return x === '求财' || x === '纳财'; });
    if (hasJiBo && !hasYiCai) return 0;
    if (hasJiBo && hasYiCai) return 1;
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
  var levelHints = {
    0: '黄历与同期皆宜守，今日少打为妙。',
    1: '黄历平平，见机行事即可。',
    2: '黄历宜求财，可小试手气。',
    3: '黄历与同期皆利，宜出战。'
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
    var levelName = levelNames[finalLevel];
    var hint = levelHints[finalLevel];
    if (same.total > 0) {
      hint = '历史同期' + same.total + '局、胜率' + (same.winRate * 100).toFixed(0) + '%，' + hint;
    }

    var container = document.getElementById('divine-content');
    if (!container) return;
    container.innerHTML =
      '<div class="divine-date">' + dateStr + ' · 农历' + formatLunarMD(lunar.month, lunar.day) + '</div>' +
      '<div class="divine-almanac">' +
        '<p class="divine-yi">宜 ' + (alm.yi.length ? alm.yi.join('、') : '—') + '</p>' +
        '<p class="divine-ji">忌 ' + (alm.ji.length ? alm.ji.join('、') : '—') + '</p>' +
      '</div>' +
      '<p class="divine-level-label">今日麻运</p>' +
      '<div class="divine-level divine-level-' + finalLevel + '">' + levelName + '</div>' +
      '<p class="divine-hint">' + hint + '</p>';
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.divine = { renderDivine: renderDivine };
})();
