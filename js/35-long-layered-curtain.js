/*
 * 35-long-layered-curtain.js
 *
 * 새 스타일: 롱 레이어드 + 커튼뱅 (Long Layers · Curtain Bangs)
 *
 * 레퍼런스: 가슴 기장 롱헤어, 가운데 가르마, 광대~윗입술에서 끝나는 커튼뱅,
 *           얼굴을 감싸는 앞쪽 레이어, 얼굴 바깥으로 흐르는 굵은 웨이브, 뿌리 볼륨.
 *
 * 형식은 24-style-base.js의 Blowout Waves(롱 기장)와 Curtain Bang Shag(앞머리)를 따름.
 *   - tipAt: headHeightRef 기준. 0.5 = 눈높이, 1.0 ≈ 턱선, 1.5 ≈ 쇄골 근처.
 *   - Blowout Waves와의 차이: 커튼뱅이 있음(MQ_FRINGE on), 얼굴 라인 레이어가 더 짧고,
 *     뒷기장은 조금 더 김.
 */
(function () {
  'use strict';
  var W = window;
  var ID = 'long_layered_curtain';
  if (typeof STYLE_SPECS === 'undefined' || typeof STYLES === 'undefined' || STYLE_SPECS[ID]) return;

  // 섹션 공통 기본값(Blowout Waves와 같은 계열)
  function sec(cut, extra) {
    return Object.assign(
      { base: 25, define: 85, volShare: 55, volPoint: 70, weight: 30, curlLen: 14 },
      extra || {},
      cut
    );
  }

  STYLE_SPECS[ID] = {
    name: 'Long layers · Curtain bangs · Soft face-framing waves',
    tipAt: {
      front: 0.72,     // 커튼뱅 끝: 광대~윗입술
      temple: 0.95,    // 얼굴 감싸는 레이어: 턱선
      crown: 1.2,      // 크라운 레이어: 턱 아래
      side: 1.5,       // 쇄골
      occipital: 1.6,
      nape: 1.65       // 가장 긴 곳(가슴 위)
    },
    cut: {
      crown:     sec({ technique: 'uniform', elevation: 75, texture: 40, curlDir: 15 }),
      front:     sec({ technique: 'uniform', elevation: 30, texture: 55, line: 30, overdirection: 25, curlDir: 35 }, { volShare: 35 }),
      temple:    sec({ technique: 'uniform', elevation: 60, texture: 50, overdirection: 30, curlDir: 25 }),
      side:      sec({ technique: 'uniform', elevation: 45, texture: 45, curlDir: 25 }, { volShare: 65 }),
      occipital: sec({ technique: 'uniform', elevation: 45, texture: 40, curlDir: 20 }, { volShare: 60 }),
      nape:      sec({ technique: 'uniform', elevation: 25, texture: 35, line: 40, curlDir: 20 })
    },
    perm: { curl: 32, wave: 92 },          // 굵은 컬 · 넓은 웨이브
    styling: {
      sweep: 18,      // 앞머리를 뒤·옆으로 넘겨 얼굴을 열어 둠
      volume: 58,     // 뿌리 볼륨(벨크로 롤)
      flow: 35,       // 끝은 바깥으로
      part: 0,        // 가운데 가르마
      partAmt: 88,    // 가르마를 또렷하게 → 커튼뱅이 양옆으로 갈라짐
      finish: 80,
      sleek: 15
    },
    globalCurl: 32,
    color: '#5A4030'
  };

  STYLES.push({
    id: ID,
    specId: ID,
    name: 'Long Layers + Curtain Bangs',
    tags: 'Center part · Cheekbone curtain bangs · Soft waves',
    length: 95,
    curl: 32,
    volume: 58,
    colorHex: '#5A4030'
  });

  try {
    if (typeof RECIPE_STYLES !== 'undefined' && RECIPE_STYLES.indexOf(ID) < 0) RECIPE_STYLES.push(ID);
  } catch (e) {}

  // 렌더 프로필: 웨이브는 Blowout Waves, 앞머리는 Curtain Bang Shag 설정을 섞음
  if (W.STYLE_BASE && W.STYLE_BASE.addProfile) {
    W.STYLE_BASE.addProfile(ID, {
      label: 'Long layers · Curtain bangs',
      config: {
        CURL_BUNDLE: { rodThickCm: 5, pitchThick: 1.9, relax: 1.2, microAmp: 0, microPhase: 0.15 },
        CURL3D_FIX: { ampGamma: 0.72 },
        VOLUME3D: { AMP: 0.17 },
        MQ_FRINGE: { on: true, tipFaceFrac: 0.4, lineHalfX: 1.1, lineGain: 1, crownAllAround: false },
        HAIR_DYE: { sMax: 1.25, highlightK: 0.85, glossDesat: 0.6 }
      },
      volBase: 1,
      after: { front: { curl: 12 }, temple: { curl: 16 } },
      // 광택: 결 하이라이트를 세게(spec)·넓게(specPow↓) → 찰랑이는 광택 띠
      shade: { ao: 0.5, lumCap: 1.35, spec: 0.45, specPow: 34 },
      // 36-gloss-wave.js: 잔결 제거 · 굵은 웨이브 살림 · 색 고르게
      gloss: { fineCm: 1.2, flowCm: 3.2, waveBoost: 0.3, rootCm: 2, colorSmooth: 0.7 }
    });
  }

  try {
    if (typeof buildStyleGrid === 'function') buildStyleGrid();
  } catch (e) {
    console.warn('[스타일] 목록 다시 그리기 실패', e);
  }
  console.log('[스타일] Long Layers + Curtain Bangs 추가');
})();
