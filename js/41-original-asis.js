/* ==========================================================================
 * 41-original-asis.js — 원본 결 → 3D 옮기기 1단계: "원본 3D 그대로" 보기 + 옮겨진 가닥 재기
 *
 * 로드 위치: index.html 맨 끝(40-gpu-diet.js 다음).
 *
 * 왜: 마네킹 초기화를 끄면 사진에서 뜬 가닥이 3D에서 뻗치고 덥수룩해집니다(2026-10-03 노트북 영상:
 *     옆을 짧게 친 남자 머리가 3D에서는 귀를 덮는 곱슬 더벅머리 + 삐죽 솟은 가닥).
 *     원인 후보가 둘이라 먼저 갈라야 합니다.
 *       (가) 조정 엔진이 사진 가닥을 바꿈 — 마네킹을 꺼도 섹션 기본값이 그대로 걸립니다.
 *            · 컬 기본값 30 → 컬 + 처짐
 *            · 커트 엔진(CUT3D)이 섹션마다 가이드 길이로 다시 자름 → 가이드보다 짧은 가닥은
 *              끝 방향으로 곧게 "늘림"(lengthStrand3D의 ratio>1 분기, 최대 1.8배) → 삐죽한 가시
 *       (나) 들어올린 가닥 자체가 3D에서 어긋남 — 4면의 결 방향이 서로 안 맞음
 *
 * ① [원본 3D 그대로] 버튼 — 켜면 사진 가닥에는 조정 엔진을 통째로 건너뜁니다(adjustStrandGeom이
 *    가닥을 손대지 않고 돌려줌). 마네킹은 자동으로 꺼집니다. 2D·미니 3D·3D 결과 화면에 전부 걸립니다.
 *    이 상태에서 보이는 것이 "들어올린 가닥 그 자체"입니다. 켜도 뻗치면 (나), 깨끗해지면 (가).
 *    사진 영역 밖 다듬기(세그다듬기)와 빗질은 그대로 둡니다.
 *
 * ② 진단 줄 [원본 옮기기] — 사진 뷰별로
 *      가닥 수 · 길이 · 끝이 머리(타원체) 밖으로 나간 정도 · 가시 가닥 비율
 *      (가시 = 끝이 머리 반지름의 1.25배 밖 + 끝 방향이 바깥을 향함)
 *    과, 조정 엔진이 가닥 길이를 얼마나 바꾸는지(조정 후 길이 ÷ 원본 길이)를 섹션별로 찍습니다.
 *
 * 끄기: ORIG_ASIS.on=false 후 ORIG_ASIS.refresh() · 버튼 숨기기 ORIG_ASIS.button=false (새로고침)
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[원본 그대로]';
  var O = W.ORIG_ASIS = Object.assign({ on: false, button: true, spikeR: 1.25, spikeCos: 0.5, sample: 1500 }, W.ORIG_ASIS || {});

  var innerAdj = W.adjustStrandGeom;
  if (typeof innerAdj !== 'function') { console.warn(TAG + ' adjustStrandGeom이 없어 건너뜀'); return; }

  /* ① 사진 가닥은 손대지 않고 돌려줌 */
  W.adjustStrandGeom = function (s) {
    if (O.on && s && !s.mannequin && s.pts) return s.pts;
    return innerAdj.apply(this, arguments);
  };

  function redraw() {
    try { if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump(); } catch (e) {}
    try { if (typeof combRefresh === 'function') combRefresh(); else if (typeof renderAdjustFrame === 'function') renderAdjustFrame(); } catch (e) { console.warn(TAG + ' 다시 그리기 실패', e); }
  }
  var btn = null;
  function syncBtn() {
    if (!btn) return;
    btn.textContent = '원본 3D 그대로 ' + (O.on ? 'ON' : 'OFF');
    btn.classList.toggle('on', !!O.on);
  }
  O.refresh = function () { syncBtn(); redraw(); };
  O.toggle = function () {
    O.on = !O.on;
    try {
      if (O.on && typeof MANNEQUIN !== 'undefined' && MANNEQUIN.on && typeof toggleMannequin === 'function') toggleMannequin();   // 마네킹 끔
    } catch (e) {}
    console.log(TAG + ' ' + (O.on ? '켬 — 사진 가닥에 조정 엔진을 걸지 않음' : '끔 — 조정 엔진 다시 적용'));
    O.refresh();
  };
  // 마네킹을 다시 켜면 이 모드는 의미가 없으므로 같이 끔
  var origMq = W.mannequinReset;
  if (typeof origMq === 'function') W.mannequinReset = function () {
    if (O.on) { O.on = false; syncBtn(); try { ADJ_CACHE.bump(); } catch (e) {} }
    return origMq.apply(this, arguments);
  };

  if (O.button) try {
    var bar = document.querySelector('#screen-adjust .mode-bar'), mq = document.getElementById('mannequinBtn');
    if (bar) {
      btn = document.createElement('button');
      btn.id = 'origAsIsBtn'; btn.type = 'button';
      if (mq && mq.className) btn.className = mq.className;
      btn.title = '사진에서 뜬 가닥을 조정 없이 그대로 3D로 봅니다 (마네킹은 꺼집니다)';
      btn.addEventListener('click', function () { O.toggle(); });
      bar.appendChild(btn);
      syncBtn();
    }
  } catch (e) { console.warn(TAG + ' 버튼 만들기 실패', e); }

  /* ────────────────────────────────────────────────────────────────────────
   * ② 재기
   * ────────────────────────────────────────────────────────────────────── */
  function arc(p) { var L = 0; for (var i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y, p[i].z - p[i - 1].z); return L; }
  function q(a, f) { if (!a.length) return NaN; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(b.length * f))]; }
  function n2(v) { return isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2) : '?'; }
  function n1(v) { return isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1) : '?'; }

  O.measure = function () {
    var m = state.hair3Dneutral;
    if (!m || !m.strands || !m.strands.length) return null;
    var E = null, cy = m.CY || 0, cm = 1;
    try { E = getHeadEllipsoid(); } catch (e) {}
    try { cm = modelCmPerUnit() || 1; } catch (e) {}
    if (!E) return null;
    var step = Math.max(1, m.strands.length / O.sample), byView = {}, bySec = {}, acc = 0, i, s;
    function R(p) { var x = p.x / E.a, y = (p.y - cy) / E.b, z = p.z / E.c; return Math.sqrt(x * x + y * y + z * z); }
    var keepOn = O.on; O.on = false;                       // 조정 엔진이 바꾸는 양을 재려면 잠깐 원래대로
    try {
      for (i = 0; i < m.strands.length; i++) {
        acc += 1 / step; if (acc < 1) continue; acc -= 1;
        s = m.strands[i];
        var p = s.pts; if (!p || p.length < 2) continue;
        var v = byView[s.srcAngle || '?'] || (byView[s.srcAngle || '?'] = { n: 0, len: [], tipR: [], rootR: [], spike: 0, up: 0 });
        var tip = p[p.length - 1], prev = p[p.length - 2], L = arc(p), rt = R(tip);
        // 끝 방향이 바깥(타원체 법선)을 향하는 정도
        var nx = tip.x / (E.a * E.a), ny = (tip.y - cy) / (E.b * E.b), nz = tip.z / (E.c * E.c), nl = Math.hypot(nx, ny, nz) || 1;
        var dx = tip.x - prev.x, dy = tip.y - prev.y, dz = tip.z - prev.z, dl = Math.hypot(dx, dy, dz) || 1;
        var out = (dx * nx + dy * ny + dz * nz) / (dl * nl);
        v.n++; v.len.push(L * cm); v.tipR.push(rt); v.rootR.push(R(p[0]));
        if (rt > O.spikeR && out > O.spikeCos) v.spike++;
        if (tip.y > p[0].y) v.up++;                        // 끝이 뿌리보다 위(위로 선 가닥)
        if (!s.mannequin) {
          var b = bySec[s.sec || '?'] || (bySec[s.sec || '?'] = { n: 0, ratio: [] });
          var g = null;
          try { g = innerAdj(s, null, typeof uniformStyling === 'function' ? uniformStyling() : undefined); } catch (e) { g = null; }
          if (g && g.length >= 2 && L > 1e-9) { b.n++; b.ratio.push(arc(g) / L); }
        }
      }
    } finally { O.on = keepOn; }
    return { total: m.strands.length, mannequin: !!m.mannequin, byView: byView, bySec: bySec, cm: cm };
  };

  var memoKey = null, memoVal = null;
  O.lines = function () {
    var r = null;
    try {
      var key = null;
      try { key = adjCacheSig(state.hair3Dneutral, null, 1) + '|' + (typeof adjFilterSig === 'function' ? adjFilterSig() : ''); } catch (e) { key = null; }
      if (key && key === memoKey) r = memoVal;              // 값이 그대로면 다시 재지 않음(3D 진입 기록 때마다 재지 않도록)
      else { r = O.measure(); memoKey = key; memoVal = r; }
    } catch (e) { return ['[원본 옮기기] 재기 실패: ' + (e && e.message)]; }
    if (!r) return ['[원본 옮기기] 모델 없음'];
    var L = ['[원본 옮기기] 원본 3D 그대로 ' + (O.on ? '켜짐' : '꺼짐') + ' · 모델 ' + r.total + '가닥' + (r.mannequin ? ' (지금은 마네킹 모델 — 사진 가닥을 보려면 마네킹을 끄세요)' : ' (사진 가닥)')];
    L.push('  들어올린 가닥(조정 전) — 뷰별: 길이cm 중앙값/p90 · 끝 위치(1.00=두피면) 중앙값/p90 · 가시 · 위로 선 가닥');
    Object.keys(r.byView).forEach(function (k) {
      var v = r.byView[k];
      L.push('   ' + k + ' ' + v.n + '개 · 길이 ' + n1(q(v.len, 0.5)) + '/' + n1(q(v.len, 0.9)) + ' · 뿌리 ' + n2(q(v.rootR, 0.5)) +
        ' · 끝 ' + n2(q(v.tipR, 0.5)) + '/' + n2(q(v.tipR, 0.9)) + ' · 가시 ' + Math.round(v.spike / v.n * 100) + '% · 위로 ' + Math.round(v.up / v.n * 100) + '%');
    });
    var secs = Object.keys(r.bySec);
    if (secs.length) {
      L.push('  조정 엔진이 길이를 바꾸는 양(조정 후÷원본 · 1.00=그대로) — 섹션별 중앙값/p90 · 늘린 가닥 비율');
      L.push('   ' + secs.map(function (k) {
        var b = r.bySec[k], grown = b.ratio.filter(function (x) { return x > 1.05; }).length;
        return k + ' ' + n2(q(b.ratio, 0.5)) + '/' + n2(q(b.ratio, 0.9)) + ' 늘림' + (b.n ? Math.round(grown / b.n * 100) : 0) + '%';
      }).join(' · '));
    }
    try {
      var cs = [];
      (typeof SECTION_ORDER !== 'undefined' ? SECTION_ORDER : []).forEach(function (k) {
        var sc = state.sections[k] || {}; cs.push(k + ' 길이' + sc.length + '/컬' + sc.curl);
      });
      if (cs.length) L.push('  지금 섹션 값: ' + cs.join(' · ') + ' · 커트엔진 ' + (typeof CUT3D !== 'undefined' && CUT3D.on ? '켜짐' : '꺼짐'));
    } catch (e) {}
    return L;
  };

  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [];
    try { L = L.concat(O.lines()); } catch (e) {}
    return L;
  };

  console.log(TAG + ' 설치 — 조정 화면의 [원본 3D 그대로] 버튼 · 진단 줄 [원본 옮기기]. 콘솔: ORIG_ASIS.toggle() · ORIG_ASIS.lines().join("\\n")');
})();
