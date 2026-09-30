/*
 * 31-hippie-wave-eyeguard.js
 *
 * (1) 눈 가림 공통 원인 수정 — "EYE_GUARD"
 *     스타일 스펙을 적용하면 applyStyleSpecAndRender → mannequinReset()이 마네킹을 켜고,
 *     앞머리는 MQ_FRINGE 규칙으로 심기/잘립니다. 여기서 네 가지가 겹쳐 앞머리가 눈을 덮었습니다.
 *       a. MQ_FRINGE.tipFaceFrac 기본값 0 = 심는 앞머리 끝이 "눈높이"(CY) 그 자체.
 *       b. fringeLineY()의 바닥(lineFloorFaceFrac 0.4) = 눈 아래로 눈~턱의 40%까지 허용.
 *       c. 길이 역산(solveSectionLengthForTipY → measureSectionTipY → adjustStrandGeom) 동안
 *          fringeLineY()가 "시험 길이"가 아닌 state.sections[sec].length(이전 값)를 읽음.
 *          → 역산할 때 본 앞머리선과, 확정 길이로 다시 그린 앞머리선이 달라서 결과가 더 내려감.
 *       d. 스펙 tipAt.front 0.46~0.52 — headHeightRef 기준 0.5 = 두상 타원 중심 = 눈높이.
 *          (눈썹 ≈ 0.41, 윗눈꺼풀 ≈ 0.465) 즉 목표 자체가 눈 위/눈 한가운데였음.
 *       + 역산 뒤에 도는 after(컬 줄이기)·sweep(앞으로 넘김)·gravityDroop이 끝을 더 내림.
 *     고친 것
 *       - 기본 앞머리 끝: 눈높이 → 눈썹~윗눈꺼풀 사이(defaultTipFaceFrac). 프로필이 직접 정하면 그 값.
 *       - 앞머리선 바닥: 눈 아래 40% → 윗눈꺼풀 위(lineFloorFaceFrac).
 *       - 역산 중엔 시험 길이로 앞머리선을 계산(역산 ↔ 최종 일치).
 *       - 스펙 tipAt.front 상한 maxFrontTipAt.
 *       - 마지막 안전망: 모든 변형이 끝난 가닥이 "눈 상자"(얼굴 앞, 눈 높이, 눈 폭)에 들어가면
 *         윗눈꺼풀 선에서 자름. passFrac 만큼은 동공선까지 허용(시스루 결).
 *     끄기: EYE_GUARD.on = false. 일부러 눈을 넘기는 스타일은 EYE_GUARD.allow에.
 *
 * (2) Men's Hippie Perm → 레퍼런스(미디엄 S웨이브 · 시스루 앞머리 · 둥근 볼륨)로 재조정.
 */
