/* ==========================================================================
 * 33-layered-bob-tune.js — Layered Bob (layered_bob_hush) 레퍼런스 맞춤 (2026-09-29)
 *
 * 레퍼런스(정면·좌50°·우50°·후면 4컷): 턱~목 중간 기장 레이어드 보브
 *   · 앞머리: 이마 전체를 얇게 덮는 시스루뱅, 끝은 눈썹~눈 사이, 살짝 안으로 C컬
 *   · 얼굴선: 광대~입꼬리 높이에서 끝나는 짧은 사이드뱅, 얼굴 "옆"에서 바깥으로 넘어감
 *   · 결: 뿌리는 차분, 중간부터 느슨한 S웨이브, 끝은 바깥으로 살짝 튕김(잔곱슬 없음)
 *   · 색: 올리브빛 애쉬 브라운
 *
 * 화면 녹화에서 고칠 점:
 *   1) 앞머리 양갈래 — temple(얼굴선) 끝이 턱선(0.98)까지 내려와 얼굴 앞에 굵은 두 가닥으로 늘어짐
 *      → 광대 높이(0.80)로 올리고, overdirection·curlDir 로 얼굴 옆·바깥으로 넘김
 *   2) 앞머리가 무거움 — 앞머리 끝이 두꺼워 통뱅처럼 보임
 *      → 숱(density) 막대는 없앰(뿌리째 빠지는 문제). 얇은 느낌은 텍스처라이징 80 으로
 *   3) 잔곱슬 파마처럼 보임 — wave 70(가는 로드) → 95(굵은 롤), 끝 12cm만 느슨하게
 * 끄기: 이 파일을 index.html 에서 빼면 원래 스펙 그대로입니다.
 * ======================================================================== */
(function () {
  'use strict';
  var G = window;
  var ID = 'layered_bob_hush';
  if (typeof STYLE_SPECS === 'undefined' || !STYLE_SPECS[ID]) return;
  var COLOR = '#6B5A45';   // 레퍼런스 올리브 애쉬 브라운

  // 목록 카드 색도 맞춤
  try {
    var card = (typeof STYLES !== 'undefined') && STYLES.find(function (s) { return s.id === ID; });
    if (card) { card.colorHex = COLOR; card.curl = 22; }
  } catch (e) {}

  var set = function (o) {   // 펌·세팅 기준값(막대 숫자) — curlLen 12 = 끝 12cm만 웨이브
    return Object.assign({ base: 30, define: 55, volShare: 50, volPoint: 55, weight: 35, curlLen: 12 }, o);
  };

  if (!(G.STYLE_BASE && G.STYLE_BASE.addProfile)) return;
  G.STYLE_BASE.addProfile(ID, {
    label: 'Layered bob · See-through bangs · Flick-out ends',
    config: {
      CURL_BUNDLE: {
        rodThickCm: 4,       // 굵은 롤 → 곱슬이 아니라 S결
        pitchThick: 2.0,     // 한 바퀴를 길게
        relax: 1.25,
        microAmp: 0.015,     // 잔곱슬 거의 없음
        microPhase: 0.15
      },
      CURL3D_FIX: { ampGamma: 0.75 },
      VOLUME3D: { AMP: 0.15 },
      MANNEQUIN: { lenPct: 0.9 },
      MQ_FRINGE: {
        on: true,
        tipFaceFrac: -0.15,    // 앞머리 끝: 눈썹 높이 (v2: -0.05 는 눈을 덮음)
        frontFrac: 1.0,        // v2: 앞 섹션 가닥은 전부 앞머리선에서 자름 (0.6 이면 40%가 기장대로 얼굴을 덮고 내려옴)
        crownFrac: 0.45,       // v2: 정수리 앞쪽 가닥 중 앞머리로 떨어지는 몫 (0.15 → 나머지가 입술까지 내려오던 원인)
        crownThFrac: 0.7,
        lineHalfX: 0.9,        // 이마 폭만 덮음(얼굴 양옆으로 흘러내리지 않게)
        lineGain: 0.45,        // 가운데·바깥 길이 차이 작게 → 일자에 가까운 시스루 라인 (커튼뱅 X)
        converge: 0.95,        // 끝이 아주 살짝 가운데로 → 가운데가 벌어져 양갈래로 보이지 않게
        crownAllAround: false  // 앞쪽만 자름
      },
      HAIR_DYE: { sMax: 1.2, highlightK: 0.65, glossDesat: 0.7 }
    },
    volBase: 1.0,
    after: { front: { curl: 12 }, temple: { curl: 20 } },   // 앞머리·얼굴선은 거의 곧은 C컬
    shade: { ao: 0.42, lumCap: 1.3, spec: 0.22, specPow: 60 },
    specPatch: function (spec) {
      spec.color = COLOR;
      spec.tipAt = Object.assign({}, spec.tipAt, {
        front: 0.52,        // 시스루뱅: 눈썹~눈 사이
        crown: 0.80,        // 윗층: 광대~코끝 → 층이 보이게
        temple: 0.80,       // 얼굴선: 광대 높이 (0.98 → 턱까지 내려와 양갈래로 보이던 원인)
        side: 1.02,         // 턱 아래
        occipital: 1.06,
        nape: 1.10          // 목 중간
      });
      Object.assign(spec.cut.front,     set({ texture: 80, elevation: 15, line: 50, curlDir: -15 }), { volShare: 30, weight: 45 });
      Object.assign(spec.cut.temple,    set({ texture: 60, elevation: 60, overdirection: 60, curlDir: 45 }));
      Object.assign(spec.cut.crown,     set({ texture: 50, elevation: 80, curlDir: 25 }), { volShare: 55, volPoint: 35 });
      Object.assign(spec.cut.side,      set({ texture: 60, elevation: 60, curlDir: 40 }));
      Object.assign(spec.cut.occipital, set({ texture: 55, elevation: 55, curlDir: 35 }));
      Object.assign(spec.cut.nape,      set({ texture: 55, elevation: 30, curlDir: 40 }), { technique: 'uniform' });
      spec.perm = { curl: 22, wave: 95 };     // 굵은 롤 · 약한 컬 = 느슨한 S웨이브
      spec.globalCurl = 22;
      spec.styling = Object.assign({}, spec.styling, {
        part: 0, partAmt: 30,  // v2: 앞머리로 안 잘린 윗머리는 가르마 양옆으로 넘김 (10 → 얼굴 위로 떨어짐)
        flow: 60,              // 끝 바깥말음(플립)
        volume: 50, finish: 50, sleek: 25
      });
    }
  });
  console.log('[스타일] Layered Bob 레퍼런스 맞춤 적용 (앞머리 시스루 · 얼굴선 광대 · 느슨한 S웨이브)');
})();

