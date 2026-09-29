/* ==========================================================================
 * 32-shag-curtain.js — 새 스타일: Curtain Bang Shag (미국 2026 가을 트렌드 — 모던 섀그)
 *
 * 레퍼런스(Video Project 15): 쇄골 기장 미디엄 섀그 + 광대까지 오는 커튼뱅
 *   · 길이: 옆·뒤는 쇄골 바로 위, 크라운은 짧은 레이어로 층을 많이 냄 (윗부분 볼륨 + 가벼운 끝)
 *   · 앞머리: 가운데에서 양쪽으로 갈라지는 커튼뱅, 끝은 광대뼈 높이 → 얼굴선 레이어로 이어짐
 *   · 결: 뿌리는 볼륨, 중간부터 느슨한 웨이브, 끝은 바깥으로 튕기는 페더(깃털) 끝
 *   · 질감: 레이저/포인트 커트로 끝을 많이 쳐냄 → texture 높게, density 낮게
 *   · 블로우아웃 웨이브와 차이: 롤이 더 가늘고 컬 구간이 길며(중간부터), 끝이 안이 아닌 밖으로 뻗음
 * 값은 모두 막대 숫자라 조정 화면에서 그대로 움직일 수 있습니다.
 * index.html에서 31-side-part-perm.js 다음에 불러옵니다.
 * ======================================================================== */
(function () {
  'use strict';
  var G = window;
  var ID = 'curtain_bang_shag';
  if (typeof STYLE_SPECS === 'undefined' || typeof STYLES === 'undefined' || STYLE_SPECS[ID]) return;

  var set = function (o, extra) {   // 펌·세팅 기준값(막대 숫자)
    // curlLen 22 = 끝에서 22cm(대략 중간부터) 웨이브, volPoint 30 = 볼륨을 위쪽(크라운)에
    return Object.assign({ base: 30, define: 45, volShare: 55, volPoint: 30, weight: 25, curlLen: 22 }, extra || {}, o);
  };
  STYLE_SPECS[ID] = {
    name: 'Curtain bang shag · Choppy layers · Flipped feathered ends',
    tipAt: {                 // 두상 높이 기준 끝 위치 (1.0 ≈ 턱선)
      front: 0.80,           // 커튼뱅: 광대뼈 높이
      crown: 0.95,           // 섀그의 핵심 — 크라운 레이어를 짧게
      temple: 1.00,          // 얼굴선 레이어: 턱선에서 커튼뱅과 이어짐
      side: 1.30,            // 쇄골 바로 위
      occipital: 1.34,
      nape: 1.38
    },
    cut: {
      crown:     set({ technique: 'uniform',    elevation: 90, texture: 70, density: 70, curlDir: 25 }, { volShare: 70 }),
      front:     set({ technique: 'uniform',    elevation: 30, texture: 60, density: 45, line: 35, curlDir: 35 }, { volShare: 40, curlLen: 8 }),   // 커튼뱅 끝은 바깥으로 넘김
      temple:    set({ technique: 'uniform',    elevation: 70, texture: 65, density: 65, overdirection: 35, curlDir: 30 }),
      side:      set({ technique: 'increase',   elevation: 60, texture: 70, density: 75, curlDir: 40 }, { volShare: 60 }),   // 끝이 밖으로 튕김
      occipital: set({ technique: 'increase',   elevation: 65, texture: 65, density: 80, curlDir: 35 }, { volShare: 60 }),
      nape:      set({ technique: 'graduation', elevation: 40, texture: 60, density: 70, line: 30, curlDir: 40 })
    },
    perm: { curl: 48, wave: 80 },     // 블로우아웃(95)보다 가는 롤 → 결이 더 보이는 느슨한 웨이브
    styling: { sweep: 0, volume: 58, flow: 45, part: 0, partAmt: 55, finish: 40, sleek: 10 },   // part 0 = 가운데 가르마(커튼뱅이 양쪽으로 갈라짐), sleek 낮게 = 헝클어진 텍스처
    globalCurl: 48,
    color: '#3A2618'                  // 레퍼런스 대부분이 따뜻한 미디엄 브라운
  };

  STYLES.push({
    id: ID, specId: ID,
    name: 'Curtain Bang Shag',
    tags: 'Choppy layers · Curtain bangs · Flipped ends',
    length: 70, curl: 48, volume: 66, colorHex: '#3A2618'
  });
  try { if (typeof RECIPE_STYLES !== 'undefined' && RECIPE_STYLES.indexOf(ID) < 0) RECIPE_STYLES.push(ID); } catch (e) {}

  if (G.STYLE_BASE && G.STYLE_BASE.addProfile) {
    G.STYLE_BASE.addProfile(ID, {
      label: 'Curtain bang shag',
      config: {
        CURL_BUNDLE: {
          rodThickCm: 3.2,     // 블로우아웃보다 가는 롤
          pitchThick: 1.6,
          relax: 1.25,
          microAmp: 0.05,      // 약간의 잔결 = 섀그 특유의 텍스처
          microPhase: 0.2
        },
        CURL3D_FIX: { ampGamma: 0.75 },
        VOLUME3D: { AMP: 0.2 },            // 크라운 볼륨
        MQ_FRINGE: {
          on: true,
          tipFaceFrac: 0.35,     // 앞머리 끝 기준선: 광대뼈(눈 아래) — 시스루뱅(-0.1)보다 훨씬 길게
          lineHalfX: 1.1,        // 앞머리 폭을 넓게 → 얼굴 양옆으로 흘러내림
          lineGain: 1.0,         // 가운데 짧고 바깥으로 갈수록 길어지는 커튼 라인
          crownAllAround: false  // 앞쪽만 자름
        },
        HAIR_DYE: { sMax: 1.3, highlightK: 0.7, glossDesat: 0.7 }   // 레퍼런스의 결 따라 들어간 하이라이트
      },
      volBase: 1.1,
      after: { front: { curl: 25 } },   // 커튼뱅은 바깥으로 넘어가는 C컬
      shade: { ao: 0.45, lumCap: 1.3, spec: 0.2, specPow: 50 }   // 층 사이 그림자를 조금 더 → 레이어가 도드라짐
    });
  }
  try { if (typeof buildStyleGrid === 'function') buildStyleGrid(); } catch (e) { console.warn('[스타일] 목록 다시 그리기 실패', e); }
  console.log('[스타일] Curtain Bang Shag 추가');
})();
