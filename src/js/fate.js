/**
 * 命主档案 + 麻前占卜引擎（确定性）
 * 鸿蒙对应：model/Fate.ets + 偏好存储
 *
 * 设计要点（改动前务必读完）
 * 1) 结果是纯函数：PRNG(命主指纹 + 日期)。同一人同一天必然同一结果，不同人不同结果。
 * 2) 占卜**不使用战绩数据**。否则"占卜 vs 战绩"的对账就成了循环论证，毫无说服力。
 *    也正因如此，历史日期可以随时回溯重算——上线当天即有完整对账样本。
 * 3) 当日结果就地缓存（只存档位）。缓存用 profileHash 绑定命主：改生日=换命，自动重算；
 *    缓存同时保证"当天不变脸"（不因当天补记战绩等原因导致当日结果变化）。
 * 4) 参数由离线校准确定，勿随手改。跨 2026–2028 × 100 个生辰交叉验证：
 *    宜守约 20% / 平约 38% / 吉约 30% / 大吉约 12%；
 *    两个随机人生辰在同一天的档位差 94% 落在相邻档内（即"温和"强度）。
 */
(function () {
  'use strict';

  var data = window.MahjongApp && window.MahjongApp.data;
  if (!data) return;

  /* ==================== 常量（校准所得，改动需重新校准） ==================== */
  var PROFILE_KEY = 'mahjong_fate_profile';
  var CACHE_KEY = 'mahjong_divine_cache';
  var CACHE_V = 2;
  var CACHE_KEEP_DAYS = 400;
  var DEFAULT_NICK = '老婆';
  var NICK_MAX = 12;

  var LEVEL_NAMES = ['宜守', '平', '吉', '大吉'];

  /* 天干五行 */
  var GAN_WX = {
    甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
    己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水'
  };
  var WX_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }; /* 我生 */
  var WX_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };    /* 我克 */

  /* 生克得分：打牌求财，故"我克者为财"最利，"克我"最忌 */
  var REL_SCORE = { same: 0, shengMe: 0.08, iKe: 0.25, iSheng: -0.15, keMe: -0.25 };
  var REL_LABEL = { same: '比和', shengMe: '生我·得助', iKe: '我克·得财', iSheng: '我生·泄气', keMe: '克我·受制' };

  /* 日辰因子权重 */
  var W_TIAN_SHEN = 0.22;  /* 黄道/黑道十二神 */
  var W_XIU = 0.14;        /* 二十八宿值日 */
  var W_YI_JI = 0.18;      /* 官方黄历宜忌里的 纳财/开市 */
  var W_JC_GOOD = 0.10;    /* 建除值日：成/开/定 */
  var W_JC_BAD = 0.14;     /* 建除值日：破/闭 */

  /* 个人微扰幅度：0.40 = 温和档 */
  var PERSONAL_JITTER = 0.40;

  /* 分档阈值（跨 2026-2028 三年 × 100 生辰校准，基线 0.5） */
  var TH_LEVEL = [0.1628, 0.5698, 0.9260];

  /* ==================== 命主档案 ==================== */
  function readRaw() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') return p;
      }
    } catch (e) {}
    return null;
  }

  function normalizeProfile(p) {
    p = p || {};
    var nick = typeof p.nick === 'string' ? p.nick.trim() : '';
    var birth = typeof p.birth === 'string' ? p.birth.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) birth = '';
    return {
      nick: nick ? nick.slice(0, NICK_MAX) : DEFAULT_NICK,
      birth: birth,
      seed: typeof p.seed === 'string' ? p.seed : ''
    };
  }

  function getProfile() {
    return normalizeProfile(readRaw());
  }

  /** 存储写失败统一提示（复用 data.js 的"每次会话只提示一次"，避免各处各弹一条） */
  function notifyStorageFailure() {
    var d = window.MahjongApp && window.MahjongApp.data;
    if (d && d.notifySaveFailure) d.notifySaveFailure();
  }

  function writeProfile(p) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(normalizeProfile(p)));
      return true;
    } catch (e) {
      notifyStorageFailure();
      return false;
    }
  }

  function saveProfile(obj) {
    var cur = getProfile();
    var next = normalizeProfile({
      nick: obj && obj.nick != null ? obj.nick : cur.nick,
      birth: obj && obj.birth != null ? obj.birth : cur.birth,
      seed: cur.seed
    });
    /* 生日变了 = 换命：旧缓存与旧对账口径全部失效 */
    var birthChanged = next.birth !== cur.birth;
    writeProfile(next);
    if (birthChanged) clearCache();
    return next;
  }

  function getNick() {
    return getProfile().nick;
  }

  function setNick(nick) {
    return saveProfile({ nick: nick }).nick;
  }

  function hasBirth() {
    return !!getProfile().birth;
  }

  /**
   * 设备兜底种子：没填生日时用它保证"同一台设备同一天结果恒定"。
   * 只在首次生成一次随机值，之后固定持久化（不违反确定性）。
   */
  var memSeed = '';

  function deviceSeed() {
    /* 会话内记忆：万一落盘失败，也不能每次调用都换一个随机种子，
       否则"同一人同一天结果恒定"会被打破（同一天反复出不同结果）。 */
    if (memSeed) return memSeed;
    var raw = readRaw();
    if (raw && typeof raw.seed === 'string' && raw.seed) {
      memSeed = raw.seed;
      return memSeed;
    }
    var s = '';
    for (var i = 0; i < 4; i++) s += Math.floor(Math.random() * 0x100000000).toString(36);
    s += Date.now().toString(36);
    memSeed = s;
    try {
      var p = normalizeProfile(raw);
      p.seed = memSeed;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch (e) {
      notifyStorageFailure();
    }
    return memSeed;
  }

  /** 占卜指纹：只用生日（或设备种子）。昵称不影响结果——改个名字不该改命 */
  function identityKey(profile) {
    var p = profile || getProfile();
    return p.birth ? ('b:' + p.birth) : ('d:' + deviceSeed());
  }

  function profileHash(profile) {
    return hash32('fate|' + identityKey(profile), 0x1b873593).toString(36);
  }

  /* ==================== 确定性随机 ==================== */
  function hash32(str, salt) {
    var h = (2166136261 ^ (salt || 0)) >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 0~1 的确定性随机：同 identity + 同 tag + 同 slot 恒等。
   * @param identity 命主指纹（也可直接传 compute() 返回的 seed）
   * @param tag      用途标签（传日期即"按天取数"，传 'hint' 即"取文案"），用于隔离不同用途
   * @param slot     同用途内的序号
   */
  function rand01(identity, tag, slot) {
    var s1 = hash32(identity + '|' + tag, 0x9e3779b9);
    var s2 = hash32(tag + '|' + identity, 0x85ebca6b);
    var rnd = mulberry32((s1 ^ s2 ^ Math.imul(slot || 1, 2654435761)) >>> 0);
    /* 丢弃首个输出：种子直接参与首轮状态混合，首个输出与种子相关性偏强。
       实测（365 天分 8 桶）首值卡方 22.0 → 丢首值后 3.0，分布明显更均匀。 */
    rnd();
    return rnd();
  }

  /* ==================== 历法与命理 ==================== */
  function getSolar() {
    return typeof window !== 'undefined' ? window.Solar : null;
  }

  function lunarOf(dateStr) {
    var S = getSolar();
    if (!S) return null;
    var p = dateStr.split('-');
    if (p.length !== 3) return null;
    var y = parseInt(p[0], 10), m = parseInt(p[1], 10), d = parseInt(p[2], 10);
    if (!y || !m || !d) return null;
    try {
      return S.fromYmd(y, m, d).getLunar();
    } catch (e) {
      return null;
    }
  }

  /** 命主的日主（出生日柱天干）→ 五行。拿不到生日或库未加载时返回 null */
  function getDayMaster(birth) {
    if (!birth) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
    var lunar = lunarOf(birth);
    if (!lunar || typeof lunar.getEightChar !== 'function') return null;
    try {
      var gan = lunar.getEightChar().getDayGan();
      if (!gan) return null;
      return { gan: gan, wx: GAN_WX[gan] || '', zhi: lunar.getDayZhi ? lunar.getDayZhi() : '' };
    } catch (e) {
      return null;
    }
  }

  /** 当日五行 相对 命主五行 的关系 */
  function relationOf(myWx, dayWx) {
    if (!myWx || !dayWx) return null;
    if (myWx === dayWx) return 'same';
    if (WX_SHENG[myWx] === dayWx) return 'iSheng';
    if (WX_SHENG[dayWx] === myWx) return 'shengMe';
    if (WX_KE[myWx] === dayWx) return 'iKe';
    return 'keMe';
  }

  function relText(kind, myWx, dayWx) {
    if (!kind) return '';
    switch (kind) {
      case 'same': return myWx + '与' + dayWx + '比和';
      case 'iSheng': return myWx + '生' + dayWx;
      case 'shengMe': return dayWx + '生' + myWx;
      case 'iKe': return myWx + '克' + dayWx;
      default: return dayWx + '克' + myWx;
    }
  }

  /**
   * 日辰因子：与人无关的客观黄历项。
   * 返回 { score, items:[{ label, delta }] }，items 供页面展示依据。
   */
  function dayFactor(lunar) {
    var items = [];
    var f = 0;
    if (!lunar) return { score: 0, items: items };

    function call(fn) {
      try { return typeof lunar[fn] === 'function' ? lunar[fn]() : ''; } catch (e) { return ''; }
    }

    var ts = call('getDayTianShen'), tsLuck = call('getDayTianShenLuck');
    if (tsLuck) {
      var dts = tsLuck === '吉' ? W_TIAN_SHEN : -W_TIAN_SHEN;
      f += dts;
      items.push({ label: (ts || '值日') + '（' + tsLuck + '道）', delta: dts });
    }

    var xiu = call('getXiu'), xiuLuck = call('getXiuLuck');
    if (xiuLuck) {
      var dx = xiuLuck === '吉' ? W_XIU : -W_XIU;
      f += dx;
      items.push({ label: (xiu ? xiu + '宿' : '值宿') + '（' + xiuLuck + '）', delta: dx });
    }

    var yi = [], ji = [];
    try { yi = lunar.getDayYi() || []; } catch (e) {}
    try { ji = lunar.getDayJi() || []; } catch (e) {}
    var has = function (arr, k) { return arr.indexOf(k) >= 0; };
    if (has(yi, '纳财') || has(yi, '开市')) {
      f += W_YI_JI;
      items.push({ label: '宜纳财/开市', delta: W_YI_JI });
    }
    if (has(ji, '纳财') || has(ji, '开市')) {
      f -= W_YI_JI;
      items.push({ label: '忌纳财/开市', delta: -W_YI_JI });
    }

    var jc = call('getZhiXing');
    if (jc === '成' || jc === '开' || jc === '定') {
      f += W_JC_GOOD;
      items.push({ label: '建除' + jc + '日', delta: W_JC_GOOD });
    } else if (jc === '破' || jc === '闭') {
      f -= W_JC_BAD;
      items.push({ label: '建除' + jc + '日', delta: -W_JC_BAD });
    }

    return { score: f, items: items };
  }

  function levelOf(score) {
    if (score < TH_LEVEL[0]) return 0;
    if (score < TH_LEVEL[1]) return 1;
    if (score < TH_LEVEL[2]) return 2;
    return 3;
  }

  /* ==================== 核心：算一天的麻运（纯函数） ==================== */
  function compute(dateStr, profile) {
    var prof = profile || getProfile();
    var identity = identityKey(prof);
    var lunar = lunarOf(dateStr);
    var dm = getDayMaster(prof.birth);

    var jitter = (rand01(identity, dateStr, 1) - 0.5) * PERSONAL_JITTER;

    var df = dayFactor(lunar);
    var dayGan = '', dayWx = '', dayGanZhi = '';
    var rel = null, relScore = 0;
    if (lunar) {
      try { dayGan = lunar.getDayGan(); } catch (e) {}
      try { dayGanZhi = lunar.getDayInGanZhi(); } catch (e) {}
      dayWx = GAN_WX[dayGan] || '';
      rel = dm ? relationOf(dm.wx, dayWx) : null;
      relScore = rel ? REL_SCORE[rel] : 0;
    }

    var base = 0.5;
    var score = base + df.score + relScore + jitter;

    var out = {
      date: dateStr,
      level: levelOf(score),
      levelName: LEVEL_NAMES[levelOf(score)],
      score: score,
      base: base,
      jitter: jitter,
      seed: identity + '#' + dateStr,
      hasBirth: !!dm,
      hasAlmanac: !!lunar,
      /* 命主 */
      masterGan: dm ? dm.gan : '',
      masterWx: dm ? dm.wx : '',
      /* 当日 */
      dayGan: dayGan,
      dayGanZhi: dayGanZhi,
      dayWx: dayWx,
      rel: rel,
      relLabel: rel ? REL_LABEL[rel] : '',
      relText: rel ? relText(rel, dm.wx, dayWx) : '',
      relScore: relScore,
      dayFactors: df.items,
      dayFactorScore: df.score
    };

    /* 展示用黄历信息 */
    if (lunar) {
      var call = function (fn) { try { return typeof lunar[fn] === 'function' ? lunar[fn]() : ''; } catch (e) { return ''; } };
      out.lunarText = (call('getYearInGanZhi') ? call('getYearInGanZhi') + '年 ' : '') +
        call('getMonthInChinese') + '月' + call('getDayInChinese');
      out.jianChu = call('getZhiXing');
      out.tianShen = call('getDayTianShen');
      out.tianShenLuck = call('getDayTianShenLuck');
      out.xiu = call('getXiu');
      out.xiuLuck = call('getXiuLuck');
      out.yi = (function () { try { return lunar.getDayYi() || []; } catch (e) { return []; } })();
      out.ji = (function () { try { return lunar.getDayJi() || []; } catch (e) { return []; } })();
      out.caiPos = call('getDayPositionCai');
      out.caiPosDesc = call('getDayPositionCaiDesc');
      out.xiPos = call('getDayPositionXi');
      out.xiPosDesc = call('getDayPositionXiDesc');
      out.chong = call('getDayChongShengXiao');
      out.sha = call('getDaySha');
      out.pengZu = (call('getPengZuGan') + ' ' + call('getPengZuZhi')).trim();
    } else {
      out.lunarText = '';
      out.yi = [];
      out.ji = [];
    }
    return out;
  }

  /* ==================== 当日结果缓存 ==================== */
  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function writeCache(cache) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {}
  }

  function trimCache(cache) {
    var keys = Object.keys(cache).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); });
    if (keys.length <= CACHE_KEEP_DAYS) return cache;
    keys.sort();
    var drop = keys.slice(0, keys.length - CACHE_KEEP_DAYS);
    drop.forEach(function (k) { delete cache[k]; });
    return cache;
  }

  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  }

  /** 读缓存；缺失则计算并落缓存。缓存保证"当天结果不变脸" */
  function getDay(dateStr, profile) {
    var prof = profile || getProfile();
    var ph = profileHash(prof);
    var cache = readCache();
    var hit = cache[dateStr];
    var res;
    if (hit && hit.v === CACHE_V && hit.ph === ph) {
      res = compute(dateStr, prof);
      /* 以缓存档位为准（算法版本未变时二者必然一致；若不一致说明参数被改过，
         也仍以缓存为准，避免用户当天看到的结果发生跳变） */
      res.level = hit.lv;
      res.levelName = LEVEL_NAMES[hit.lv];
      res.fromCache = true;
      return res;
    }
    res = compute(dateStr, prof);
    cache[dateStr] = { v: CACHE_V, ph: ph, lv: res.level };
    trimCache(cache);
    writeCache(cache);
    res.fromCache = false;
    return res;
  }

  /**
   * 历史回填：对已有战绩的日期补算当日麻运。
   * 因为占卜不含战绩数据，所以可以放心回溯——上线即有对账样本。
   */
  function backfill(records, profile) {
    var prof = profile || getProfile();
    var ph = profileHash(prof);
    var cache = readCache();
    var today = data.todayStr();
    var seen = {};
    var added = 0;
    (records || []).forEach(function (r) {
      var d = r && r.date;
      if (!d || seen[d] || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      if (d > today) return;               /* 不预支未来 */
      seen[d] = 1;
      var hit = cache[d];
      if (hit && hit.v === CACHE_V && hit.ph === ph) return;
      cache[d] = { v: CACHE_V, ph: ph, lv: compute(d, prof).level };
      added++;
    });
    if (added) {
      trimCache(cache);
      writeCache(cache);
    }
    return added;
  }

  /* ==================== 应验对账（占卜 vs 实际战绩） ==================== */
  /**
   * 判定口径：
   *   吉/大吉 → 当日有赢即应验
   *   宜守     → 当日未赢（≤0）即应验（即"避损"）
   *   平       → 无倾向，不参与判定
   * 只有"同一命主算过"的日期参与，避免改生日后新旧结果混在一起。
   */
  function getVerification(records, recentDays) {
    recentDays = recentDays || 30;
    var byDate = {};
    (records || []).forEach(function (r) {
      if (!r || !r.date) return;
      var amt = Number(r.amount) || 0;
      byDate[r.date] = (byDate[r.date] || 0) + amt;
    });

    var cache = readCache();
    var ph = profileHash(getProfile());
    var rows = [];
    Object.keys(byDate).forEach(function (d) {
      var c = cache[d];
      if (!c || c.v !== CACHE_V || c.ph !== ph) return;
      if (c.lv === 1) return;
      var total = byDate[d];
      rows.push({
        date: d,
        level: c.lv,
        total: total,
        hit: c.lv >= 2 ? total > 0 : total <= 0
      });
    });
    rows.sort(function (a, b) { return b.date.localeCompare(a.date); });

    var today = data.todayStr();
    var todayRow = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].date === today) { todayRow = rows[i]; break; }
    }

    var cutoff = data.todayStr(Date.now() - recentDays * 86400000);
    var recent = rows.filter(function (r) { return r.date >= cutoff; });
    var aggressive = recent.filter(function (r) { return r.level >= 2; });
    var defensive = recent.filter(function (r) { return r.level === 0; });
    var hits = recent.filter(function (r) { return r.hit; }).length;

    return {
      today: todayRow,
      all: rows,
      recent: recent,
      recentDays: recentDays,
      hitCount: hits,
      total: recent.length,
      hitRate: recent.length ? hits / recent.length : 0,
      aggressiveTotal: aggressive.length,
      aggressiveHits: aggressive.filter(function (r) { return r.hit; }).length,
      defensiveTotal: defensive.length,
      defensiveHits: defensive.filter(function (r) { return r.hit; }).length
    };
  }

  /* ==================== 导入导出 ==================== */
  function getExportProfile() {
    var p = getProfile();
    return { nick: p.nick, birth: p.birth };
  }

  function applyImportProfile(obj) {
    if (!obj || typeof obj !== 'object') return false;
    var cur = getProfile();
    var next = {
      nick: typeof obj.nick === 'string' && obj.nick.trim() ? obj.nick.trim() : cur.nick,
      birth: typeof obj.birth === 'string' ? obj.birth.trim() : cur.birth,
      seed: cur.seed
    };
    var n = normalizeProfile(next);
    if (n.birth !== cur.birth) clearCache();
    writeProfile(n);
    return true;
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.fate = {
    DEFAULT_NICK: DEFAULT_NICK,
    LEVEL_NAMES: LEVEL_NAMES,
    PROFILE_KEY: PROFILE_KEY,
    CACHE_KEY: CACHE_KEY,
    getProfile: getProfile,
    saveProfile: saveProfile,
    getNick: getNick,
    setNick: setNick,
    hasBirth: hasBirth,
    identityKey: identityKey,
    profileHash: profileHash,
    getDayMaster: getDayMaster,
    compute: compute,
    getDay: getDay,
    backfill: backfill,
    clearCache: clearCache,
    getVerification: getVerification,
    getExportProfile: getExportProfile,
    applyImportProfile: applyImportProfile,
    /* 确定性随机 0~1：渲染层取文案也走它，保证"同人同天同一句" */
    rand01: rand01,
    /* 测试用 */
    _internal: {
      hash32: hash32, mulberry32: mulberry32, rand01: rand01,
      relationOf: relationOf, relText: relText, levelOf: levelOf,
      TH_LEVEL: TH_LEVEL, PERSONAL_JITTER: PERSONAL_JITTER, REL_SCORE: REL_SCORE,
      GAN_WX: GAN_WX
    }
  };
})();
