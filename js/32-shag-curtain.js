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
    // curlLen 10 = 끝 10cm만 느슨하게 (v1의 22cm는 뿌리까지 감겨 파마머리가 됨), volPoint 30 = 볼륨을 위쪽(크라운)에
    return Object.assign({ base: 30, define: 35, volShare: 55, volPoint: 30, weight: 25, curlLen: 10 }, extra || {}, o);
  };
  STYLE_SPECS[ID] = {
    name: 'Curtain bang shag · Choppy layers · Flipped feathered ends',
    // v3: 섀그 = 커트. 위는 짧고 아래로 갈수록 급하게 길어지는 층(길이 차이 약 0.7 두상높이)
    tipAt: {                 // 두상 위에서부터 끝 위치 (두상높이 비율, 1.0 ≈ 턱선, 0.5 ≈ 눈썹)
      front: 0.70,           // 커튼뱅: 광대뼈 높이
      crown: 0.62,           // 섀그 핵심 — 크라운을 눈~광대 높이로 짧게 쳐서 윗볼륨
      temple: 0.82,          // 얼굴선 레이어: 입꼬리 높이, 커튼뱅과 이어짐
      side: 1.15,            // 턱 아래~목
      occipital: 1.25,
      nape: 1.35             // 쇄골 바로 위 (가장 긴 곳, 가늘게)
    },
    cut: {
      crown:     set({ technique: 'uniform',    elevation: 100, texture: 80, density: 100, curlDir: 25 }, { volShare: 70 }),   // 90° 이상 들어 자른 짧은 층
      front:     set({ technique: 'uniform',    elevation: 40,  texture: 70, density: 100, line: 30, curlDir: 35 }, { volShare: 40 }),
      temple:    set({ technique: 'uniform',    elevation: 90,  texture: 75, density: 100, overdirection: 40, curlDir: 30 }),
      side:      set({ technique: 'uniform',    elevation: 85,  texture: 80, density: 100, curlDir: 40 }, { volShare: 60 }),   // 끝을 많이 쳐내 가볍게
      occipital: set({ technique: 'uniform',    elevation: 90,  texture: 80, density: 100, curlDir: 35 }, { volShare: 60 }),
      nape:      set({ technique: 'uniform',    elevation: 60,  texture: 85, density: 100, line: 20, curlDir: 40 })          // 목덜미는 얇고 뾰족하게
    },
    perm: { curl: 28, wave: 97 },     // v2: 굵은 롤 + 약한 컬 → 섀그는 곱슬이 아니라 끝만 흐트러진 결 (v1 wave 80 = 가는 로드 → 잔곱슬)
    styling: { sweep: 0, volume: 58, flow: 45, part: 0, partAmt: 55, finish: 40, sleek: 10 },   // part 0 = 가운데 가르마(커튼뱅이 양쪽으로 갈라짐), sleek 낮게 = 헝클어진 텍스처
    globalCurl: 28,
    color: '#3A2618'                  // 레퍼런스 대부분이 따뜻한 미디엄 브라운
  };

  STYLES.push({
    id: ID, specId: ID,
    name: 'Curtain Bang Shag',
    tags: 'Choppy layers · Curtain bangs · Flipped ends',
    length: 60, curl: 28, volume: 66, colorHex: '#3A2618'
  });
  try { if (typeof RECIPE_STYLES !== 'undefined' && RECIPE_STYLES.indexOf(ID) < 0) RECIPE_STYLES.push(ID); } catch (e) {}

  if (G.STYLE_BASE && G.STYLE_BASE.addProfile) {
    G.STYLE_BASE.addProfile(ID, {
      label: 'Curtain bang shag',
      config: {
        CURL_BUNDLE: {
          rodThickCm: 5,
          pitchThick: 2.2,     // 한 바퀴를 길게 → 컬이 아니라 S결
          relax: 1.25,
          microAmp: 0.01,      // 잔곱슬 없음
          microPhase: 0.2
        },
        CURL3D_FIX: { ampGamma: 0.75 },
        VOLUME3D: { AMP: 0.16 },            // 크라운 볼륨
        MQ_FRINGE: {
          on: true,
          tipFaceFrac: 0.35,     // 앞머리 끝 기준선: 광대뼈(눈 아래) — 시스루뱅(-0.1)보다 훨씬 길게
          lineHalfX: 1.1,        // 앞머리 폭을 넓게 → 얼굴 양옆으로 흘러내림
          lineGain: 1.0,         // 가운데 짧고 바깥으로 갈수록 길어지는 커튼 라인
          crownAllAround: false  // 앞쪽만 자름
        },
        HAIR_DYE: { sMax: 1.3, highlightK: 0.7, glossDesat: 0.7 }   // 레퍼런스의 결 따라 들어간 하이라이트
      },
      volBase: 1.0,
      after: { front: { curl: 12 }, crown: { curl: 18 }, temple: { curl: 18 } },   // 앞·윗머리는 거의 곧게 → 층 끝선이 보이게   // 커튼뱅은 바깥으로 넘어가는 C컬
      shade: { ao: 0.45, lumCap: 1.3, spec: 0.2, specPow: 50 }   // 층 사이 그림자를 조금 더 → 레이어가 도드라짐
    });
  }
  try { if (typeof buildStyleGrid === 'function') buildStyleGrid(); } catch (e) { console.warn('[스타일] 목록 다시 그리기 실패', e); }
  console.log('[스타일] Curtain Bang Shag 추가');
})();

/* ==========================================================================
 * 모든 스타일 숱(density) 100으로 통일
 *   숱 값 < 100 이면 3D에서 가닥을 "뿌리째" 빼서(숱 55 → 가닥 45% 제거) 머리가 성겨집니다.
 *   끝을 가볍게 하는 건 texture(끝단 숱·질감)가 맡으므로 density는 100으로 둡니다.
 *   뿌리 개수는 ROOT_EVEN(31번: 전체 ×1.2, 앞쪽 ×1.5)이 정합니다.
 *   예외: 시스루뱅 단발의 앞머리 — 일부러 얇게 두는 스타일(specPatch가 적용 때 front 20으로 다시 넣음).
 *   끄기: 이 블록 앞에서 window.DENSITY_UNIFY = false
 * ======================================================================== */
(function () {
  'use strict';
  if (window.DENSITY_UNIFY === false || typeof STYLE_SPECS === 'undefined') return;
  var changed = [];
  Object.keys(STYLE_SPECS).forEach(function (id) {
    var cut = STYLE_SPECS[id] && STYLE_SPECS[id].cut;
    if (!cut) return;
    Object.keys(cut).forEach(function (sec) {
      var c = cut[sec];
      if (!c || typeof c.density !== 'number' || c.density >= 100) return;
      changed.push(id + '.' + sec + ' ' + c.density + '→100');
      c.density = 100;
    });
  });
  console.log('[숱 통일] 모든 스타일 density 100 · 바꾼 칸 ' + changed.length + (changed.length ? ' (' + changed.join(', ') + ')' : '') +
    ' · 시스루뱅 앞머리는 스타일 적용 때 20 유지');
})();
