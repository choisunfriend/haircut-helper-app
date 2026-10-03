/* ==========================================================================
 * 39-two-pass-render.js — 슬라이더에서 손 뗀 뒤 그림이 늦게 바뀌는 문제
 *
 * 로드 위치: index.html 맨 끝(38-diag-copy-cam.js 다음).
 *
 * 실측(4GB 폰, 2026-10-03): 값이 바뀐 뒤 조정 화면을 한 번 그리는 데 712~1730ms.
 *   renderFrame 12549ms/10회 ≈ projectHair3DToView 11358ms/9회 — 그리기의 거의 전부가 헤어 투영이고,
 *   그 안에서 가닥을 약 7,400개(모델 21,920개 중 솎기 2.97) 새로 계산합니다(가닥 하나 ≈ 0.11ms).
 *
 * 고침: 값이 바뀐 직후에는 가닥의 1/3만으로 먼저 그리고(빠른 그림), 손이 쉬면 전체로 다시 그립니다(완성 그림).
 *   · 완성 그림은 지금과 똑같습니다 — 가닥 수 목표(HAIR3D_RENDER.targetMul)를 빠른 그림 동안만 잠깐 낮춥니다.
 *   · 솎는 간격이 정확히 3배라 빠른 그림에 쓴 가닥은 완성 그림에도 그대로 들어갑니다.
 *     28번의 가닥별 기억 덕분에 완성 그림은 나머지 2/3만 계산합니다 → 버리는 계산이 없습니다.
 *   · 값이 그대로일 때(뷰 전환 등)와 충분히 빠른 기기(완성 그림이 minMs 이하)는 예전처럼 바로 완성 그림.
 *   · 슬라이더를 잡고 있는 동안에는 완성 그림을 미룹니다(손가락이 멈춰 버리지 않게).
 *
 * 끄기: TWO_PASS.on=false · 빠른 그림 비율 TWO_PASS.frac (기본 1/3 · 숱이 너무 비어 보이면 0.5)
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[두 번 그리기]';
  var TP = W.TWO_PASS = Object.assign({
    on: true,
    frac: 1 / 3,       // 빠른 그림의 가닥 비율
    settleMs: 350,     // 빠른 그림 뒤 이만큼 조용하면 완성 그림
    minMs: 250,        // 완성 그림이 이보다 빠른 기기는 두 번 그리지 않음
    quick: 0, full: 0, lastQuickMs: 0, lastFullMs: 0
  }, W.TWO_PASS || {});

  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function scr() { try { return currentScreen; } catch (e) { return ''; } }
  function stateSig() {
    try {
      var m = state.hair3Dneutral;
      if (!m || !m.strands) return null;
      return adjCacheSig(m, null, 1) + '\u00a7' + (typeof adjFilterSig === 'function' ? adjFilterSig() : '');
    } catch (e) { return null; }
  }

  var origProj = W.projectHair3DToView, origFrame = W.renderAdjustFrame;
  if (typeof origProj !== 'function' || typeof origFrame !== 'function' || typeof HAIR3D_RENDER === 'undefined' || typeof adjCacheSig !== 'function') {
    console.warn(TAG + ' 필요한 함수가 없어 건너뜀');
    return;
  }

  var inAdjust = false;      // renderAdjustFrame 안에서 불린 투영만 대상
  var fullSig = null;        // 마지막 완성 그림의 상태
  var missMs = Infinity;     // 값이 바뀐 뒤의 완성 그림 한 번에 걸리는 시간(측정 전에는 느리다고 봄)
  var forceFull = false, timer = null, finger = false, quickCost = 0;

  W.renderAdjustFrame = function () {
    inAdjust = true;
    try { return origFrame.apply(this, arguments); } finally { inAdjust = false; }
  };

  function schedule(ms) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(runFull, ms == null ? TP.settleMs : ms);
  }
  function runFull() {
    timer = null;
    if (scr() !== 'adjust') return;
    if (finger) return schedule(200);                // 슬라이더를 잡고 있으면 미룸
    forceFull = true;
    try { W.renderAdjustFrame(); }
    catch (e) { console.warn(TAG + ' 완성 그림 실패', e); }
    finally { forceFull = false; }
  }

  W.projectHair3DToView = function () {
    var H = HAIR3D_RENDER;
    if (!TP.on || !inAdjust || scr() !== 'adjust' || H.stride != null || H.targetStrands != null) return origProj.apply(this, arguments);
    var sig = stateSig();
    if (!sig) return origProj.apply(this, arguments);
    var t0 = now(), r;

    var wantQuick = !forceFull && fullSig !== null && sig !== fullSig && missMs > TP.minMs && TP.frac > 0 && TP.frac < 1;
    if (wantQuick) {
      var keep = H.targetMul;
      H.targetMul = (keep || 1) * TP.frac;
      try { r = origProj.apply(this, arguments); } finally { H.targetMul = keep; }
      TP.quick++; TP.lastQuickMs = quickCost = now() - t0;
      schedule();
      return r;
    }

    // 완성 그림
    var changed = sig !== fullSig, forced = forceFull;
    forceFull = false;
    if (timer && !changed) { clearTimeout(timer); timer = null; }
    r = origProj.apply(this, arguments);
    var d = now() - t0;
    TP.full++; TP.lastFullMs = d;
    if (changed) missMs = d + (forced ? quickCost : 0);  // 값이 바뀐 뒤의 완성 그림만 "느린지" 판정에 씀
    fullSig = sig; quickCost = 0;
    if (timer) { clearTimeout(timer); timer = null; }
    return r;
  };

  function isRange(t) { return !!t && t.tagName === 'INPUT' && t.type === 'range'; }
  document.addEventListener('pointerdown', function (e) { if (isRange(e.target)) finger = true; }, true);
  function up() { finger = false; }
  document.addEventListener('pointerup', up, true);
  document.addEventListener('pointercancel', up, true);
  W.addEventListener('blur', up);

  TP.status = function () {
    return { on: TP.on, quick: TP.quick, full: TP.full, lastQuickMs: Math.round(TP.lastQuickMs), lastFullMs: Math.round(TP.lastFullMs),
      missMs: isFinite(missMs) ? Math.round(missMs) : null, pending: !!timer };
  };
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [];
    return L.concat(['[두 번 그리기] 빠른 그림 ' + TP.quick + '회(직전 ' + Math.round(TP.lastQuickMs) + 'ms) · 완성 그림 ' + TP.full + '회(직전 ' + Math.round(TP.lastFullMs) +
      'ms) · 값 바뀐 뒤 완성까지 ' + (isFinite(missMs) ? Math.round(missMs) + 'ms' : '측정 전') + (TP.on ? '' : ' · 꺼짐')]);
  };

  console.log(TAG + ' 설치 — 값이 바뀌면 가닥 1/3로 먼저 그리고, 손이 쉬면 전체로 다시 그림. 끄기 TWO_PASS.on=false · 상태 TWO_PASS.status()');
})();