/* ==========================================================================
 * v3: 손님 사진에 앞머리가 "있다"고 판정되면 앞머리 가닥을 새로 안 만드는 문제
 *   마네킹은 mannequinHasFringe() === false 일 때만 앞머리선에서 자른 가닥(growFringeStrand)을 만듭니다.
 *   가운데 가르마 긴 머리 손님은 이마 양옆 머리 때문에 "앞머리 있음"으로 잡혀서
 *   앞쪽 가닥이 전부 기장대로 자라 얼굴을 덮고 턱까지 내려왔습니다(녹화 22:54).
 *   앞머리를 새로 만드는 스타일은 손님 사진과 상관없이 "앞머리 없음"으로 보고 앞머리를 새로 자릅니다.
 *   끄기: FORCE_FRINGE_STYLES = [] 또는 항목 삭제
 * ======================================================================== */
(function () {
  'use strict';
  var G = window;
  G.FORCE_FRINGE_STYLES = G.FORCE_FRINGE_STYLES || ['layered_bob_hush'];
  var orig = G.mannequinHasFringe;
  if (typeof orig !== 'function' || orig._forceWrapped) return;
  var wrapped = function () {
    try {
      var s = typeof state !== 'undefined' && state;
      var id = s && ((s.selectedStyle && (s.selectedStyle.specId || s.selectedStyle.id)) || s.pendingSpecId);
      if (id && G.FORCE_FRINGE_STYLES.indexOf(id) >= 0) return false;
    } catch (e) {}
    return orig.apply(this, arguments);
  };
  wrapped._forceWrapped = true;
  G.mannequinHasFringe = wrapped;
  console.log('[앞머리] 새로 자르는 스타일: ' + G.FORCE_FRINGE_STYLES.join(', '));
})();
