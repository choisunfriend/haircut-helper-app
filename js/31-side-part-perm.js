/* 31-garma-perm.js
 * 1) 가르마펌 스타일 추가 (STYLES / RECIPE_STYLES / STYLE_SPECS)
 * 2) 모발 상태(HAIR_CONDITIONS): 같은 슬라이더 값이라도 모발 상태에 따라 결과가 달라짐
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

  // ---------- 4. 조정 패널에 '모발 상태' 선택 추가 ----------
  if (typeof buildGyControls === 'function') {
    const origBuild = buildGyControls;
    window.buildGyControls = function () {
      origBuild.apply(this, arguments);
      const host = document.getElementById('gyControls');
      if (!host) return;
      const box = document.createElement('div');
      box.className = 'gy-condition';
      box.style.cssText = 'display:flex;gap:8px;align-items:center;margin:0 0 10px;font-size:13px';
      const opts = Object.entries(HAIR_CONDITIONS).map(([k, v]) =>
        `<option value="${k}"${state.hairCondition === k ? ' selected' : ''}>${v.label}</option>`).join('');
      const c = cond();
      box.innerHTML = `<label for="gyHairCond">Hair type</label><select id="gyHairCond">${opts}</select>
        <span style="opacity:.65">1 cm cut → ~${(visibleLengthCm(1, 45, 'front', 0.8)).toFixed(1)} cm visible · perm take ${Math.round(c.permTake * 100)}%</span>`;
      box.querySelector('select').onchange = e => {
        state.hairCondition = e.target.value;
        rebakeActive();
        window.buildGyControls();
        if (typeof drawAdjustPreview === 'function') drawAdjustPreview();
      };
      host.insertBefore(box, host.firstChild);
    };
  }

  window.HAIR_CONDITIONS = HAIR_CONDITIONS;
  window.HAIR_CONDITION_CFG = CONDITION_CFG;
  window.hairEffectiveCurl = effectiveCurl;
  window.hairVisibleLengthCm = visibleLengthCm;
})();
