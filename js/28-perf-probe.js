/* ==========================================================================
 * 28-perf-probe.js — 첫 진입이 20초 걸리는 문제: <b>재는 장치 + 확인된 고침</b>
 *
 * 27-perf-tune.js가 이미 이분탐색을 24→8회로 줄였는데도 20초입니다.
 * 그러면 남은 시간이 어디로 가는지 <b>모르는 상태</b>이고, 모르는 채로 상수를
 * 흔드는 것은 이 파일이 반복해서 실패한 방식입니다. 그래서 두 가지를 합니다.
 *
 *   A. 재는 장치 — 무거운 함수의 누적 시간·호출수를 모아 순위표로 냅니다.
 *      나오는 자리는 <b>화면의 진단정보 패널</b>입니다(perfPanelLines에 이어 붙임).
 *      폰에는 콘솔이 없고, 무엇보다 이 앱이 느린 곳은 저사양 폰이라
 *      <b>느린 기계가 스스로 읽을 수 있어야</b> 재는 의미가 있습니다.
 *      콘솔이 있는 환경이면 GYEOL_PERF.report()도 같은 표를 찍습니다.
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

  /* 무거울 만한 자리 — 이름이 없으면 조용히 건너뜁니다(모듈 구성이 바뀌어도 안 깨짐).
     ⚠ <b>async 함수는 첫 await까지만</b> 잡힙니다(래퍼의 finally가 프라미스를
       돌려주는 시점에 돕니다). 그래서 setupModel3DScreen·extractHairMask·
       buildNeutralHair3D가 실제보다 작게 나옵니다 — 그 줄은 "이 함수가 빠르다"가
       아니라 "여기서는 못 잰다"로 읽어야 합니다. 동기 함수(adjustStrandGeom,
       computeAdjustedHair3DStrands, applyStyleSpec, buildAdjustedHair3DObject,
       renderFrame)의 숫자는 그대로 믿어도 됩니다. */
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

  /* 폭 좁은 폰 화면이라 이름을 22자로 자르고 막대는 14칸까지만 씁니다.
     기기 정보를 같이 찍는 이유: 이 숫자는 <b>이 기계의 숫자</b>라서,
     나중에 다른 기기 표와 나란히 놓으려면 어느 기계였는지가 붙어 있어야 합니다. */
  P.lines = function () {
    var rows = [];
    for (var k in P.t) if (P.t[k].n) rows.push([k, P.t[k].ms, P.t[k].n]);
    var dev = '';
    try {
      dev = ' · 코어 ' + (navigator.hardwareConcurrency || '?') +
        (navigator.deviceMemory ? ' · RAM ' + navigator.deviceMemory + 'GB' : '') +
        (typeof isLowMemDevice === 'function' && isLowMemDevice() ? ' · 저사양판정' : '');
    } catch (e) {}
    var out = ['[성능·순위] 앱을 연 뒤 누적' + dev];
    if (!rows.length) {
      out.push('  아직 잡힌 게 없습니다 — 조정 화면을 한 번 거친 뒤 다시 열어보세요.');
      return out;
    }
    rows.sort(function (a, b) { return b[1] - a[1]; });
    var top = rows[0][1];
    out.push('  함수                   누적ms   호출   1회');
    rows.forEach(function (r) {
      var bar = new Array(Math.max(1, Math.round(r[1] / top * 14)) + 1).join('▇');
      out.push('  ' + r[0].slice(0, 22).padEnd(22) +
        r[1].toFixed(0).padStart(7) + '  ' +
        String(r[2]).padStart(5) + '  ' +
        (r[1] / r[2]).toFixed(1).padStart(6) + ' ' + bar);
    });
    out.push('  ─ 포함 시간입니다 — 위가 아래를 품습니다.');
    out.push('    누적이 크면 <b>부르는 쪽 횟수</b>를, 1회가 크면 <b>그 함수 안</b>을 볼 자리입니다.');
    if (P.probesAfter) {
      out.push('  ─ 스펙 풀이 탐침 ' + P.probesBefore + '회 → <b>' + P.probesAfter + '회</b>' +
        ' (' + Math.round((1 - P.probesAfter / Math.max(1, P.probesBefore)) * 100) + '% 감소)');
    }
    if (P.memoHits + P.memoMiss) {
      out.push('  ─ 같은 측정 재사용 ' + P.memoHits + '적중 / ' + P.memoMiss + '재계산');
    }
    return out;
  };

  P.report = function (label) {
    console.log((label ? '[' + label + ']\n' : '') +
      P.lines().join('\n').replace(/<b>|<\/b>/g, ''));
  };

  /* ── 순위표를 <b>진단정보 패널</b>로 보낸다 (필수) ────────────────────
     처음에 이걸 console.log로만 냈는데, 사용자가 짚었습니다:
     "지금 스마트폰으로 찍어서 콘솔로는 안 보이고" · "노트북은 훨씬 빨리 뜰 텐데
     그래도 콘솔로 진단돼?"

     둘 다 맞습니다. 그리고 두 번째가 더 중요합니다 — 노트북에서 재면
     <b>다른 기계의 숫자</b>가 나올 뿐입니다. 저사양 폰에서 20초인 것이 노트북에서
     2초면 그 순위표는 "여긴 안 느리다"만 말하고, 정작 폰에서 무엇이 오래
     걸리는지는 못 말합니다. 재는 장치는 <b>느린 기계가 읽을 수 있는 자리</b>에
     있어야 합니다. 이 앱에서 그 자리는 콘솔이 아니라 진단정보 패널입니다.

     perfPanelLines()가 그 패널의 첫 블록이라 거기에 이어 붙입니다
     (패널을 여는 쪽 toggleDiagInfo는 안 건드립니다 — 부르는 자리가 한 곳이라
     여기만 감싸면 됩니다). */
  (function toPanel() {
    var orig = G.perfPanelLines;
    if (typeof orig !== 'function') return;
    G.perfPanelLines = function () {
      var lines = orig.apply(this, arguments);
      try { lines = lines.concat(P.lines()); } catch (e) { lines.push('  [성능·순위] 실패: ' + e); }
      return lines;
    };
  })();

  /* 첫 조정 진입·첫 3D 진입 뒤 자동 1회 — 콘솔이 있는 환경용 보조입니다. */
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

  /* ── C. 실루엣 측정을 <b>패널을 열 때</b>로 미룬다 (2026-09-27 · 폰 실측) ───
     저사양 폰(코어 8 · RAM 4GB · 저사양판정) 진단정보 순위표:
       applyStyleSpec          7434ms /     1회
       adjustStrandGeom        5957ms / 87451회
       computeAdjustedHair3DS  5179ms /    17회
       measureSectionTipY      1607ms /   146회
     applyStyleSpec 7.4초 중 길이 역산은 <b>1.6초뿐</b>입니다. 나머지 5.8초는
     끝에서 부르는 reportSilhouette입니다 — ANGLES 네 뷰를 돌며 뷰마다
     measureSilhouette → <b>computeAdjustedHair3DStrands를 통째로</b> 다시 돌립니다.
     스펙이 섹션 길이를 막 바꾼 직후라 ADJ_CACHE가 전부 빗나가고, 네 번 모두
     20,000가닥대를 새로 계산합니다. 그게 adjustStrandGeom 87,451회의 큰 몫입니다.

     그런데 이 측정의 <b>소비처는 specPanelLines 하나</b>입니다 — 진단정보 패널의
     "실루엣 W/H · 요철 · 비침덩어리" 줄. 화면에 그리는 데에는 한 글자도 안 씁니다.
     27번이 RENDER_MATCH를 끈 것과 같은 종류입니다: <b>진단이 진단 대상을
     느리게 만들고 있었습니다</b>.

     지우지는 않습니다 — 스타일을 레퍼런스와 맞출 때 필요한 자입니다. 대신
     <b>패널을 열 때 그 자리에서</b> 잽니다. 그러면 첫 진입에서는 0초이고,
     숫자가 필요한 사람은 진단정보를 눌러 그대로 봅니다(같은 모델·같은 자).
     ⚠ 패널을 열면 그때 5초쯤 걸립니다. 그게 맞는 거래입니다 — 첫 진입은
       손님이 기다리는 시간이고, 진단정보는 만드는 사람이 여는 것입니다.
     끄기: GYEOL_PERF.lazySilhouette = false (예전처럼 적용 즉시 잽니다) */
  P.lazySilhouette = true;
  (function deferSilhouette() {
    var rep = G.reportSilhouette;
    if (typeof rep !== 'function') return;
    var pending = null;            // 아직 안 잰 스펙 id
    G.reportSilhouette = function (id) {
      if (!P.lazySilhouette) return rep.apply(this, arguments);
      pending = (id == null) ? '' : id;
      return null;                 // applyStyleSpec은 null을 이미 다루고 있다
    };
    var panel = G.specPanelLines;
    if (typeof panel !== 'function') return;
    G.specPanelLines = function () {
      if (P.lazySilhouette && pending !== null) {
        var id = pending; pending = null;
        try {
          var t0 = now();
          var v = rep(id);
          if (state._lastSpec) state._lastSpec.rep.silhouette = v;
          (P.t.reportSilhouette || (P.t.reportSilhouette = { ms: 0, n: 0 })).ms += now() - t0;
          P.t.reportSilhouette.n++;
        } catch (e) { console.warn('[실루엣] 지연 측정 실패:', e); }
      }
      return panel.apply(this, arguments);
    };
  })();

  console.log('[성능] 28-perf-probe 적용 — 스펙 풀이 탐침 9회→약 2.6회(하네스 75,600표본, 참값 대비 최대 1칸).' +
    '\n    어디가 느린지는 화면 왼쪽 <b>진단정보</b>를 누르면 맨 위 [성능·순위]에 나옵니다(폰에서 그대로 읽힙니다).' +
    '\n    실루엣 측정은 진단정보를 열 때로 미뤘습니다(GYEOL_PERF.lazySilhouette=false로 원복).' +
    '\n    콘솔이 있으면 GYEOL_PERF.report() · 되돌리기 GYEOL_PERF.solver=false');
})();
