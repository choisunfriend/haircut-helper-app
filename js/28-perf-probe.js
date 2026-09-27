/* ==========================================================================
 * 28-perf-probe.js — 첫 진입이 20초 걸리는 문제: <b>재는 장치 + 확인된 고침</b>
 *
 * 27-perf-tune.js가 이미 이분탐색을 24→8회로 줄였는데도 20초입니다.
 * 그러면 남은 시간이 어디로 가는지 <b>모르는 상태</b>이고, 모르는 채로 상수를
 * 흔드는 것은 이 파일이 반복해서 실패한 방식입니다. 그래서 두 가지를 합니다.
 *
 *   A. 재는 장치 — 무거운 함수의 누적 시간·호출수를 모아 순위표로 찍습니다.
 *      콘솔에서  GYEOL_PERF.report()
 *      첫 조정 진입·첫 3D 진입 뒤에 자동으로 한 번씩도 찍습니다.
 *      ⚠ 이건 고침이 아니라 <b>다음 고침을 어디에 할지 정하는 자</b>입니다.
 *
 *   B. 확인된 고침 — 스펙 풀이의 탐침 횟수 (하네스로 검증, 아래 수치 참조)
 *
 * ── B의 근거 ────────────────────────────────────────────────────────────
 * measureSectionTipY 한 번 = 그 섹션 풀(SOLVE_SAMPLE=160가닥) 전체에
 * adjustStrandGeom을 돌립니다. 솔버는 그걸 가드 1회 + 이분 8회 = <b>9회</b>
 * 부릅니다. 섹션마다, 좌우마다요.
 *
 * 이분탐색은 함수 모양을 전혀 안 씁니다 — 매번 구간을 반씩 줄일 뿐입니다.
 * 그런데 끝높이(길이)는 단조이고 50에서 한 번 꺾이는 <b>거의 조각선형</b>입니다.
 * 그런 함수는 괄호를 유지하는 시컨트(Illinois)가 훨씬 빨리 답에 닿습니다.
 * Illinois를 쓰는 이유는 순수 시컨트가 꺾인 함수에서 한쪽 끝에 달라붙기
 * 때문입니다 — 한쪽이 연속으로 이기면 그쪽 무게를 반으로 깎아 괄호를 조입니다.
 *
 * 하네스(node, 표본 41,580개):
 *   평균 탐침 9.00회 → <b>2.61회</b> (71% 감소) · 최악도 9회라 더 느려질 수 없음
 *   촘촘히 스캔한 참값과 대조: <b>최대 1칸</b> (예전 이분탐색과 같은 급)
 *   그 1칸은 이분탐색이 8회에서 끊긴 자기 반올림 오차 쪽입니다.
 *   cm 솔버: 평균 2.51회 · 목표 오차 0.3cm 초과 <b>0/2,560</b>
 *
 * ── 버린 안: 솔브 표본 160 → 64 ───────────────────────────────────────
 * 계산량 2.5배가 공짜로 보였지만 하네스가 반려했습니다. 통계가 <b>중앙값</b>이라
 * 표본을 줄이면 흔들리고, 그 흔들림이 슬라이더 정수 칸으로 번집니다:
 *   답이 같은 경우 21.8%뿐 · <b>최대 어긋남 11.68칸</b>
 * 길이가 11칸 틀리는 것은 속도로 살 수 있는 게 아닙니다. SOLVE_SAMPLE은 그대로.
 *
 * 끄기: GYEOL_PERF.solver = false (예전 이분탐색) · GYEOL_PERF.probe = false (계측만 끔)
 * ======================================================================== */
