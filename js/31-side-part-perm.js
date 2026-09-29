/* 31-garma-perm.js
 * 1) 가르마펌 스타일 추가 (STYLES / RECIPE_STYLES / STYLE_SPECS)
 * 2) 모발 상태(HAIR_CONDITIONS, 렌더된 가닥에서 자동 판정): 같은 슬라이더 값이라도 모발 상태에 따라 결과가 달라짐
 *    - 길이 슬라이더 = 당겨서 편 실제 커트 길이. 보이는 길이 = 편 길이 × 컬 수축률
 *    - 펌 컬 세기 = 펌 약 세기 × 모발의 펌 흡수율 + 원래 곱슬기
 *    - 짧게 자를수록 무게가 빠져 컬이 더 살아남 (곱슬일수록 크게)
 *    - 섹션별 컬 배율(스타일이 지정): 가르마펌은 옆·뒷머리를 다운펌처럼 눌러둠
 * index.html에서 30-saved-photos.js 다음에 불러옵니다.
 */
(function () {
  'use strict';

  // ---------- 1. 모발 상태 ----------
  // naturalCurl  : 펌 없이도 있는 곱슬기 (0~100)
  // permTake     : 펌 약 세기가 실제 컬로 나오는 비율 (굵은 직모는 잘 안 나옴, 손상모는 잘 나옴)
  // shrinkMax    : 컬 100일 때 보이는 길이가 줄어드는 최대 비율 (0.5 = 절반 길이로 보임)
  // weightRelease: 짧게 잘랐을 때 컬이 살아나는 정도
  // volumeGain   : 층(elevation)을 냈을 때 부피가 커지는 정도
  const HAIR_CONDITIONS = {
    straight_coarse: { label: 'Straight (coarse)', naturalCurl: 0,  permTake: 0.75, shrinkMax: 0.40, weightRelease: 0.10, volumeGain: 0.9 },
    straight:        { label: 'Straight',      naturalCurl: 0,  permTake: 0.90, shrinkMax: 0.45, weightRelease: 0.15, volumeGain: 1.0 },
    wavy:            { label: 'Wavy',    naturalCurl: 30, permTake: 1.00, shrinkMax: 0.50, weightRelease: 0.35, volumeGain: 1.2 },
    curly:           { label: 'Curly',      naturalCurl: 60, permTake: 1.00, shrinkMax: 0.55, weightRelease: 0.55, volumeGain: 1.45 },
    damaged:         { label: 'Damaged (bleached / over-permed)', naturalCurl: 10, permTake: 1.15, shrinkMax: 0.50, weightRelease: 0.25, volumeGain: 1.1 }
  };
  const CONDITION_CFG = {
    enabled: true,
    // 3D 가닥 시뮬레이션이 이미 컬로 길이를 줄여 그린다면 false로 두어 이중 수축을 막으세요.
    applyShrink2D: true,
    shrinkExp: 1.3
  };
  if (typeof state !== 'undefined' && !state.hairCondition) state.hairCondition = 'straight';

  function cond() { return HAIR_CONDITIONS[(state && state.hairCondition)] || HAIR_CONDITIONS.straight; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /** 섹션의 실제 컬: 펌 약 세기 → 모발 상태 → 섹션 배율 → 커트 길이에 따른 무게 해방 */
  function effectiveCurl(permCurl, sec, rawLenRatio) {
    const c = cond();
    const scale = sectionCurlScale(sec);
    const spec = (typeof STYLE_SPECS !== 'undefined' && state) ? STYLE_SPECS[state._activeSpecId] : null;
    if (spec && typeof spec.finishCurl === 'number' && state.hairFinish !== 'wet') permCurl *= spec.finishCurl;
    // 펌 컬과 원래 곱슬기는 단순 합이 아니라 겹쳐서 커짐: 1-(1-a)(1-b)
    const a = clamp(permCurl * c.permTake * scale / 100, 0, 1);
    const b = clamp(c.naturalCurl * (0.6 + 0.4 * scale) / 100, 0, 1);
    let curl = (1 - (1 - a) * (1 - b)) * 100;
    const shorter = clamp(1 - rawLenRatio, 0, 1);          // 기본 길이 대비 얼마나 짧아졌나
    curl *= 1 + c.weightRelease * shorter;
    return clamp(curl, 0, 100);
  }
  /** 컬 때문에 보이는 길이가 줄어드는 비율 (직모 1.0) */
  function shrinkFactor(curl) {
    return 1 - cond().shrinkMax * Math.pow(curl / 100, CONDITION_CFG.shrinkExp);
  }
  /** 커트 길이 cm(편 길이) → 보이는 길이 cm. UI 표시용 */
  function visibleLengthCm(stretchedCm, permCurl, sec, rawLenRatio) {
    return stretchedCm * shrinkFactor(effectiveCurl(permCurl, sec, rawLenRatio == null ? 1 : rawLenRatio));
  }

  // 스타일별 섹션 컬 배율 (가르마펌: 옆·뒤는 다운펌 느낌으로 눌림)
  const SECTION_CURL_SCALE = {
    side_part_perm: { front: 1.0, crown: 0.85, temple: 0.35, side: 0.0, occipital: 0.3, nape: 0.0 }
  };
  function sectionCurlScale(sec) {
    const m = SECTION_CURL_SCALE[state && state._activeSpecId];
    return m && typeof m[sec] === 'number' ? m[sec] : 1;
  }

  // ---------- 2. 렌더 리졸버 감싸기 ----------
  if (typeof createColumnStyleResolvers === 'function') {
    const orig = createColumnStyleResolvers;
    window.createColumnStyleResolvers = function (opts) {
      const r = orig.apply(this, arguments);
      if (!CONDITION_CFG.enabled || !r) return r;
      const baseLen = r.lengthRatioFor, baseCurl = r.curlAmtFor, baseLayer = r.cutLayerDeltaFor;
      const curlAt = (x, sec, y) => {
        // 섹션 curl 값은 applyStyleSpec 단계에서 이미 모발 상태·섹션 배율이 반영됨 (2D/3D 공통)
        return { raw: baseLen(x, sec, y), curl: baseCurl(x, sec, y) };
      };
      r.curlAmtFor = (x, sec, y) => curlAt(x, sec, y).curl;
      r.lengthRatioFor = (x, sec, y) => {
        const { raw, curl } = curlAt(x, sec, y);
        return CONDITION_CFG.applyShrink2D ? raw * shrinkFactor(curl) : raw;
      };
      r.cutLayerDeltaFor = (x, sec, y) => {
        const d = baseLayer(x, sec, y);
        const { curl } = curlAt(x, sec, y);
        return d * (1 + (cond().volumeGain - 1) * (0.5 + curl / 200));
      };
      return r;
    };
  }

  // 적용 중인 스타일 id 기록 (섹션 컬 배율용)
  if (typeof applyStyleSpec === 'function') {
    const origApply = applyStyleSpec;
    window.applyStyleSpec = function (id) {
      state._activeSpecId = id;
      try { autoDetectCondition('스타일 적용 ·'); } catch (e) {}
      // 3D 가닥은 state.sections[sec].curl 을 그대로 읽으므로, 길이 계산(tipAt) 전에
      // 섹션별 실제 컬을 cut 에 넣어 둔다. (옆·뒤 0 → 직모 길이로 계산됨)
      bakeSectionCurls(STYLE_SPECS[id]);
      return origApply.apply(this, arguments);
    };
  }
  function bakeSectionCurls(spec) {
    if (!spec || !spec.permBase || !spec.cut) return;
    for (const sec in spec.cut) {
      spec.cut[sec].curl = Math.round(effectiveCurl(spec.permBase.curl, sec, 1));
      spec.cut[sec].wave = spec.permBase.wave;
    }
    spec.globalCurl = spec.cut.front ? spec.cut.front.curl : spec.globalCurl;
  }
  /** 모발 상태 / 마무리(wet·dry) 변경 시 현재 섹션 컬 재계산 */
  function rebakeActive() {
    const spec = typeof STYLE_SPECS !== 'undefined' && STYLE_SPECS[state._activeSpecId];
    if (!spec || !spec.permBase) return;
    bakeSectionCurls(spec);
    for (const sec in spec.cut) if (state.sections[sec]) {
      state.sections[sec].curl = spec.cut[sec].curl;
      state.sections[sec].wave = spec.cut[sec].wave;
    }
    state._globalCurl = spec.globalCurl;
    if (typeof rebuildHair3D === 'function') rebuildHair3D();
  }
  window.rebakeHairCondition = rebakeActive;
  {
  }

  // ---------- 3. 가르마펌 스타일 ----------
  // 6:4 가르마, 앞머리는 눈썹 아래~광대 위 길이로 굵은 로드 C컬 → 가르마 반대쪽으로 흘려 넘김.
  // 정수리 볼륨, 옆·뒤는 짧게 그라데이션 + 다운펌으로 눌러 두상 정리.
  const GARMA = {
    name: 'Korean side-part perm · Soft part · Inward C-curl fringe · Short rounded sides',
    tipAt: { front: 0.46, crown: 0.40, temple: 0.50, side: 0.52, occipital: 0.74, nape: 0.88 },
    cut: {
      front:     { technique: 'uniform',     elevation: 25, texture: 45, density: 85, line: 50, curlDir: -45 },
      crown:     { technique: 'uniform',     elevation: 80, texture: 45, density: 90, curlDir: -25 },
      temple:    { technique: 'graduation',  elevation: 40, texture: 35, density: 80, overdirection: 25, curlDir: -10 },
      side:      { technique: 'graduation',  elevation: 20, texture: 30, density: 70, curlDir: 0 },
      occipital: { technique: 'graduation',  elevation: 45, texture: 35, density: 85, curlDir: -10 },
      nape:      { technique: 'graduation',  elevation: 15, texture: 30, density: 75, line: 45, curlDir: 0 }
    },
    permBase: { curl: 70, wave: 45 },   // 젖은 상태 약 세기. 섹션별 실제 컬은 bakeSectionCurls 가 계산 (perm 키를 두면 전 섹션 동일 컬로 덮어씀)
    // 참고 영상(0:00~0:38): 옆·뒤는 로드 없이 짧게, 윗머리만 와인딩.
    // 앞 헤어라인은 굵은 로드(분홍)로 뒤쪽(정수리 방향) 말기 → 얼굴에서 멀어지는 C컬,
    // 정수리~탑은 중간 로드(파랑)를 가로로 줄지어 뒤로 말기, 가르마 쪽 라인은 사선 배열.
    rods: {
      front:     { size: 'large',  dir: 'back', rows: 1, lift: 'on-base' },
      crown:     { size: 'medium', dir: 'back', rows: 3, lift: 'on-base' },
      temple:    { size: 'medium', dir: 'back-diagonal', rows: 1, lift: 'off-base' },
      side: null, occipital: null, nape: null
    },
    styling: { sweep: 20, volume: 65, flow: -45, part: 15, partAmt: 80, finish: 60, sleek: 35 },
    // 참고 영상 후반(0:38~1:32): 열처리기로 가온 → 로드 제거 직후엔 강한 컬 →
    // 드라이로 뿌리 볼륨 + 끝만 안말음 C로 정리. 결과는 거의 가운데(살짝 치우친) 가르마,
    // 앞머리가 양쪽 광대 쪽으로 안으로 감기는 형태, 옆·뒤는 둥글고 짧게.
    finishCurl: 0.55,   // 젖은 컬 대비 드라이 마무리 후 남는 컬 비율
    process: ['wet cut', 'rod winding (top only)', 'heat processing', 'neutralize', 'rods off', 'blow-dry: root lift + inward C ends'],
    globalCurl: 70,
    color: '#2B2016'
  };
  if (typeof STYLE_SPECS !== 'undefined' && !STYLE_SPECS.side_part_perm) STYLE_SPECS.side_part_perm = GARMA;
  if (typeof STYLES !== 'undefined' && Array.isArray(STYLES) && !STYLES.some(s => s && s.id === 'side_part_perm')) {
    STYLES.push({ id: 'side_part_perm', specId: 'side_part_perm', name: 'Korean Side-Part Perm',
      tags: 'Soft off-center part · Inward C-curl fringe · Short rounded sides', length: 38, curl: 45, volume: 68, colorHex: '#2B2016' });
  }
  if (typeof RECIPE_STYLES !== 'undefined' && Array.isArray(RECIPE_STYLES) && !RECIPE_STYLES.includes('side_part_perm')) {
    RECIPE_STYLES.push('side_part_perm');
  }
  // 스타일 목록은 앞선 스크립트에서 이미 그려졌으므로 다시 그림
  function refreshStyleGrid() {
    const g = document.getElementById('styleGrid');
    if (g && g.children.length && !document.getElementById('style-side_part_perm') && typeof buildStyleGrid === 'function') {
      try { buildStyleGrid(); } catch (e) { console.warn('[side-part-perm] grid refresh', e); }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshStyleGrid);
  else refreshStyleGrid();
  window.addEventListener('load', refreshStyleGrid);

  // ---------- 4. 모발 상태 자동 판정 (렌더된 헤어에서) ----------
  // 미용사가 고르지 않습니다. 지금 화면에 그려지는 3D 가닥(마네킹/시술 후 렌더)의
  // 굴곡을 재서 직모·웨이브·곱슬을 정합니다.
  //   wiggle = Σ(이웃 마디 사이 꺾임) − (처음 마디↔끝 마디 꺾임)  → 큰 흐름(중력·두상 따라 휨)은 빼고 잔굴곡만
  //   cm 당 각도로 환산: < 12°/cm 직모 · < 45°/cm 웨이브 · 그 이상 곱슬
  const AUTO_COND = { on: true, cmPerUnit: 19.3, sample: 600, wavyDeg: 12, curlyDeg: 45 };
  function angleBetween(u, v) {
    const lu = Math.hypot(u.x, u.y, u.z), lv = Math.hypot(v.x, v.y, v.z);
    if (!(lu > 1e-9 && lv > 1e-9)) return 0;
    return Math.acos(clamp((u.x * v.x + u.y * v.y + u.z * v.z) / (lu * lv), -1, 1));
  }
  function measureRenderedCurl() {
    const m = state && (state.hair3Dneutral || state.hair3D);
    const S = m && m.strands;
    if (!S || !S.length) return null;
    const step = Math.max(1, Math.floor(S.length / AUTO_COND.sample));
    const vals = [];
    for (let i = 0; i < S.length; i += step) {
      const P = S[i].pts;
      if (!P || P.length < 5) continue;
      let arc = 0, turn = 0, first = null, prev = null;
      for (let k = 1; k < P.length; k++) {
        const d = { x: P[k].x - P[k - 1].x, y: P[k].y - P[k - 1].y, z: P[k].z - P[k - 1].z };
        arc += Math.hypot(d.x, d.y, d.z);
        if (prev) turn += angleBetween(prev, d);
        if (!first) first = d;
        prev = d;
      }
      const arcCm = arc * AUTO_COND.cmPerUnit;
      if (arcCm < 2) continue;                                   // 너무 짧은 가닥은 판정 불가
      const wiggle = Math.max(0, turn - angleBetween(first, prev)) * 180 / Math.PI;
      vals.push(wiggle / arcCm);
    }
    if (vals.length < 20) return null;
    vals.sort((x, y) => x - y);
    return { degPerCm: vals[vals.length >> 1], n: vals.length };
  }
  function autoDetectCondition(reason) {
    if (!AUTO_COND.on) return state.hairCondition;
    const r = measureRenderedCurl();
    if (!r) return state.hairCondition;
    const c = r.degPerCm < AUTO_COND.wavyDeg ? 'straight' : r.degPerCm < AUTO_COND.curlyDeg ? 'wavy' : 'curly';
    state.hairCondition = c;
    state._hairCondAuto = { cond: c, degPerCm: r.degPerCm, n: r.n };
    console.log('[모발상태·자동] ' + (reason || '') + ' 렌더 가닥 ' + r.n + '개 잔굴곡 중앙값 ' + r.degPerCm.toFixed(1) +
      '°/cm → <b>' + HAIR_CONDITIONS[c].label + '</b> (기준 직모<' + AUTO_COND.wavyDeg + ' · 웨이브<' + AUTO_COND.curlyDeg +
      ') · 끄기 HAIR_AUTO_COND.on=false');
    return c;
  }
  window.HAIR_AUTO_COND = AUTO_COND;
  window.hairAutoDetectCondition = autoDetectCondition;

  // 조정 패널: 선택 상자 없이 판정 결과만 한 줄로 보여줌
  if (typeof buildGyControls === 'function') {
    const origBuild = buildGyControls;
    window.buildGyControls = function () {
      origBuild.apply(this, arguments);
      const host = document.getElementById('gyControls');
      const a = state && state._hairCondAuto;
      if (!host || !a) return;
      const box = document.createElement('div');
      box.className = 'gy-condition';
      box.style.cssText = 'margin:0 0 10px;font-size:12px;opacity:.7';
      box.textContent = 'Hair type (auto): ' + HAIR_CONDITIONS[a.cond].label +
        ' · perm take ' + Math.round(HAIR_CONDITIONS[a.cond].permTake * 100) + '%';
      host.insertBefore(box, host.firstChild);
    };
  }

  // ---------- 5. 앞쪽 뿌리 보강 (마네킹) ----------
  // 앞·정수리 쪽 셀의 가닥 수(면적당)가 옆·뒤보다 적으면, 그 셀 안에 새 뿌리를 더 심습니다.
  // 다른 셀의 가닥을 옮기지 않습니다 — 순수 추가. 같은 셀에 있던 가닥 모양을 본떠 뿌리만 셀 안 새 자리에 둡니다.
  // frontBoost  : 앞쪽(|θ|≤backSideThDeg) 목표 배율 — 1.0이면 옆·뒤와 같은 면적당 가닥수.
  //               1.5 = 앞쪽은 가르마·헤어라인에서 두피가 먼저 비쳐 보이므로 조금 더 촘촘히
  // frontMinFill: 앞쪽은 목표의 이 비율 미만이면 채움 (옆·뒤는 minFill)
  // frontBaldRescue: 앞쪽에서 "대머리"로 판정됐지만 두피 안(두피밖 아님)이고 phi≤frontPhiMax 인 셀도 채움
  //               (정면 사진의 가르마 선·광택을 두피로 읽어 생긴 빈 칸 — 로그의 "정면 대머리 5")
  const ROOT_EVEN = { on: true, backSideThDeg: 56, minFill: 0.9, maxAddFrac: 0.5,
    frontBoost: 1.5,  frontMinFill: 1.0, frontBaldRescue: true, frontPhiMax: 1.05 };
  window.ROOT_EVEN = ROOT_EVEN;
  function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
  function evenRoots(res) {
    if (!ROOT_EVEN.on || !res || !res.strands || !res.roots || !res.grid) return res;
    const R = res.roots, G = res.grid, NT = R.NT, NP = R.NP, CY = res.CY;
    let E; try { E = getScalpEllipsoid(); } catch (e) { return res; }
    const stepY = (G.yTopH - G.yBot) / (G.NY - 1);
    const rowOf = y => Math.min(G.NY - 1, Math.max(0, Math.round((G.yTopH - y) / stepY)));
    let area = null;
    try { area = headSurfaceCellAreas(G.hullW, G.hullD, rowOf, CY, R.b, NT, NP); } catch (e) {}
    const N = NT * NP, cellOf = p => {
      const ph = Math.acos(clamp((p.y - CY) / E.b, -1, 1));
      const th = Math.atan2(p.x / E.a, p.z / E.c);
      const pi = Math.min(NP - 1, Math.floor(ph / Math.PI * NP)), ti = Math.min(NT - 1, Math.floor((th + Math.PI) / (2 * Math.PI) * NT));
      return pi * NT + ti;
    };
    const byCell = new Array(N);
    for (const s of res.strands) { const c = cellOf(s.pts[0]); (byCell[c] || (byCell[c] = [])).push(s); }
    const offScalp = c => !!(R.est && R.est[c] === (typeof EST_OFFSCALP !== 'undefined' ? EST_OFFSCALP : -1));
    const bald = c => !(R.den[c] > (typeof MANNEQUIN !== 'undefined' ? MANNEQUIN.baldDen : 0.08));
    const ok = c => !offScalp(c) && !bald(c);
    const thOf = c => ((c % NT) + 0.5) / NT * 2 * Math.PI - Math.PI;
    const isFront = c => Math.abs(thOf(c)) * 180 / Math.PI <= ROOT_EVEN.backSideThDeg;
    const phiOf = c => ((c / NT | 0) + 0.5) / NP * Math.PI;
    // 앞쪽 대머리 판정 구제: 두피 안 + 헤어라인 위(phi 상한) + 주변 8칸 중 절반 이상이 머리
    const rescued = c => {
      if (!ROOT_EVEN.frontBaldRescue || offScalp(c) || !bald(c) || !isFront(c) || phiOf(c) > ROOT_EVEN.frontPhiMax) return false;
      const pi = c / NT | 0, ti = c % NT; let n = 0, h = 0;
      for (let dp = -1; dp <= 1; dp++) for (let dt = -1; dt <= 1; dt++) {
        if (!dp && !dt) continue; const p2 = pi + dp; if (p2 < 0 || p2 >= NP) continue;
        const nc = p2 * NT + ((ti + dt) % NT + NT) % NT; n++; if (ok(nc)) h++;
      }
      return n > 0 && h * 2 >= n;
    };
    const fillable = c => ok(c) || rescued(c);
    const ar = c => (area ? area[c] : 1) || 0;
    // 기준: 옆·뒤 셀들의 면적당 가닥 수 중앙값
    const ref = [];
    for (let c = 0; c < N; c++) if (ok(c) && ar(c) > 0 && Math.abs(thOf(c)) * 180 / Math.PI > ROOT_EVEN.backSideThDeg && byCell[c])
      ref.push(byCell[c].length / ar(c));
    if (ref.length < 10) return res;
    ref.sort((a, b) => a - b);
    const target = ref[ref.length >> 1];
    const rand = rng(1234567), maxAdd = Math.round(res.strands.length * ROOT_EVEN.maxAddFrac);
    let added = 0, cellsFixed = 0, frontAdded = 0, rescuedCells = 0;
    const secAdd = {};
    for (let c = 0; c < N && added < maxAdd; c++) {
      if (!fillable(c) || !(ar(c) > 0)) continue;
      const fr = isFront(c);
      const have = byCell[c] ? byCell[c].length : 0, want = Math.round(target * ar(c) * (fr ? ROOT_EVEN.frontBoost : 1));
      if (have >= want * (fr ? ROOT_EVEN.frontMinFill : ROOT_EVEN.minFill) || want - have < 1) continue;
      const pi = c / NT | 0, ti = c % NT;
      // 모양 본보기: 같은 셀 가닥 → 없으면 같은 줄 이웃 셀 가닥(모양만 빌리고 원래 가닥은 그대로 둠)
      let src = byCell[c] && byCell[c].length ? byCell[c] : null;
      for (let d = 1; !src && d <= 3; d++) for (const t of [ti - d, ti + d]) {
        const nc = pi * NT + ((t % NT) + NT) % NT;
        if (!src && byCell[nc] && byCell[nc].length) src = byCell[nc];
      }
      // 같은 줄에 없으면 위·아래 줄(헤어라인 바로 위 칸은 옆 칸도 비어 있는 경우가 많음)
      for (let d = 1; !src && d <= 2; d++) for (const p2 of [pi - d, pi + d]) {
        if (p2 < 0 || p2 >= NP) continue; const nc = p2 * NT + ti;
        if (!src && byCell[nc] && byCell[nc].length) src = byCell[nc];
      }
      if (!src) continue;
      for (let k = have; k < want && added < maxAdd; k++) {
        const s = src[(rand() * src.length) | 0];
        const ph = (pi + rand()) / NP * Math.PI, th = (ti + rand()) / NT * 2 * Math.PI - Math.PI;
        const root = { x: E.a * Math.sin(ph) * Math.sin(th), y: CY + E.b * Math.cos(ph), z: E.c * Math.sin(ph) * Math.cos(th) };
        const o = s.pts[0], dx = root.x - o.x, dy = root.y - o.y, dz = root.z - o.z;
        const ns = Object.assign({}, s, { pts: s.pts.map(p => ({ x: p.x + dx, y: p.y + dy, z: p.z + dz })), _evenAdded: true });
        if (s.colors) ns.colors = s.colors.slice ? s.colors.slice() : s.colors;
        res.strands.push(ns); added++;
        secAdd[s.sec] = (secAdd[s.sec] || 0) + 1;
        if (Math.abs(thOf(c)) * 180 / Math.PI <= ROOT_EVEN.backSideThDeg) frontAdded++;
      }
      cellsFixed++; if (!ok(c)) rescuedCells++;
    }
    console.log('[뿌리 고르게] 기준 = 옆·뒤 셀 면적당 가닥 중앙값 ' + target.toFixed(1) + ' · 모자란 셀 ' + cellsFixed +
      '개에 새 뿌리 ' + added + '개 추가(앞쪽 ' + frontAdded + ' · 앞쪽 목표 ×' + ROOT_EVEN.frontBoost + ' · 대머리 판정 구제 ' + rescuedCells + '칸) · 섹션 ' +
      Object.keys(secAdd).map(k => k + ' +' + secAdd[k]).join(' ') + ' · 다른 셀에서 옮긴 가닥 0 · 끄기 ROOT_EVEN.on=false');
    return res;
  }
  if (typeof buildMannequinHair3D === 'function') {
    const origMq = buildMannequinHair3D;
    window.buildMannequinHair3D = function () {
      const r = origMq.apply(this, arguments);
      try { return evenRoots(r); } catch (e) { console.warn('[뿌리 고르게] 실패', e); return r; }
    };
  }

  window.HAIR_CONDITIONS = HAIR_CONDITIONS;
  window.HAIR_CONDITION_CFG = CONDITION_CFG;
  window.hairEffectiveCurl = effectiveCurl;
  window.hairVisibleLengthCm = visibleLengthCm;
})();
