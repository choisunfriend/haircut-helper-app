/* ==========================================================================
 * 33-layered-bob-tune.js — Layered Bob (layered_bob_hush) 레퍼런스 맞춤 (2026-09-29, v4 2026-09-30)
 *
 * 레퍼런스(정면·좌50°·우50°·후면 4컷): 턱~목 중간 기장 레이어드 보브
 *   · 앞머리: 이마 전체를 얇게 덮는 시스루뱅, 끝은 눈썹~눈 사이, 살짝 안으로 C컬
 *   · 얼굴선: 광대~입꼬리 높이에서 끝나는 짧은 사이드뱅, 얼굴 "옆"에서 바깥으로 넘어감
 *   · 결: 뿌리는 차분, 중간부터 느슨한 S웨이브, 끝은 바깥으로 살짝 튕김(잔곱슬 없음)
 *   · 색: 올리브빛 애쉬 브라운
 *
 * v4 — 타겟 사진 실측(정면 컷 기준, 두상 꼭대기 0 · 눈썹 0.5 · 턱 1.0)
 *   · 앞머리 끝      0.55~0.57  : 속눈썹 바로 위. 가운데는 거의 일자, 가닥 사이로 이마·눈이 비침
 *   · 앞머리 양끝    0.68~0.72  : 눈꼬리 바깥에서 길어져 광대(눈~턱의 24%)까지 → 귀 쪽으로 넘어감
 *                                 = 앞머리와 얼굴선이 한 줄로 이어지는 "허쉬" 라인
 *   · 옆(귀 뒤)      1.04       : 턱 바로 아래. 귀는 거의 드러남(앞에 남는 건 광대 기장 얼굴선뿐)
 *   · 뒤             1.10       : 목 중간. 밑단 요철 0.014 = 거의 일자(블런트) · 양 끝만 살짝 위로 튕김
 *   · 폭             귀~광대 높이에서 가장 넓고(0.99), 밑단으로 0.92→0.73 좁아짐 · 정수리는 납작
 *   · 색(머리 픽셀)  중앙 #3B2C20 · 밝은 쪽 #594736 · 광택 #715D49 — 녹화는 중앙 #281C0F 로
 *                    약 30% 어둡고 파랑이 절반(주황기) → 색을 밝히고 채도 상한을 낮춤
 *   · 실루엣 목표 SILHOUETTE_REF.layered_bob_hush 는 이 사진 실측과 이미 일치(정면 W/H 0.82) — 그대로 둠
 *
 * 화면 녹화(09-29 23:22)에서 고칠 점:
 *   1) 크라운 가닥이 가르마에서 눈을 덮고 턱까지 늘어짐
 *      원인: 앞머리선 자르기(mqTrimAtFringeLine)가 "얼굴 앞" 판정을 얼굴 정중선(코·이마) z 하나로 함.
 *            눈 위·눈꼬리 쪽 가닥은 코끝보다 뒤에 있어 "얼굴 앞 아님" → 안 잘리고 크라운 기장(코끝~입)까지 내려옴
 *      → 얼굴 단면을 타원으로 보고 x 에 따라 얼굴 z 를 낮춰 판정 (아래 v4 블록)
 *   2) 앞머리 가운데가 갈라져 이마가 드러남 → 앞머리 가닥에는 가르마 미는 힘을 20%만
 *   3) 앞머리 끝이 한 높이 → 양끝을 광대까지 길게, 끝은 바깥으로 (아래 v4 블록)
 *   4) 부스스·잔웨이브·정수리 삐침 → 컬 정리감↑, 잔곱슬↓, 크라운 볼륨을 뿌리 대신 중간으로, sleek↑
 *   5) 뒷머리 끝이 들쭉날쭉 → 레퍼런스 뒤는 거의 일자: nape·occipital texture ↓
 * 끄기: 이 파일을 index.html 에서 빼면 원래 스펙 그대로입니다. v4 래퍼만 끄기: LB_TUNE.on = false
 * ======================================================================== */