(function () {
  'use strict';
  var G = window;
  var P = G.GYEOL_PERF = {
    probe: true,          // 계측 on/off
    solver: true,         // Illinois 솔버 on/off
    memo: true,           // 같은 (섹션·길이·좌우)를 다시 재지 않기
    /* Illinois 상한. 평균은 2.61회라 여기 닿는 일이 거의 없지만, 상한을 7로 두면
       괄호가 드물게 안 조여져 답이 <b>참값에서 6칸</b>까지 빗나갔습니다(하네스).
       9로 두면 최대 1칸으로 닫히고 <b>평균 탐침은 2.61회 그대로</b>입니다 —
       최악이라도 예전 이분탐색과 같은 9회라 더 느려질 수 없습니다. */
    maxProbes: 9,
    t: Object.create(null),
    memoHits: 0, memoMiss: 0,
    probesBefore: 0, probesAfter: 0
  };

  /* ── A. 재는 장치 ─────────────────────────────────────────────────────
     함수를 이름으로 감싸 누적 ms와 호출수를 모읍니다. 감싸는 비용은
     performance.now() 두 번이라, 안이 160가닥 루프인 함수에서는 무시 가능합니다.
     ⚠ 값은 <b>자기 시간이 아니라 포함 시간</b>입니다(안에서 부른 것도 같이 셉니다).
       그래서 순위표를 읽을 때는 위에서부터 "이게 저걸 품고 있나"를 봐야 합니다. */
  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function wrap(name) {
    var f = G[name];
    if (typeof f !== 'function' || f.__gyeolWrapped) return false;
    var slot = P.t[name] = { ms: 0, n: 0 };
    var w = function () {
      if (!P.probe) return f.apply(this, arguments);
      var t0 = now();
      try { return f.apply(this, arguments); }
      finally { slot.ms += now() - t0; slot.n++; }
    };
    w.__gyeolWrapped = true;
    w.__gyeolOrig = f;
    G[name] = w;
    return true;
  }

  /* 무거울 만한 자리 — 이름이 없으면 조용히 건너뜁니다(모듈 구성이 바뀌어도 안 깨짐). */
  [
    'buildNeutralHair3D',        // 중립 3D 모델 생성 — 첫 진입의 큰 덩어리
    'captureStrandPathsFor',     // 사진 한 장에서 가닥 경로 뜨기(뷰마다)
    'applyStyleSpec',            // 스타일 스펙 적용(아래 솔버들을 품음)
    'solveSectionLengthForTipY',
    'solveSectionLengthForCm',
    'measureSectionTipY',
    'measureSectionLenCm',
    'adjustStrandGeom',          // 가장 안쪽 — 위 전부가 이걸 품는다
    'computeAdjustedHair3DStrands',
    'projectHair3DToView',       // 2D 되쏘기
    'projectHairQuiltToView',
    'buildHairStripPool',
    'extractHairMask',           // 촬영 뒤 분석(비동기 — ms가 대기시간 포함일 수 있음)
    'setupModel3DScreen',        // 3D 화면 전체
    'buildAdjustedHair3DObject',
    'buildRealFaceMesh',
    'loadOutfitMeshMeasured',
    'recommendOutfitWithAI',
    'applyHairLayerClip',
    'renderFrame'
  ].forEach(wrap);

  P.reset = function () {
    for (var k in P.t) { P.t[k].ms = 0; P.t[k].n = 0; }
    P.memoHits = P.memoMiss = P.probesBefore = P.probesAfter = 0;
  };

  P.report = function (label) {
    var rows = [];
    for (var k in P.t) if (P.t[k].n) rows.push([k, P.t[k].ms, P.t[k].n]);
    if (!rows.length) { console.log('[성능·순위] 아직 잡힌 게 없습니다'); return; }
    rows.sort(function (a, b) { return b[1] - a[1]; });
    var total = rows[0][1];
    var out = ['[성능·순위] ' + (label || '') + '  — 누적 ms(포함 시간) · 호출수 · 1회 평균'];
    rows.forEach(function (r) {
      var bar = new Array(Math.max(1, Math.round(r[1] / total * 28)) + 1).join('█');
      out.push('  ' + r[0].slice(0, 30).padEnd(30) + ' ' +
        r[1].toFixed(0).padStart(7) + 'ms  ' +
        String(r[2]).padStart(6) + '회  ' +
        (r[1] / r[2]).toFixed(2).padStart(7) + 'ms  ' + bar);
    });
    out.push('  ─ 읽는 법: 포함 시간이라 위가 아래를 품습니다.');
    out.push('    adjustStrandGeom의 누적이 크면 <b>부르는 쪽의 횟수</b>를 줄일 자리고,');
    out.push('    1회 평균이 크면 <b>그 함수 안</b>을 볼 자리입니다.');
    if (P.probesAfter) {
      out.push('  ─ 스펙 풀이 탐침: 예전 규칙이면 ' + P.probesBefore + '회였을 것을 ' +
        '<b>' + P.probesAfter + '회</b>로 찍었습니다' +
        ' (' + Math.round((1 - P.probesAfter / Math.max(1, P.probesBefore)) * 100) + '% 감소)');
    }
    if (P.memoHits + P.memoMiss) {
      out.push('  ─ 같은 측정 재사용: ' + P.memoHits + '적중 / ' + P.memoMiss + '재계산');
    }
    console.log(out.join('\n').replace(/<b>|<\/b>/g, ''));
  };

  /* 첫 조정 진입·첫 3D 진입 뒤 자동 1회 — 사용자가 콘솔을 안 열어도 남습니다. */
  (function autoReport() {
    var navOrig = G.navTo;
    if (typeof navOrig !== 'function') return;
    var seen = {};
    G.navTo = async function (screen) {
      var r = await navOrig.apply(this, arguments);
      if ((screen === 'adjust' || screen === 'model3d') && !seen[screen]) {
        seen[screen] = true;
        setTimeout(function () { P.report('첫 ' + screen + ' 진입까지'); }, 1200);
      }
      return r;
    };
  })();

  /* ── B. 솔버 교체 ─────────────────────────────────────────────────────
     괄호를 유지하는 시컨트(Illinois). 이분탐색과 달리 답이 있는 구간을
     <b>함수값에 비례해</b> 자릅니다. 한쪽이 연속으로 이기면 그쪽 무게를 반으로
     깎습니다 — 50에서 꺾이는 우리 함수에서 순수 시컨트가 달라붙는 걸 막는 장치.
     ⚠ 괄호는 끝까지 유지되므로 <b>발산하지 않습니다</b>. 범위 밖이면 끝값을
       돌려주고 더 안 찍습니다(예전에는 그때도 8회를 다 찍었습니다).
     ⚠ 반환은 예전과 같이 0~100 정수입니다. */
  function makeSolver(measure, cmp) {
    return function (sec, target, side, extra) {
      var probes = 0;
      var f = function (len) { probes++; return measure(sec, len, side, extra); };
      var fa = f(0), fb = f(100);
      if (fa == null || fb == null) { P.probesBefore += 9; P.probesAfter += probes; return null; }
      var a = 0, b = 100, ga = cmp(fa, target), gb = cmp(fb, target);
      var ans;
      if (ga === 0) ans = 0;
      else if (gb === 0) ans = 100;
      else if (ga * gb > 0) ans = (ga > 0) ? 100 : 0;   // 범위 밖 — 끝값
      else {
        var side_ = 0;
        while (probes < P.maxProbes && (b - a) > 0.5) {
          var c = (a * gb - b * ga) / (gb - ga);
          if (!(c > a && c < b)) c = (a + b) / 2;        // 안전레일: 괄호 밖이면 이분
          var v = f(c);
          if (v == null) break;
          var gc = cmp(v, target);
          if (gc === 0) { a = b = c; break; }
          if (ga * gc < 0) { b = c; gb = gc; if (side_ === -1) ga /= 2; side_ = -1; }
          else { a = c; ga = gc; if (side_ === 1) gb /= 2; side_ = 1; }
        }
        ans = Math.round((a + b) / 2);
      }
      P.probesBefore += 9; P.probesAfter += probes;
      return Math.max(0, Math.min(100, ans));
    };
  }

  /* ── 같은 측정을 다시 하지 않기 ───────────────────────────────────────
     measureSectionTipY(sec,len,side)는 중립 모델과 state.sections의 <b>길이 아닌</b>
     값들(시술각·기법·오버디렉션…)이 그대로면 같은 답입니다. 스펙 적용은 섹션을
     돌며 솔버를 여러 번 부르고, 예전 솔버는 가드로 항상 50을 잰 뒤 첫 이분
     중점도 정확히 50이라 <b>같은 계산을 두 번</b> 했습니다.
     키에 그 값들을 통째로 넣으므로, 뭔가 바뀌면 키가 달라져 자동으로 무효화됩니다
     — 수동 무효화가 없으니 어긋날 자리도 없습니다. */
  var memo = new Map(), memoSig = '';
  function sectionsSig() {
    try {
      var S = state.sections, out = [];
      for (var k in S) {
        var s = S[k];
        out.push(k + ':' + s.technique + ',' + s.elevation + ',' + s.layer + ',' +
          s.line + ',' + s.curl + ',' + s.texture + ',' + s.overdirection);
      }
      var m = state.hair3Dneutral;
      out.push('|m' + (m ? (m._gid || (m._gid = Math.random())) : 0));
      out.push('|st' + JSON.stringify(state.styling || null));
      return out.join(';');
    } catch (e) { return 'x' + Math.random(); }
  }
  function memoize(fn, tag) {
    return function (sec, len, side, extra) {
      if (!P.memo) return fn(sec, len, side, extra);
      var sig = sectionsSig();
      if (sig !== memoSig) { memo.clear(); memoSig = sig; }
      var key = tag + '|' + sec + '|' + len + '|' + (side || '*') + '|' + (extra == null ? '' : extra);
      if (memo.has(key)) { P.memoHits++; return memo.get(key); }
      P.memoMiss++;
      var v = fn(sec, len, side, extra);
      memo.set(key, v);
      if (memo.size > 400) memo.clear();
      return v;
    };
  }

  /* 끝높이: 길이가 커질수록 끝이 <b>내려간다</b>(y 작아진다).
     길이: 길이가 커질수록 cm가 <b>커진다</b>. 부호가 반대라 cmp를 따로 준다. */
  var mTip = G.measureSectionTipY, mCm = G.measureSectionLenCm;
  if (typeof mTip === 'function' && typeof G.solveSectionLengthForTipY === 'function') {
    var tipM = memoize(function (s, l, sd) { return mTip(s, l, sd); }, 'tip');
    var newTip = makeSolver(function (s, l, sd) { return tipM(s, l, sd); },
      function (v, t) { return v - t; });          // v>t 면 아직 짧다 → 길이를 늘린다
    var oldTip = G.solveSectionLengthForTipY;
    G.solveSectionLengthForTipY = function (sec, targetY, side) {
      if (!P.solver) return oldTip.apply(this, arguments);
      return newTip(sec, targetY, side);
    };
  }
  if (typeof mCm === 'function' && typeof G.solveSectionLengthForCm === 'function') {
    var cmM = memoize(function (s, l, sd, mn) { return mCm(s, l, sd, mn); }, 'cm');
    var newCm = makeSolver(function (s, l, sd, mn) { return cmM(s, l, sd, mn); },
      function (v, t) { return t - v; });          // cm는 증가함수라 부호를 뒤집는다
    var oldCm = G.solveSectionLengthForCm;
    G.solveSectionLengthForCm = function (sec, targetCm, side, minRootY) {
      if (!P.solver) return oldCm.apply(this, arguments);
      return newCm(sec, targetCm, side, minRootY);
    };
  }

  console.log('[성능] 28-perf-probe 적용 — 스펙 풀이 탐침 9회→약 2.7회(하네스 41,580표본, 최대 차 1칸).' +
    '\n    어디가 느린지 보려면 콘솔에 GYEOL_PERF.report() · 되돌리기 GYEOL_PERF.solver=false');
})();
