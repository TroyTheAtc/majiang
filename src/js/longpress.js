/**
 * 长按交互工具：牌谱列表项与对象子标签共用一套。
 *
 * 为什么要抽出来：原先 list.js 与 add.js 各写了一份 touch/mouse 双套长按逻辑
 * （约 200 行重复），改一处得改两处，且行为已经开始漂移
 * （add.js 把 touchcancel 接到了"触摸结束"的处理上，触摸被系统取消时会误弹输入框）。
 *
 * 用法：
 *   longPress.bind(rootEl, {
 *     itemSelector: '.record-item',            // 可长按的元素
 *     isExcluded:  function (target) {...},    // 可选：命中这些目标是"普通点击"，不参与长按
 *     onLongPress: function (el) {...},        // 可选：长按触发后的业务动作
 *     onTap:       function (el, ev) {...},    // 可选：触摸端短按（会 preventDefault，避免与 click 重复触发）
 *     clearFlagOnLift: false,                  // 可选：抬手后保留标记（交给 click 收回）
 *     swallowReleaseClick: true                // 可选：吞掉长按抬手时浏览器补发的那次 click
 *   });
 *
 * 说明：长按触发后会给元素打 `el[flagProp] = true` 标记，业务侧在 click 里
 * 读到该标记就吞掉这次点击（长按只是"亮出操作按钮"，不该跳去编辑页）。
 * 而"抬手时补发的那次 click"由 `swallowReleaseClick` 在捕获阶段直接吞掉，
 * 这样刚亮出的按钮不会被立刻收回，用户才点得到。
 */
(function () {
  'use strict';

  var DEFAULTS = {
    ms: 500,
    activeClass: 'show-delete',
    flagProp: '_longPressShown',
    shakeClass: 'shake',
    vibrate: 40,
    /* 抬手后是否清掉"已长按"标记。
       true  —— 抬手即清。
       false —— 保留标记，交给随后那次 click 负责"收回删除按钮"。 */
    clearFlagOnLift: true,
    /* 是否吞掉"长按抬手时浏览器补发的那一次 click"。
       长按结束（touchstart…500ms…touchend，或 mousedown…500ms…mouseup）后，
       浏览器仍会补发一次 click。那次 click 属于同一次手势的尾巴，
       若不吞掉，就会把刚亮出的删除按钮又收回去、甚至跳进别的页面
       （列表项原本就是"长按亮出删除按钮 → 一抬手跳进编辑页"）。
       置 true 时由本工具在捕获阶段吞掉这一次 click（含 stopPropagation），
       业务侧的 click 处理器无需关心。 */
    swallowReleaseClick: false,
    guardProp: '_releaseClickGuard',
    /* 防护有效期：超过这么久仍未等到那次 click（浏览器差异等），就不再拦，
       避免误吞用户后来的正常点击。 */
    guardMs: 1500
  };

  function optionsOf(opts) {
    var o = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      o[k] = (opts && opts[k] != null) ? opts[k] : DEFAULTS[k];
    });
    o.itemSelector = (opts && opts.itemSelector) || '';
    o.onLongPress = (opts && opts.onLongPress) || null;
    o.onTap = (opts && opts.onTap) || null;
    o.isExcluded = (opts && opts.isExcluded) || null;
    return o;
  }

  /** 清掉 root 下所有已亮出操作按钮的元素 */
  function clearActive(root, opts) {
    if (!root) return;
    var o = optionsOf(opts);
    if (!o.itemSelector) return;
    root.querySelectorAll(o.itemSelector + '.' + o.activeClass).forEach(function (el) {
      el.classList.remove(o.activeClass);
      el[o.flagProp] = false;
      el[o.guardProp] = 0;
    });
  }

  /** 解除 root 下所有元素遗留的"补发 click"防护 */
  function clearGuards(root, o) {
    if (!root || !o.itemSelector) return;
    root.querySelectorAll(o.itemSelector).forEach(function (el) { el[o.guardProp] = 0; });
  }

  function bind(root, opts) {
    if (!root) return;
    var o = optionsOf(opts);
    if (!o.itemSelector) return;

    var timer = null;
    var activeItem = null;
    var moved = false;
    var longPressed = false;

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function excluded(target) {
      return !!(o.isExcluded && target && o.isExcluded(target));
    }

    function start(item) {
      activeItem = item;
      moved = false;
      longPressed = false;
      clearTimer();
      timer = setTimeout(function () {
        timer = null;
        longPressed = true;
        clearActive(root, o);
        item.classList.add(o.activeClass);
        item[o.flagProp] = true;
        /* 记下长按发生的时刻：抬手时浏览器补发的 click 靠它识别 */
        if (o.swallowReleaseClick) item[o.guardProp] = Date.now();
        item.classList.add(o.shakeClass);
        setTimeout(function () { item.classList.remove(o.shakeClass); }, 350);
        if (navigator.vibrate) navigator.vibrate(o.vibrate);
        if (o.onLongPress) o.onLongPress(item);
      }, o.ms);
    }

    function onStart(e) {
      /* 新手势开始：解除上一次长按遗留的"补发 click"防护。
         （万一浏览器没补发那次 click，也不能让它误吞用户后来这一下。） */
      if (o.swallowReleaseClick) clearGuards(root, o);
      if (excluded(e.target)) return;
      var item = e.target && e.target.closest && e.target.closest(o.itemSelector);
      if (!item) return;
      start(item);
    }

    function onMove() {
      moved = true;
      clearTimer();
    }

    function onEnd(e) {
      if (!activeItem) return;
      if (longPressed) {
        /* 长按刚触发，这次抬手不算"点击" */
        if (o.clearFlagOnLift) activeItem[o.flagProp] = false;
        clearTimer();
        activeItem = null;
        return;
      }
      if (moved) {
        clearTimer();
        activeItem = null;
        return;
      }
      clearTimer();
      /* 只有业务方提供了 onTap（触摸端自处理点击）时才吞掉浏览器随后生成的 click；
         否则必须放行，否则按钮的 click 事件会被一起吃掉。 */
      if (e.type === 'touchend' && o.onTap) {
        e.preventDefault();
        o.onTap(activeItem, e);
      }
      activeItem = null;
    }

    /* 触摸被系统取消（来电话、手势返回等）：只收尾，绝不当作"点击"处理 */
    function onCancel() {
      clearTimer();
      activeItem = null;
    }

    function onMouseUp() {
      if (!activeItem) return;
      if (longPressed && o.clearFlagOnLift) activeItem[o.flagProp] = false;
      clearTimer();
      activeItem = null;
    }

    /* 捕获阶段吞掉"长按抬手时浏览器补发的那一次 click"（只吞一次）。 */
    function onCaptureClick(e) {
      var t = e.target;
      var item = t && t.closest && t.closest(o.itemSelector);
      if (!item) return;
      var at = item[o.guardProp];
      if (!at) return;
      item[o.guardProp] = 0;
      if (Date.now() - at > o.guardMs) return;
      e.preventDefault();
      e.stopPropagation();
    }

    root.addEventListener('touchstart', onStart, { passive: true });
    root.addEventListener('touchmove', onMove, { passive: true });
    root.addEventListener('touchend', onEnd, { passive: false });
    root.addEventListener('touchcancel', onCancel, { passive: true });
    root.addEventListener('mousedown', onStart);
    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseup', onMouseUp);
    root.addEventListener('mouseleave', clearTimer);
    if (o.swallowReleaseClick) root.addEventListener('click', onCaptureClick, true);
  }

  window.MahjongApp = window.MahjongApp || {};
  window.MahjongApp.longPress = { bind: bind, clearActive: clearActive };
})();