(function () {
  'use strict';
  var G = window;
  var ID = 'layered_bob_hush';
  if (typeof STYLE_SPECS === 'undefined' || !STYLE_SPECS[ID]) return;
  var COLOR = '#7A6650';   // v4: 레퍼런스 올리브 애쉬 브라운(밝은 쪽). 염색 음영에서 어두워지는 몫을 감안해 #6B5A45 보다 한 톤 밝게

  // 목록 카드 색도 맞춤
  try {
    var card = (typeof STYLES !== 'undefined') && STYLES.find(function (s) { return s.id === ID; });
    if (card) { card.colorHex = COLOR; card.curl = 20; }
  } catch (e) {}

  var set = function (o) {   // 펌·세팅 기준값(막대 숫자) — curlLen 13 = 끝 13cm만 웨이브
    // v4: define 55 → 72 (낮으면 가닥이 흩어져 부스스 — 레퍼런스는 결이 모인 매끈한 S), weight 40 = 끝이 덜 뜨게
    return Object.assign({ base: 30, define: 72, volShare: 50, volPoint: 55, weight: 40, curlLen: 13 }, o);
  };

  if (!(G.STYLE_BASE && G.STYLE_BASE.addProfile)) return;
  G.STYLE_BASE.addProfile(ID, {
    label: 'Layered bob · See-through bangs · Flick-out ends',
    config: {
      CURL_BUNDLE: {
        rodThickCm: 4,       // 굵은 롤 → 곱슬이 아니라 S결
        pitchThick: 2.0,     // 한 바퀴를 길게
        relax: 1.25,
        microAmp: 0.008,     // v4: 0.015 → 0.008 잔곱슬 거의 없음(녹화의 자글자글한 결)
        microPhase: 0.15
      },
      CURL3D_FIX: { ampGamma: 0.75 },
      VOLUME3D: { AMP: 0.13 },   // v4: 0.15 → 0.13 레퍼런스 정수리는 납작, 귀 높이에서 가장 넓음
      MANNEQUIN: { lenPct: 0.9 },
      MQ_FRINGE: {
        on: true,
        tipFaceFrac: -0.10,    // v4: 앞머리 끝 = 눈썹과 속눈썹 사이 (레퍼런스 0.56). -0.15 는 눈썹에 걸려 짧아 보임, -0.05 는 눈을 덮음
        frontFrac: 1.0,        // v2: 앞 섹션 가닥은 전부 앞머리선에서 자름 (0.6 이면 40%가 기장대로 얼굴을 덮고 내려옴)
        crownFrac: 0.6,        // v4: 0.45 → 0.6 정수리 앞쪽 가닥 중 앞머리로 떨어지는 몫(나머지는 가르마 양옆으로)
        crownThFrac: 0.7,
        lineHalfX: 0.9,        // 이마 폭만 덮음(얼굴 양옆으로 흘러내리지 않게)
        lineGain: 0.45,        // 가운데·바깥 길이 차이 작게 → 일자에 가까운 시스루 라인 (커튼뱅 X)
        converge: 0.97,        // 가운데 기준값 — 양끝은 v4 래퍼가 바깥으로 벌림(LB_TUNE.convergeEdge)
        crownAllAround: false  // 앞쪽만 자름
      },
      HAIR_DYE: { sMax: 1.0, highlightK: 0.65, glossDesat: 0.8 }   // v4: 채도 상한 1.2 → 1.0 (녹화가 주황빛으로 뜸)
    },
    volBase: 1.0,
    after: { front: { curl: 12 }, temple: { curl: 20 } },   // 앞머리·얼굴선은 거의 곧은 C컬
    shade: { ao: 0.5, lumCap: 1.3, spec: 0.28, specPow: 60 },   // v4: ao 0.42 → 0.5 (속이 너무 검음), 광택 0.22 → 0.28 (레퍼런스 윤기)
    specPatch: function (spec) {
      spec.color = COLOR;
      spec.tipAt = Object.assign({}, spec.tipAt, {
        front: 0.55,        // v4: 시스루뱅 끝 = 속눈썹 바로 위 (0.52 는 눈썹에 걸림)
        crown: 0.78,        // 윗층: 광대 → 층이 보이게 (앞쪽은 앞머리선/얼굴선에서 따로 잘림)
        temple: 0.70,       // v4: 얼굴선 = 광대 (0.80 은 코끝 아래로 내려와 얼굴을 덮음). 앞머리 양끝과 이어짐
        side: 1.04,         // 턱 바로 아래
        occipital: 1.07,
        nape: 1.10          // 목 중간
      });
      Object.assign(spec.cut.front,     set({ texture: 80, elevation: 15, line: 50, curlDir: -15 }), { volShare: 30, weight: 45 });
      Object.assign(spec.cut.temple,    set({ texture: 70, elevation: 60, overdirection: 60, curlDir: 45 }));   // v4: texture 60 → 70 얼굴선 끝을 가늘게
      Object.assign(spec.cut.crown,     set({ texture: 50, elevation: 80, curlDir: 25 }), { volShare: 45, volPoint: 55 });   // v4: 뿌리 볼륨(35) → 중간(55) — 가르마 삐침 원인
      Object.assign(spec.cut.side,      set({ texture: 55, elevation: 60, curlDir: 40 }));
      Object.assign(spec.cut.occipital, set({ texture: 40, elevation: 55, curlDir: 35 }));   // v4: 55 → 40 뒤는 거의 일자
      Object.assign(spec.cut.nape,      set({ texture: 30, elevation: 30, curlDir: 40 }), { technique: 'uniform' });   // v4: 55 → 30 블런트 밑단(요철 0.014)
      spec.perm = { curl: 20, wave: 95 };     // 굵은 롤 · 약한 컬 = 느슨한 S웨이브 (v4: 22 → 20, 한 번 꺾이는 정도)
      spec.globalCurl = 20;
      spec.styling = Object.assign({}, spec.styling, {
        part: 0, partAmt: 45,  // v4: 30 → 45 앞머리로 안 잘린 윗머리를 가르마 양옆으로 (앞머리 가닥은 v4 래퍼가 빼 줌)
        flow: 65,              // 끝 바깥말음(플립) — v4: 60 → 65
        volume: 45, finish: 50, sleek: 45   // v4: sleek 25 → 45 뿌리·정수리 차분하게, volume 50 → 45
      });
    }
  });
  console.log('[스타일] Layered Bob 레퍼런스 맞춤 적용 v4 (시스루뱅 눈썹~속눈썹 · 양끝 광대 · 느슨한 S웨이브 · 블런트 뒷선)');
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

/* ==========================================================================
 * v4: 앞머리 라인 모양 + "얼굴 앞" 판정 + 앞머리 가르마 (layered_bob_hush 에만, 2026-09-30)
 *
 *   A) 앞머리 끝을 좌우로 휘게 (growFringeStrand)
 *      레퍼런스: 가운데는 눈썹~속눈썹 일자, 눈꼬리 바깥부터 길어져 양끝은 광대(눈~턱의 24%)까지,
 *      끝은 얼굴 옆으로 벌어져 귀 쪽으로 넘어감. 원래는 모든 앞머리 가닥 끝이 한 높이 + 가운데로 모임.
 *      → 뿌리가 앞 섹션 가장자리에 가까울수록(각도 기준) 끝 높이를 광대 쪽으로, converge 를 1 이상(바깥)으로.
 *   B) 앞머리선 자르기의 "얼굴 앞" 판정 (mqTrimAtFringeLine)
 *      원래: 가닥 z > 얼굴 정중선 z(코·이마) 일 때만 자름 → 눈 위·눈꼬리 쪽 가닥은 코보다 뒤라 안 잘림
 *            → 크라운 기장대로 눈을 덮고 입·턱까지 내려옴(녹화 23:22 정면).
 *      → 얼굴 단면을 타원으로: 얼굴 z(x) = 정중선 z · √(1 − (x/귀폭)²) · faceZK.  귀폭 faceXLim 밖(옆머리)은 그대로.
 *        자르는 높이도 A 와 같은 곡선(가운데 앞머리선 → 양끝 광대)으로.
 *   C) 앞머리 가닥의 가르마 힘 (partingPushHead)
 *      가르마 partAmt 가 앞머리 가닥에도 그대로 걸려 가운데가 양갈래로 벌어짐 → 앞머리 가닥은 fringePartK 배만.
 *
 *   조정: LB_TUNE.* 를 콘솔에서 바꾼 뒤 스타일을 다시 고르면(마네킹 재생성) 반영됩니다.
 *   끄기: LB_TUNE.on = false (원래 함수 그대로 통과)
 * ======================================================================== */
(function () {
  'use strict';
  var G = window;
  var ID = 'layered_bob_hush';
  var T = G.LB_TUNE = G.LB_TUNE || {
    on: true,
    cheekFrac: 0.24,      // 양끝 길이: 눈에서 아래로 눈~턱의 24% = 광대 (레퍼런스 실측)
    rootFrom: 0.55,       // A: 앞 섹션 각도의 55%까지는 가운데 앞머리 길이 그대로
    rootTo: 1.0,          //    섹션 가장자리에서 광대 길이
    lineFrom: 0.45,       // B: 귀폭의 45%(눈 바깥쪽)까지는 앞머리선
    lineTo: 0.8,          //    귀폭의 80%에서 광대선
    convergeCenter: 0.97, // 가운데 가닥 끝: 아주 살짝 안으로
    convergeEdge: 1.10,   // 양끝 가닥 끝: 바깥(귀 쪽)으로 벌어짐
    faceZK: 0.97,         // 얼굴 앞 판정 여유 (1 보다 작을수록 더 넓게 "얼굴 앞"으로 봄)
    faceXLim: 0.95,       // 이 폭(귀폭 비율) 밖은 옆머리 — 자르지 않음
    fringePartK: 0.2      // 앞머리 가닥에 걸리는 가르마 힘 배율
  };

  function active() {
    return T.on && G.STYLE_BASE && G.STYLE_BASE.on !== false && G.STYLE_BASE.activeId === ID;
  }
  function smooth(a, b, v) {
    var t = Math.max(0, Math.min(1, (v - a) / Math.max(1e-9, b - a)));
    return t * t * (3 - 2 * t);
  }
  function headE() { try { return getHeadEllipsoid(); } catch (e) { return null; } }
  function modelCY() {
    try {
      var M = state.hair3Dneutral || state._hair3Dneutral || state.hair3D;
      if (M && M.CY != null) return M.CY;
    } catch (e) {}
    return typeof SCALP_CENTER_Y !== 'undefined' ? SCALP_CENTER_Y : null;
  }
  function cheekY(E) {   // 광대 높이(y). mqFringeTipY 와 같은 기준: CY = 눈높이, 얼굴높이 = 눈~턱
    var cy = modelCY();
    if (cy == null || typeof _mqFaceH !== 'function') return null;
    var h = _mqFaceH(cy, E);
    return h > 0 ? cy - T.cheekFrac * h : null;
  }
  function earHalfX(E) {
    try { var p = getFaceProfile(); if (p && p.halfX > 0) return p.halfX; } catch (e) {}
    return E && E.a > 0 && typeof MQ_FRINGE !== 'undefined' ? E.a * MQ_FRINGE.lineHalfX : 0;
  }

  // 앞머리 가닥 뿌리 → 0(가운데)~1(양끝) : A·B 가 같은 곡선을 쓰도록 뿌리 각도 기준 하나로
  function rootEdgeT(root) {
    var thF = (typeof SECTION_CUT !== 'undefined' && SECTION_CUT.thFront > 0) ? SECTION_CUT.thFront : null;
    if (!thF || !root) return null;
    return smooth(T.rootFrom, T.rootTo, Math.abs(Math.atan2(root.x, root.z)) / thF);
  }

  /* A) 앞머리 끝 높이·방향 */
  var origGrow = G.growFringeStrand;
  if (typeof origGrow === 'function' && !origGrow._lbWrapped) {
    var grow = function (root, normal, tipY, maxLen, colors) {
      if (!active() || tipY == null || !root || typeof MQ_FRINGE === 'undefined') return origGrow.apply(this, arguments);
      var E = headE(), ck = E ? cheekY(E) : null, t = rootEdgeT(root);
      if (ck == null || t == null) return origGrow.apply(this, arguments);
      var tip = tipY + (Math.min(tipY, ck) - tipY) * t;           // y 가 작을수록 아래 = 길다
      var keep = MQ_FRINGE.converge;
      MQ_FRINGE.converge = T.convergeCenter + (T.convergeEdge - T.convergeCenter) * t;
      try { return origGrow.call(this, root, normal, tip, maxLen, colors); }
      finally { MQ_FRINGE.converge = keep; }
    };
    grow._lbWrapped = true;
    G.growFringeStrand = grow;
  }

  /* 지금 다듬는 가닥 (adjustStrandGeom 안에서만 유효) — B·C 가 씀 */
  var cur = null;
  var origAdj = G.adjustStrandGeom;
  if (typeof origAdj === 'function' && !origAdj._lbWrapped) {
    var adj = function (strand) {
      var prev = cur;
      cur = strand || null;
      try { return origAdj.apply(this, arguments); } finally { cur = prev; }
    };
    adj._lbWrapped = true;
    G.adjustStrandGeom = adj;
  }

  /* B) 앞머리선 자르기 — 타원 얼굴 판정 + 휘는 선 */
  function fringeTipBase(sec, E) {   // A 에서 그 가닥을 키운 원래 끝 높이 (앞=앞머리 끝, 크라운=눈썹선)
    var cy = modelCY();
    if (cy == null) return null;
    try {
      if (sec === 'crown' && MQ_FRINGE.crownLine && typeof mqCrownTipY === 'function') return mqCrownTipY(cy, E);
      return typeof mqFringeTipY === 'function' ? mqFringeTipY(cy) : null;
    } catch (e) { return null; }
  }
  var origTrim = G.mqTrimAtFringeLine;
  if (typeof origTrim === 'function' && !origTrim._lbWrapped) {
    var trim = function (pts, lineY, E, allAround) {
      if (!active() || allAround || lineY == null || !pts || pts.length < 2) return origTrim.apply(this, arguments);
      E = E || headE();
      var hx = earHalfX(E);
      if (!(hx > 0)) return origTrim.apply(this, arguments);
      var prof = null; try { prof = getFaceProfile(); } catch (e) {}
      var ck = cheekY(E);
      // 앞머리 가닥: A 와 같은 뿌리 곡선만큼 선을 내림 → 앞머리 기장 막대(lineY)는 그대로 먹고 양끝만 길게
      var fixedLy = null;
      if (cur && cur.fringe && ck != null) {
        var t0 = rootEdgeT(pts[0]), base = fringeTipBase(cur.sec, E);
        if (t0 != null && base != null) fixedLy = lineY + (Math.min(base, ck) - base) * t0;
      }
      var low = ck != null ? Math.min(lineY, ck) : lineY;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i];
        var ax = Math.abs(b.x) / hx;
        if (ax > T.faceXLim) continue;                                 // 옆머리
        var ly = fixedLy != null ? fixedLy : lineY + (low - lineY) * smooth(T.lineFrom, T.lineTo, ax);
        if (!(a.y >= ly && b.y < ly)) continue;
        var zMid = prof ? prof.zAt(b.y) : 0;
        var zFace = zMid * Math.sqrt(Math.max(0, 1 - ax * ax)) * T.faceZK;
        if (!(b.z > zFace)) continue;                                  // 얼굴 뒤(귀 옆·뒤통수)
        var f = (a.y - ly) / Math.max(1e-9, a.y - b.y);
        var out = pts.slice(0, i);
        out.push({ x: a.x + (b.x - a.x) * f, y: ly, z: a.z + (b.z - a.z) * f });
        return out.length >= 2 ? out : pts;
      }
      return pts;
    };
    trim._lbWrapped = true;
    G.mqTrimAtFringeLine = trim;
  }

  /* C) 앞머리 가닥의 가르마 힘 */
  var origPart = G.partingPushHead;
  if (typeof origPart === 'function' && !origPart._lbWrapped) {
    var part = function () {
      var v = origPart.apply(this, arguments);
      if (!v || !(cur && cur.fringe) || !active()) return v;
      var k = T.fringePartK;
      if (!(k > 0)) return null;
      return { x: v.x * k, y: v.y * k, z: v.z * k };
    };
    part._lbWrapped = true;
    G.partingPushHead = part;
  }
  console.log('[Layered Bob v4] 앞머리 곡선(가운데 눈썹~속눈썹 → 양끝 광대) · 타원 얼굴 판정 · 앞머리 가르마 ' +
    Math.round(T.fringePartK * 100) + '% (끄기 LB_TUNE.on=false)');
})();