(function () {
  'use strict';

  var W = window;
  var TAG = '[눈가림 방지]';

  var EYE_GUARD = W.EYE_GUARD = Object.assign({
    on: true,
    // 얼굴 계측 단위: faceH = 눈~턱 길이(_mqFaceH). 음수 = 눈 위.
    defaultTipFaceFrac: -0.14, // 프로필이 tipFaceFrac을 안 정했을 때 심는 앞머리 끝(눈썹과 윗눈꺼풀 사이)
    lineFloorFaceFrac: -0.06,  // 앞머리선이 내려갈 수 있는 가장 낮은 곳(윗눈꺼풀 위)
    fixSolveLength: true,      // 역산 중 fringeLineY가 시험 길이를 쓰게
    maxFrontTipAt: 0.45,       // 스펙 tipAt.front 상한(0.5 = 눈높이)
    trim: true,                // 최종 눈 상자 트림
    boxTopFaceFrac: -0.06,     // 눈 상자 윗선(= 트림선)
    boxBotFaceFrac: 0.3,       // 눈 상자 아랫선(광대)
    boxHalfXFrac: 0.75,        // 얼굴 반폭 대비 눈 상자 반폭
    zBackFrac: 0.22,           // 얼굴 정중선 z에서 이만큼(E.c 대비) 뒤까지를 "얼굴 앞"으로
    passFrac: 0.12,            // 이 비율의 가닥은 passFaceFrac까지 허용(시스루 결)
    passFaceFrac: 0.0,         // = 동공선
    allow: ['curtain_bang_shag', 'long_blowout_waves', 'reggae_twist'],
    stats: { trimmed: 0, seen: 0 }
  }, W.EYE_GUARD || {});

  function has(name) { return typeof W[name] === 'function'; }
  function st() { return typeof state !== 'undefined' ? state : null; }
  function mqOn() { return typeof MANNEQUIN !== 'undefined' && !!MANNEQUIN.on; }

  function currentStyleId() {
    var s = st();
    return EYE_GUARD._applying || (s && s.specAppliedId) || null;
  }
  function allowed(id) { return !!id && EYE_GUARD.allow.indexOf(id) >= 0; }
  function active() { return EYE_GUARD.on && mqOn() && !allowed(currentStyleId()); }

  function profileSetsTip() {
    var sb = W.STYLE_BASE;
    var p = sb && sb.active;
    return !!(p && p.config && p.config.MQ_FRINGE && typeof p.config.MQ_FRINGE.tipFaceFrac === 'number');
  }

  // ── 기하 캐시(모델·얼굴 프로필이 바뀔 때만 다시 계산) ──
  var _geo = null;
  function geom() {
    var s = st();
    if (!s) return null;
    var h = s._hair3Dneutral || null;
    var prof = null;
    try { prof = has('getFaceProfile') ? getFaceProfile() : null; } catch (e) {}
    if (_geo && _geo.h === h && _geo.prof === prof) return _geo.v;
    var v = null;
    try {
      var E = getHeadEllipsoid();
      if (E && E.a > 0 && E.b > 0 && E.c > 0) {
        var CY = h && isFinite(h.CY) ? h.CY : (typeof SCALP_CENTER_Y !== 'undefined' ? SCALP_CENTER_Y : 0.15);
        var fh = has('_mqFaceH') ? _mqFaceH(CY, E) : E.b / 0.633 * 0.7;
        if (fh > 0) {
          var halfX = prof && prof.halfX > 0 ? prof.halfX : E.a * 0.95;
          v = {
            E: E, CY: CY, fh: fh, prof: prof,
            floorY: CY - EYE_GUARD.lineFloorFaceFrac * fh,
            topY: CY - EYE_GUARD.boxTopFaceFrac * fh,
            passY: CY - EYE_GUARD.passFaceFrac * fh,
            botY: CY - EYE_GUARD.boxBotFaceFrac * fh,
            xHalf: halfX * EYE_GUARD.boxHalfXFrac,
            zBack: EYE_GUARD.zBackFrac * E.c
          };
        }
      }
    } catch (e) { v = null; }
    _geo = { h: h, prof: prof, v: v };
    return v;
  }

  function hash3(p) {
    var t = Math.sin(p.x * 127.1 + p.y * 311.7 + p.z * 74.7) * 43758.5453;
    return t - Math.floor(t);
  }

  // 모든 변형 뒤의 가닥을 눈 상자에서 자름
  function eyeBoxTrim(pts, g) {
    if (!pts || pts.length < 3 || !g) return pts;
    var lim = hash3(pts[0]) < EYE_GUARD.passFrac ? g.passY : g.topY;
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i];
      if (!(p.y < lim) || !(p.y > g.botY) || !(Math.abs(p.x) < g.xHalf)) continue;
      var zf = g.prof ? g.prof.zAt(p.y) : g.E.c;
      if (!(p.z > zf - g.zBack)) continue;
      var out = pts.slice(0, i);
      var q = pts[i - 1];
      if (q.y >= lim && q.y - p.y > 1e-9) {
        var t = (q.y - lim) / (q.y - p.y);
        out.push({ x: q.x + (p.x - q.x) * t, y: lim, z: q.z + (p.z - q.z) * t });
      }
      EYE_GUARD.stats.trimmed++;
      return out.length >= 2 ? out : pts.slice(0, 2);
    }
    return pts;
  }

  // ── 래핑 ──
  function wrap(name, make) {
    var f = W[name];
    if (typeof f !== 'function' || f.__eyeGuard) {
      if (typeof f !== 'function') console.warn(TAG + ' ' + name + ' 없음 — 건너뜀');
      return;
    }
    var g = make(f);
    g.__eyeGuard = true;
    W[name] = g;
  }

  // a. 심는 앞머리 끝
  wrap('mqFringeTipY', function (orig) {
    return function (cy) {
      var y = orig.apply(this, arguments);
      if (y == null || !active() || profileSetsTip()) return y;
      var g = geom();
      return g ? cy - EYE_GUARD.defaultTipFaceFrac * g.fh : y;
    };
  });

  // b. 앞머리선 바닥
  wrap('fringeLineY', function (orig) {
    return function (sec) {
      var y = orig.apply(this, arguments);
      if (y == null || sec !== 'front' || !active()) return y;
      var g = geom();
      return g ? Math.max(y, g.floorY) : y;
    };
  });

  // c. 역산 중 시험 길이 + 최종 눈 상자 트림
  wrap('adjustStrandGeom', function (orig) {
    return function (strand, len) {
      var s = st();
      var restore = null;
      if (EYE_GUARD.on && EYE_GUARD.fixSolveLength && strand && strand.mannequin &&
          typeof len === 'number' && s && s.sections &&
          (strand.sec === 'front' || strand.sec === 'crown') && s.sections[strand.sec] &&
          s.sections[strand.sec].length !== len) {
        restore = [s.sections[strand.sec], s.sections[strand.sec].length];
        restore[0].length = len;
      }
      var out;
      try { out = orig.apply(this, arguments); }
      finally { if (restore) restore[0].length = restore[1]; }
      if (EYE_GUARD.trim && strand && strand.mannequin && active()) {
        EYE_GUARD.stats.seen++;
        out = eyeBoxTrim(out, geom());
      }
      return out;
    };
  });

  // d. 스펙 tipAt.front 상한 + 적용 중 스타일 id 표시
  wrap('applyStyleSpec', function (orig) {
    return function (id) {
      var spec = null;
      try { spec = getStyleSpec(id); } catch (e) {}
      if (EYE_GUARD.on && spec && spec.tipAt && typeof spec.tipAt.front === 'number' &&
          !allowed(id) && spec.tipAt.front > EYE_GUARD.maxFrontTipAt) {
        console.log(TAG + ' ' + id + ' tipAt.front ' + spec.tipAt.front + ' → ' + EYE_GUARD.maxFrontTipAt +
          ' (0.5 = 눈높이)');
        spec.tipAt.front = EYE_GUARD.maxFrontTipAt;
      }
      EYE_GUARD._applying = id;
      EYE_GUARD.stats.trimmed = 0;
      EYE_GUARD.stats.seen = 0;
      _geo = null;
      try { return orig.apply(this, arguments); }
      finally {
        EYE_GUARD._applying = null;
        if (EYE_GUARD.on) {
          console.log(TAG + ' ' + id + (allowed(id) ? ' — 허용 스타일(가드 끔)' :
            ' — 앞머리 끝 기본 ' + EYE_GUARD.defaultTipFaceFrac + (profileSetsTip() ? '(프로필 값 사용)' : '') +
            ' · 바닥 ' + EYE_GUARD.lineFloorFaceFrac + ' · 역산 중 눈 상자에서 자른 가닥 ' +
            EYE_GUARD.stats.trimmed + '/' + EYE_GUARD.stats.seen));
        }
      }
    };
  });

  // ── (2) Men's Hippie Perm 재조정 ──
  var HIPPIE = 'hippie_curl_men';
  if (typeof STYLE_SPECS !== 'undefined') {
    STYLE_SPECS[HIPPIE] = {
      name: "Men's hippie perm · Loose S-waves · See-through fringe",
      // 0.5 = 눈높이, 1.0 ≈ 턱선
      tipAt: {
        front: 0.43,     // 눈썹~윗눈꺼풀
        crown: 0.40,     // 크라운 레이어가 이마로 떨어져 앞머리와 섞임
        temple: 0.52,    // 광대 위
        side: 0.60,      // 귀를 반쯤 덮음
        occipital: 0.80,
        nape: 0.95       // 목덜미 · 살짝 뻗침
      },
      cut: {
        crown:     { technique: 'uniform',    elevation: 80, texture: 60, density: 90, curlDir: -10 },
        front:     { technique: 'uniform',    elevation: 25, texture: 70, density: 70, line: 55, curlDir: -30 },
        temple:    { technique: 'graduation', elevation: 45, texture: 60, density: 85, overdirection: 20, curlDir: 10 },
        side:      { technique: 'graduation', elevation: 40, texture: 55, density: 85, curlDir: 25 },
        occipital: { technique: 'uniform',    elevation: 50, texture: 55, density: 90, curlDir: 20 },
        nape:      { technique: 'graduation', elevation: 25, texture: 50, density: 80, line: 60, curlDir: 30 }
      },
      perm: { curl: 55, wave: 62 },   // 이전 72/18 = 가는 로드 스프링 컬
      styling: { sweep: -12, volume: 70, flow: 10, part: 0, partAmt: 25, finish: 55, sleek: 0 },
      globalCurl: 55,
      color: '#2B2016'
    };
  }
  if (typeof STYLES !== 'undefined') {
    var st0 = STYLES.find(function (s) { return s && s.id === HIPPIE; });
    if (st0) {
      st0.tags = 'Loose S-waves · See-through fringe · Rounded volume';
      st0.length = 45;
      st0.curl = 55;
      st0.volume = 72;
    }
  }
  if (W.STYLE_BASE && typeof W.STYLE_BASE.addProfile === 'function' && !W.STYLE_BASE.profiles[HIPPIE]) {
    W.STYLE_BASE.addProfile(HIPPIE, {
      label: "Men's hippie perm · Loose S-waves",
      config: {
        CURL_BUNDLE: { rodThickCm: 4.5, pitchThick: 2.4, relax: 1.3, microAmp: 0.03, microPhase: 0.18 },
        CURL3D_FIX: { ampGamma: 0.8 },
        VOLUME3D: { AMP: 0.17 },
        MQ_FRINGE: { tipFaceFrac: -0.16 }
      },
      volBase: 1,
      shade: { ao: 0.44, lumCap: 1.3, spec: 0.2, specPow: 55 }
    });
  }

  console.log(TAG + ' 설치 — 앞머리 기본 끝 ' + EYE_GUARD.defaultTipFaceFrac + ' · 바닥 ' +
    EYE_GUARD.lineFloorFaceFrac + ' · tipAt.front 상한 ' + EYE_GUARD.maxFrontTipAt +
    ' · 허용 ' + EYE_GUARD.allow.join(', ') + ' · 끄기 EYE_GUARD.on=false');
})();
