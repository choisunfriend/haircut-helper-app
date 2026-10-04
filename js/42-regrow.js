/* ==========================================================================
 * 42-regrow.js — 원본 결 → 3D: 뿌리부터 다시 기르기 (4장 버전 · v1)
 *
 * 로드 위치: index.html 맨 끝(41-original-asis.js 다음).
 *
 * 왜 (2026-10-03 실험):
 *   지금 방식은 사진에서 결을 따라 그은 긴 선 하나를 머리카락 한 올로 보고, 선의 위쪽 끝을 뿌리로 삼아
 *   머리 겉면에 걸쳐 놓습니다. 그래서
 *     · 뿌리가 크라운에 몰립니다(폼파두르: crown 68% · front 1% · temple 0% — 두피 면적은 crown 28%).
 *     · 짧은 옆머리를 정수리에서 난 9cm 가닥이 덮습니다(버섯 갓 모양).
 *     · 4면의 결을 하나로 합친 방향장을 따르게 하면 오히려 꺾입니다(꺾임 25° → 37°).
 *   긴 머리에서도 가닥이 얼굴을 가로지르고 지그재그였습니다.
 *
 * 무엇을:
 *   ① 뿌리 — 마네킹과 같은 방식으로 두피 전체에 심습니다(실측 뿌리밀도 × 셀 면적).
 *   ② 방향 — 4면을 미리 합치지 않습니다. 가닥이 한 걸음 나갈 때마다 지금 자리를 각 사진에 되비춰
 *      그 픽셀의 결 방향을 직접 읽고, 그 자리를 정면으로 보는 사진일수록 크게 칩니다.
 *      (그 사진 각도에서 보면 2D 원본 결과 같은 방향으로 흐르게 됩니다.)
 *   ③ 두께 — 두피에서 바깥으로 얼마나 떠 있는가는 사진 윤곽선으로 잽니다: 두피 셀마다 법선을 따라
 *      나가며 "이 점이 모든 사진에서 머리 영역 안인가"를 물어 처음 벗어나는 높이를 두께로 씁니다.
 *      어느 사진도 판정 못 하는 자리(정옆·뒤 일부)는 이웃 셀 값으로 메웁니다(추정).
 *   ④ 길이 — 사진의 머리 영역을 벗어나면 멈춥니다. 상한은 섹션별 원본 가닥 길이.
 *   ⑤ 방향의 앞뒤 — 2D 결은 선이라 앞뒤가 없습니다. 기본은 아래(중력) 쪽, 수평이면 뒤쪽·가르마 바깥쪽.
 *      그쪽으로 머리가 없으면(앞 헤어라인 아래 = 이마) 반대로 기릅니다 → 세운 앞머리.
 *   ⑥ 두피를 벗어나면(목덜미 아래·얼굴 쪽) 자유 낙하 구간 — 결을 따르되 중력을 섞고 두상 안으로 못 들어가게.
 *
 * 화면: 조정 화면 [다시 기르기] 버튼. 켜면 마네킹은 꺼지고 [원본 3D 그대로]가 켜집니다
 *       (조정 엔진의 기본 컬·커트가 섞이지 않은 결과를 먼저 보기 위해서).
 *       진단 줄 [다시 기르기]에 뿌리 분포·길이·꺾임·추정 비율·멈춘 이유가 찍힙니다.
 *
 * 한계(v1): 측면 사진이 28~51°라 정옆·뒤의 두께는 추정이 섞입니다. 속머리(겉에서 안 보이는 층)는 겉 결을 따릅니다.
 *
 * v2 (2026-10-03b · 폼파두르 첫 실측: 뿌리 crown 68% → 30%로 정상화, 머리가 두상에 붙음. 남은 것 —
 *      꺾임 26.8°(가짜 두상에서는 3.8°) · 그루터기 4,227개가 페이드 자리에 주황 점선으로 보임 · 길이 상한에 걸린 가닥 34%)
 *   · 관성 — 매 걸음 사진 결을 그대로 따르지 않고 직전 방향과 섞습니다(사진 결의 픽셀 잡음이 가닥을 떨게 했음).
 *   · 다 기른 뒤 가닥을 한 번 고르게 폅니다(양 끝 고정).
 *   · 두께를 칸 단위로 뚝뚝 읽지 않고 이웃 칸과 보간합니다(칸 경계에서 높이가 계단처럼 튀던 것).
 *   · 사진에 머리가 없다고 나오는 자리의 뿌리는 억지로 그루터기를 세우지 않고 안 심습니다(페이드는 두피색 그대로).
 *   · 길이 상한 — 짧은 머리는 섹션별 원본 길이 중앙값 × 1.25, 어깨 아래로 내려오는 긴 머리는 넉넉히(p95 × 1.3).
 *
 * v3 (2026-10-03c) 스타일 숫자로 재기 — 다시 기른 머리에서 스타일 스펙(등록 스타일과 같은 형식)을 잽니다.
 *   [스타일 숫자 재기] 버튼 → 숫자를 보여 주고 → [이 숫자로 스타일 등록]. 등록된 스타일은 다른 손님에게
 *   기존 경로(applyStyleSpec — 그 손님 마네킹에서 같은 cm·끝 높이가 되도록 역산)로 걸립니다.
 *   무엇을 어떻게 재는가:
 *     · 긴 머리 — 섹션별 "끝 높이"(tipAt: 정수리에서 두상 높이의 몇 배 아래에서 끝나는가). 가닥이 사진의 머리 끝까지
 *       자랐으므로 그대로 믿습니다.
 *     · 짧은 머리 — 섹션별 길이 cm. 두피에 누운 가닥은 사진만으로 길이를 알 수 없어서(1cm 머리가 겹겹이 누운 것과
 *       10cm 머리가 누운 것이 겉에서 같아 보임) 그 자리의 두께로 어림합니다: 길이 ≈ 두께 × liftK(2.2).
 *       ⚠ 어림값입니다 — 등록 전에 숫자를 보고, 다른 손님에게 건 뒤 슬라이더로 고치는 것을 전제로 합니다.
 *     · 페이드 — 옆·뒤 아래쪽에서 "사진에 머리가 없어 안 심은 뿌리"가 차지하는 높이. 가드·테이퍼는 기본값.
 *     · 뿌리 볼륨 — 윗머리(크라운+프론트) 뿌리 자리의 두께(cm)에서. 35 + 10×cm (1.5cm = 50 중립, 3.5cm = 70).
 *     · 넘김 — 윗머리 가닥이 뒤로 흐르는 정도(+ 뒤로 · − 앞으로).
 *     · 가르마 — 위치·세기를 재서 보여 주기만 합니다(스펙에는 아직 안 넣음 — 좌우 부호를 실제 사진으로 확인한 뒤 넣을 것).
 *     · 컬 — 아직 안 잽니다(0으로 저장).
 *
 * 끄기: 버튼 또는 REGROW.on=false 후 REGROW.refresh()
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[다시 기르기]';
  var G = W.REGROW = Object.assign({
    on: false, button: true,
    step: 0.022,        // 한 걸음(모델 단위 ≈ 0.4cm)
    maxSteps: 44,
    minFacing: 0.22,    // 이 사진이 그 자리를 이만큼은 정면으로 봐야 결을 읽음
    minCoh: 0.08,       // 결 또렷함 하한
    layerLo: 0.2, layerHi: 1.0,   // 가닥이 두께의 몇 %까지 뜨는가(가닥마다 무작위)
    tMax: 0.45,         // 두께 재기 상한(모델 단위 ≈ 9cm)
    tStep: 0.012,
    outlineCos: 0.3,    // 두께는 그 자리를 거의 옆에서(법선·카메라축 각 73° 이상) 보는 사진으로만 잼
    tFloor: 0.012,      // 두께 바닥(≈ 0.25cm)
    lenPct: 0.5, lenMul: 1.25,    // 짧은 머리 길이 상한 = 섹션별 원본 가닥 길이 중앙값 × 1.25
    longPct: 0.95, longMul: 1.3,  // 긴 머리(어깨 아래로 내려오는 가닥이 longShare 넘게 있음)는 넉넉히
    longShare: 0.1,
    inertia: 0.55,      // 직전 방향을 섞는 비율(0 = 사진 결 그대로)
    smooth: 2,          // 다 기른 뒤 고르게 펴는 횟수
    liftK: 2.2,         // 짧은 머리 길이 어림 = 뿌리 자리 두께 × 이 값
    minLenCm: 0.8,
    tapPx: 4,           // 머리 영역 판정 여유(800px 기준)
    gravity: 0.25,      // 두피 밖 구간에서 중력을 섞는 비율
    sliceMs: 30,
    seed: 20261003
  }, W.REGROW || {});
  var S = G.stats = null;

  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function q(a, f) { if (!a.length) return NaN; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(b.length * f))]; }
  function n1(v) { return isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1) : '?'; }

  /* ────────────────────────────────────────────────────────────────────────
   * 만들기
   * ────────────────────────────────────────────────────────────────────── */
  function makeBuilder(photo) {
    var probe = (photo.occ && photo.occ.probe) || (state.hairOcc3D && state.hairOcc3D.probe) || null;
    if (!probe || !probe.cams || !probe.cams.length) return { err: '점유 프로브 없음(HAIR_OCC3D가 꺼져 있거나 사진 정보가 없음)' };
    var roots = photo.roots, grid = photo.grid;
    if (!roots || !roots.ok || !grid) return { err: '뿌리밀도/격자 없음' };
    var Es = getScalpEllipsoid(), Eh = getHeadEllipsoid(), CY = photo.CY, yTop = photo.yTop;
    if (!Es || !(Es.a > 0) || !(Es.b > 0) || !(Es.c > 0)) return { err: '두피 타원체 없음' };
    var NT = roots.NT, NP = roots.NP, NC = NT * NP;
    var OFF = (typeof EST_OFFSCALP !== 'undefined') ? EST_OFFSCALP : 3;
    var bald = (typeof MANNEQUIN !== 'undefined' && MANNEQUIN.baldDen) || 0.08;
    var a2 = Es.a * Es.a, b2 = Es.b * Es.b, c2 = Es.c * Es.c;
    var yBody = CY - 0.7 * Es.b;

    // 사진별 카메라
    var cams = [];
    probe.cams.forEach(function (c) {
      var mi = state.hairMasks && state.hairMasks[c.angle];
      if (!mi || !c.smp || !(c.iw > 0) || !(c.ih > 0)) return;
      var mw = mi.maskW || mi.w, mh = mi.maskH || mi.h;
      cams.push({ angle: c.angle, R: c.R, cx: c.cx, s: c.s, sy: c.sy, crownY: c.crownY, smp: c.smp, iw: c.iw, ih: c.ih,
        ori: mi.orientation || null, mw: mw, kx: mw / mi.w, ky: mh / mi.h, tap: Math.max(2, G.tapPx * c.iw / 800) });
    });
    if (!cams.length) return { err: '쓸 수 있는 사진 없음' };

    // 난수(결정적)
    var seed = G.seed >>> 0;
    function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; var t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

    function onSurf(p) {     // 중심에서 본 방향 그대로 두피 타원체 면으로
      var x = p.x, y = p.y - CY, z = p.z, k = 1 / Math.sqrt(Math.max(1e-12, x * x / a2 + y * y / b2 + z * z / c2));
      return { x: x * k, y: CY + y * k, z: z * k };
    }
    function normalAt(p) {
      var x = p.x / a2, y = (p.y - CY) / b2, z = p.z / c2, l = Math.hypot(x, y, z) || 1;
      return { x: x / l, y: y / l, z: z / l };
    }
    function cellOf(p) {     // 두피 격자 칸(행=극각, 열=방위)
      var cy = Math.max(-1, Math.min(1, (p.y - CY) / Es.b)), ph = Math.acos(cy), th = Math.atan2(p.x / Es.a, p.z / Es.c);
      var r = Math.max(0, Math.min(NP - 1, Math.floor(ph / Math.PI * NP)));
      var c = Math.floor((th + Math.PI) / (2 * Math.PI) * NT); c = ((c % NT) + NT) % NT;
      return r * NT + c;
    }
    function offScalp(i) { return !!(roots.est && roots.est[i] === OFF); }

    var pj = { ix: 0, iy: 0, z: 0 };
    function proj(cam, p) {
      var R = cam.R, x = p.x, y = p.y - CY, z = p.z;
      pj.ix = (R[0] * x + R[1] * y + R[2] * z) / cam.s + cam.cx;
      pj.iy = cam.crownY + (yTop - ((R[3] * x + R[4] * y + R[5] * z) + CY)) / cam.sy;
      pj.z = R[6] * x + R[7] * y + R[8] * z;
      return pj;
    }
    function hairAt(cam, ix, iy) {
      var t = cam.tap, s = cam.smp;
      return s.at(ix, iy) > 0 || s.at(ix - t, iy) > 0 || s.at(ix + t, iy) > 0 || s.at(ix, iy - t) > 0 || s.at(ix, iy + t) > 0;
    }
    function behindSkull(cam, p) {   // p에서 카메라 쪽으로 가는 길이 두개골에 막히는가
      var R = cam.R, dx = R[6], dy = R[7], dz = R[8], x = p.x, y = p.y - CY, z = p.z;
      var A = dx * dx / a2 + dy * dy / b2 + dz * dz / c2, B = 2 * (x * dx / a2 + y * dy / b2 + z * dz / c2), C = x * x / a2 + y * y / b2 + z * z / c2 - 0.96;
      var D = B * B - 4 * A * C;
      if (D <= 0) return false;
      return (-B + Math.sqrt(D)) / (2 * A) > 1e-4;
    }
    /* 이 점이 사진들에서 머리 영역인가. 1 = 머리 · 0 = 아님 · -1 = 어느 사진도 판정 못 함 */
    function vote(p) {
      var yes = 0, no = 0, i, cam, o;
      for (i = 0; i < cams.length; i++) {
        cam = cams[i]; o = proj(cam, p);
        if (o.ix < 0 || o.iy < 0 || o.ix >= cam.iw || o.iy >= cam.ih) continue;
        if (o.z < 0) {                               // 카메라 반대편
          if (p.y < yBody) continue;                 // 목·어깨에 가려졌을 수 있음(몸은 모델에 없음)
          if (behindSkull(cam, p)) continue;         // 두개골에 가림
        }
        if (hairAt(cam, o.ix, o.iy)) yes++; else no++;
      }
      return yes + no === 0 ? -1 : (yes >= no ? 1 : 0);
    }

    /* 두께 재기 전용 — 그 자리를 "옆에서"(윤곽선으로) 보는 사진만 묻는다.
       정면으로 보는 사진은 깊이를 못 재서 항상 "머리"라고 답하고, 비스듬히 보는 사진은 늦게 알아챈다
       (법선과 카메라 축이 이루는 각이 90°에서 벗어난 만큼 두께를 크게 잰다). 1 머리 · 0 아님 · -1 물어볼 사진 없음 */
    function voteOutline(p, n) {
      var yes = 0, i, cam, o, R, ncz;
      for (i = 0; i < cams.length; i++) {
        cam = cams[i]; R = cam.R;
        ncz = R[6] * n.x + R[7] * n.y + R[8] * n.z;
        if (Math.abs(ncz) > G.outlineCos) continue;
        o = proj(cam, p);
        if (o.ix < 0 || o.iy < 0 || o.ix >= cam.iw || o.iy >= cam.ih) continue;
        if (o.z < 0) { if (p.y < yBody) continue; if (behindSkull(cam, p)) continue; }
        if (hairAt(cam, o.ix, o.iy)) yes++; else return 0;
      }
      return yes ? 1 : -1;
    }

    /* 그 자리의 결 방향을 사진들에서 직접 읽어 3D 접선 방향으로. ref가 있으면 그쪽 부호로 맞춤 */
    function flow(p, n, ref) {
      var ax = 0, ay = 0, az = 0, wsum = 0, i, cam, o, R, ncx, ncy, ncz, sm, pol, dX, dY, dZ, mx, my, mz, l, w, dot;
      for (i = 0; i < cams.length; i++) {
        cam = cams[i]; if (!cam.ori) continue;
        R = cam.R;
        ncz = R[6] * n.x + R[7] * n.y + R[8] * n.z;
        if (ncz < G.minFacing) continue;
        o = proj(cam, p);
        if (o.ix < 0 || o.iy < 0 || o.ix >= cam.iw || o.iy >= cam.ih) continue;
        if (!(cam.smp.at(o.ix, o.iy) > 0)) continue;
        sm = sampleOrientation(cam.ori, o.ix * cam.kx, cam.mw, o.iy * cam.ky);
        if (!sm || !(sm.coherence >= G.minCoh)) continue;
        ncx = R[0] * n.x + R[1] * n.y + R[2] * n.z; ncy = R[3] * n.x + R[4] * n.y + R[5] * n.z;
        dX = Math.cos(sm.angle) * cam.s; dY = -Math.sin(sm.angle) * cam.sy;
        dZ = -(dX * ncx + dY * ncy) / ncz;
        l = Math.hypot(dX, dY); if (Math.abs(dZ) > 3 * l) dZ = (dZ < 0 ? -3 : 3) * l;      // 스치는 각에서 깊이가 터지는 것 막음
        mx = R[0] * dX + R[3] * dY + R[6] * dZ; my = R[1] * dX + R[4] * dY + R[7] * dZ; mz = R[2] * dX + R[5] * dY + R[8] * dZ;
        l = Math.hypot(mx, my, mz); if (!(l > 1e-12)) continue;
        mx /= l; my /= l; mz /= l;
        if (ref) dot = mx * ref.x + my * ref.y + mz * ref.z;
        else if (wsum > 0) dot = mx * ax + my * ay + mz * az;
        else { pol = 0; try { pol = flowPolarityFor(sm.angle, sm); } catch (e) {} dot = pol < 0 ? -1 : 1; }
        if (dot < 0) { mx = -mx; my = -my; mz = -mz; }
        w = ncz * ncz * sm.coherence;
        ax += w * mx; ay += w * my; az += w * mz; wsum += w;
      }
      l = Math.hypot(ax, ay, az);
      return l > 1e-9 ? { x: ax / l, y: ay / l, z: az / l } : null;
    }
    function mixDir(prev, d) {       // 관성
      var a = G.inertia, x = prev.x * a + d.x * (1 - a), y = prev.y * a + d.y * (1 - a), z = prev.z * a + d.z * (1 - a), l = Math.hypot(x, y, z);
      return l > 1e-6 ? { x: x / l, y: y / l, z: z / l } : d;
    }
    function smoothPts(pts) {        // 양 끝 고정, 가운데만 이웃 평균 쪽으로
      var n = pts.length, it, i, out;
      if (n < 4 || !(G.smooth > 0)) return pts;
      for (it = 0; it < G.smooth; it++) {
        out = new Array(n); out[0] = pts[0]; out[n - 1] = pts[n - 1];
        for (i = 1; i < n - 1; i++) out[i] = { x: pts[i].x * 0.5 + (pts[i - 1].x + pts[i + 1].x) * 0.25, y: pts[i].y * 0.5 + (pts[i - 1].y + pts[i + 1].y) * 0.25, z: pts[i].z * 0.5 + (pts[i - 1].z + pts[i + 1].z) * 0.25 };
        pts = out;
      }
      for (i = 1; i < n; i++) { try { pts[i] = ellipsoidPushOut(pts[i], Es.a, Es.b, Es.c, CY); } catch (e) {} }
      return pts;
    }
    function tangent(d, n) {
      var k = d.x * n.x + d.y * n.y + d.z * n.z, x = d.x - k * n.x, y = d.y - k * n.y, z = d.z - k * n.z, l = Math.hypot(x, y, z);
      return l > 1e-6 ? { x: x / l, y: y / l, z: z / l } : null;
    }

    /* ③ 두께 지도 */
    var T = new Float32Array(NC), known = new Uint8Array(NC), tStat = { measured: 0, filled: 0, zero: 0 };
    function buildThickness() {
      var r, c, i, ph, th, sp, n, h, miss, last, v, got;
      for (r = 0; r < NP; r++) for (c = 0; c < NT; c++) {
        i = r * NT + c;
        if (offScalp(i)) { T[i] = 0; known[i] = 2; continue; }
        ph = (r + 0.5) / NP * Math.PI; th = (c + 0.5) / NT * 2 * Math.PI - Math.PI;
        sp = { x: Es.a * Math.sin(ph) * Math.sin(th), y: CY + Es.b * Math.cos(ph), z: Es.c * Math.sin(ph) * Math.cos(th) };
        n = normalAt(sp); miss = 0; last = 0; got = false;
        for (h = G.tStep; h <= G.tMax; h += G.tStep) {
          v = voteOutline({ x: sp.x + n.x * h, y: sp.y + n.y * h, z: sp.z + n.z * h }, n);
          if (v === 0) { if (++miss >= 2) { got = true; break; } }
          else { if (v === 1) last = h; miss = 0; }
        }
        if (got) { T[i] = last; known[i] = 1; tStat.measured++; if (last <= 0) tStat.zero++; }
        else known[i] = 0;                                   // 끝까지 안 벗어남 = 이 방향은 사진이 두께를 못 잼
      }
      // 못 잰 칸은 잰 이웃으로 메움
      var it, any, tmp = new Float32Array(NC), k2 = new Uint8Array(NC), dr, dc, rr, cc, j, sum, cnt;
      for (it = 0; it < 64; it++) {
        any = false; tmp.set(T); k2.set(known);
        for (r = 0; r < NP; r++) for (c = 0; c < NT; c++) {
          i = r * NT + c; if (known[i] !== 0) continue;
          sum = 0; cnt = 0;
          for (dr = -1; dr <= 1; dr++) for (dc = -1; dc <= 1; dc++) {
            rr = r + dr; if (rr < 0 || rr >= NP) continue; cc = ((c + dc) % NT + NT) % NT; j = rr * NT + cc;
            if (known[j] === 1) { sum += T[j]; cnt++; }
          }
          if (cnt) { tmp[i] = sum / cnt; k2[i] = 1; tStat.filled++; any = true; }
        }
        T.set(tmp); known.set(k2);
        if (!any) break;
      }
      var fb = Math.max(G.tFloor, (Eh.a - Es.a + Eh.c - Es.c) / 2);
      for (i = 0; i < NC; i++) if (known[i] === 0) { T[i] = fb; known[i] = 1; tStat.filled++; }
      // 한 번 고르게(두피 안 칸끼리만)
      tmp.set(T);
      for (r = 0; r < NP; r++) for (c = 0; c < NT; c++) {
        i = r * NT + c; if (known[i] !== 1) continue;
        sum = 0; cnt = 0;
        for (dr = -1; dr <= 1; dr++) for (dc = -1; dc <= 1; dc++) {
          rr = r + dr; if (rr < 0 || rr >= NP) continue; cc = ((c + dc) % NT + NT) % NT; j = rr * NT + cc;
          if (known[j] === 1) { var wgt = (dr === 0 && dc === 0) ? 4 : (dr === 0 || dc === 0) ? 2 : 1; sum += T[j] * wgt; cnt += wgt; }
        }
        tmp[i] = cnt ? sum / cnt : T[i];
      }
      for (i = 0; i < NC; i++) if (known[i] === 1) T[i] = Math.max(G.tFloor, Math.min(G.tMax, tmp[i]));
    }
    function thickAt(p) {            // 이웃 칸과 보간(두피 안 칸끼리만)
      var cy = Math.max(-1, Math.min(1, (p.y - CY) / Es.b)), fr = Math.acos(cy) / Math.PI * NP - 0.5, fc = (Math.atan2(p.x / Es.a, p.z / Es.c) + Math.PI) / (2 * Math.PI) * NT - 0.5;
      var r0 = Math.floor(fr), c0 = Math.floor(fc), tr = fr - r0, tc = fc - c0, sum = 0, wsum = 0, dr, dc, rr, cc, j, w;
      for (dr = 0; dr <= 1; dr++) for (dc = 0; dc <= 1; dc++) {
        rr = Math.max(0, Math.min(NP - 1, r0 + dr)); cc = ((c0 + dc) % NT + NT) % NT; j = rr * NT + cc;
        if (known[j] !== 1) continue;
        w = (dr ? tr : 1 - tr) * (dc ? tc : 1 - tc);
        sum += w * T[j]; wsum += w;
      }
      return wsum > 1e-6 ? sum / wsum : G.tFloor;
    }

    var info;
    /* 길이 상한·색 팔레트 — 원본 사진 가닥에서 */
    var lenBy = {}, colBy = {}, allLen = [];
    photo.strands.forEach(function (s) {
      var k = s.sec || 'crown', p = s.pts, L = 0, j;
      for (j = 1; j < p.length; j++) L += Math.hypot(p[j].x - p[j - 1].x, p[j].y - p[j - 1].y, p[j].z - p[j - 1].z);
      (lenBy[k] || (lenBy[k] = [])).push(L); allLen.push(L);
      if (s.color) { var cl = colBy[k] || (colBy[k] = []); if (cl.length < 400) cl.push(s.color); }
    });
    info = { isLong: false, skipY: {}, plantY: {} };
    var lowTips = 0;
    photo.strands.forEach(function (s) { if (s.pts[s.pts.length - 1].y < yBody) lowTips++; });
    var isLong = lowTips / Math.max(1, photo.strands.length) > G.longShare;
    var cPct = isLong ? G.longPct : G.lenPct, cMul = isLong ? G.longMul : G.lenMul;
    info.isLong = isLong;
    var capAll = q(allLen, cPct) * cMul, cap = {};
    Object.keys(lenBy).forEach(function (k) { cap[k] = q(lenBy[k], cPct) * cMul; });
    function capFor(sec) { return cap[sec] > 0 ? cap[sec] : (capAll > 0 ? capAll : 0.5); }

    /* 뿌리 예산(마네킹과 같은 식: 밀도 × 셀 면적) */
    var yStep = (grid.yTopH - grid.yBot) / (grid.NY - 1);
    function bucketOfY(y) { return Math.min(grid.NY - 1, Math.max(0, Math.round((grid.yTopH - y) / yStep))); }
    var areas = null;
    try { areas = headSurfaceCellAreas(grid.hullW, grid.hullD, bucketOfY, CY, roots.b, NT, NP); } catch (e) { areas = null; }
    var wgt = new Float64Array(NC), wTot = 0, i;
    for (i = 0; i < NC; i++) {
      if (offScalp(i)) continue;
      var den = roots.den[i]; if (!(den > bald)) continue;
      wgt[i] = den * (areas ? areas[i] : 1); wTot += wgt[i];
    }
    if (!(wTot > 0)) return { err: '뿌리밀도가 전부 0' };
    var total = photo.strands.length;

    var st = { n: 0, stub: 0, skipped: 0, steps: 0, est: 0, stopMask: 0, stopCap: 0, stopMax: 0, free: 0, flipped: 0,
      len: [], kink: [], sec: {} };
    var down = { x: 0, y: -1, z: 0 };

    function room(F, n, dt, sgn) {       // 그 방향으로 몇 걸음까지 머리가 있나(짧게 내다봄)
      var k, f = F, nn = n, cnt = 0, d = { x: dt.x * sgn, y: dt.y * sgn, z: dt.z * sgn }, t2;
      for (k = 0; k < 4; k++) {
        f = onSurf({ x: f.x + d.x * G.step, y: f.y + d.y * G.step, z: f.z + d.z * G.step });
        nn = normalAt(f);
        if (vote({ x: f.x + nn.x * G.tFloor, y: f.y + nn.y * G.tFloor, z: f.z + nn.z * G.tFloor }) === 0) break;
        cnt++;
        t2 = tangent(d, nn); if (t2) d = t2;
      }
      return cnt;
    }

    function grow(cellIdx) {
      var r = cellIdx / NT | 0, c = cellIdx % NT;
      var ph = (r + rnd()) / NP * Math.PI, th = (c + rnd()) / NT * 2 * Math.PI - Math.PI;
      var F = { x: Es.a * Math.sin(ph) * Math.sin(th), y: CY + Es.b * Math.cos(ph), z: Es.c * Math.sin(ph) * Math.cos(th) };
      var n = normalAt(F), u = G.layerLo + (G.layerHi - G.layerLo) * rnd();
      var sec = null; try { sec = resolveSection3D(F, CY, Es.b); } catch (e) {} sec = sec || 'crown';
      var Lcap = capFor(sec), ramp = Math.max(0.03, Math.min(0.12, 0.25 * Lcap));
      var stp = Math.max(G.step, Lcap / G.maxSteps);      // 긴 가닥은 걸음을 넓혀 걸음 수 상한에 안 걸리게
      var tRoot = thickAt(F), rootY = F.y;
      var pts = [{ x: F.x, y: F.y, z: F.z }], P = F, s = 0, prev = null, miss = 0, k, d, dt, fl, estSteps = 0, steps = 0, free = false, stop = 'max';

      // 첫 방향과 앞뒤
      fl = flow(F, n, null);
      d = fl || down; if (!fl) estSteps++;
      dt = tangent(d, n) || tangent({ x: 0.3, y: -1, z: 0.2 }, n) || { x: 1, y: 0, z: 0 };
      var sgn;
      if (Math.abs(dt.y) > 0.3) sgn = dt.y < 0 ? 1 : -1;                    // 아래쪽
      else if (Math.abs(dt.z) > 0.3) sgn = dt.z < 0 ? 1 : -1;               // 수평이면 뒤쪽
      else sgn = dt.x * F.x >= 0 ? 1 : -1;                                  // 옆으로 흐르면 가운데 선 바깥쪽
      var r1 = room(F, n, dt, sgn);
      if (r1 < 2) { var r2 = room(F, n, dt, -sgn); if (r2 > r1) { sgn = -sgn; st.flipped++; } }
      prev = { x: dt.x * sgn, y: dt.y * sgn, z: dt.z * sgn };

      for (k = 0; k < G.maxSteps; k++) {
        steps++;
        if (!free) {
          // 두피 위 구간: 발은 두피면을 따라, 몸은 그 위 두께만큼 떠서
          fl = flow(P, n, prev); if (!fl) estSteps++;
          if (fl) fl = mixDir(prev, fl);
          dt = tangent(fl || prev, n) || prev;
          var F2 = onSurf({ x: F.x + dt.x * stp, y: F.y + dt.y * stp, z: F.z + dt.z * stp });
          if (offScalp(cellOf(F2))) { free = true; st.free++; prev = dt; k--; steps--; continue; }
          var n2 = normalAt(F2), s2 = s + stp, h2 = u * thickAt(F2) * Math.min(1, s2 / ramp);
          var P2 = { x: F2.x + n2.x * h2, y: F2.y + n2.y * h2, z: F2.z + n2.z * h2 };
          if (vote(P2) === 0) { if (++miss >= 2) { stop = 'mask'; break; } } else miss = 0;
          pts.push(P2); F = F2; n = n2; P = P2; s = s2; prev = tangent(dt, n2) || dt;
        } else {
          // 두피 밖 구간: 결 + 중력, 두상 안으로는 못 들어감
          var rr = Math.hypot(P.x, P.z), nc = rr > 1e-6 ? { x: P.x / rr, y: 0, z: P.z / rr } : n;
          fl = flow(P, nc, prev); if (!fl) estSteps++;
          d = fl ? mixDir(prev, fl) : prev;
          var gx = d.x * (1 - G.gravity), gy = d.y * (1 - G.gravity) - G.gravity, gz = d.z * (1 - G.gravity), gl = Math.hypot(gx, gy, gz) || 1;
          d = { x: gx / gl, y: gy / gl, z: gz / gl };
          var Q = { x: P.x + d.x * stp, y: P.y + d.y * stp, z: P.z + d.z * stp };
          try { Q = ellipsoidPushOut(Q, Es.a * 1.02, Es.b * 1.02, Es.c * 1.02, CY); } catch (e) {}
          if (vote(Q) === 0) { if (++miss >= 2) { stop = 'mask'; break; } } else miss = 0;
          pts.push({ x: Q.x, y: Q.y, z: Q.z }); P = Q; s += stp; prev = d;
        }
        if (s >= Lcap) { stop = 'cap'; break; }
      }
      if (miss > 0) pts.length = Math.max(1, pts.length - miss);        // 머리 영역 밖으로 나간 꼬리는 버림
      if (pts.length < 3) { st.skipped++; (info.skipY[sec] || (info.skipY[sec] = [])).push(rootY); return null; }   // 사진에 머리가 없는 자리 — 그루터기를 억지로 세우지 않음
      (info.plantY[sec] || (info.plantY[sec] = [])).push(rootY);
      pts = smoothPts(pts);
      var Larc = 0, ii; for (ii = 1; ii < pts.length; ii++) Larc += Math.hypot(pts[ii].x - pts[ii - 1].x, pts[ii].y - pts[ii - 1].y, pts[ii].z - pts[ii - 1].z);
      var qi = Math.min(pts.length - 1, 6), ex = pts[qi].x - pts[0].x, ey = pts[qi].y - pts[0].y, ez = pts[qi].z - pts[0].z, el = Math.hypot(ex, ey, ez) || 1;
      var rg = { t: tRoot, free: free, L: Larc, tipY: pts[pts.length - 1].y, dx: ex / el, dy: ey / el, dz: ez / el };
      if (stop === 'mask') st.stopMask++; else if (stop === 'cap') st.stopCap++; else st.stopMax++;
      st.steps += steps; st.est += estSteps;

      var view = 'front'; try { view = viewOfRoot(F0(pts)); } catch (e) {}
      var pal = colBy[sec] || colBy.crown, color = pal && pal.length ? pal[rnd() * pal.length | 0] : '#2B2320', colors = null;
      try { colors = bakeStrandColors3D(pts, photo, view, color, null); } catch (e) { colors = null; }
      return { pts: pts, sec: sec, color: color, colors: colors, srcAngle: view, rootFacing: 0, regrown: true, rg: rg };
    }
    function F0(p) { return p[0]; }

    var out = [], cell = 0, carry = 0, t0 = now(), thickDone = false;
    return {
      total: total,
      /* budget ms만큼 일하고 진행률(0~1) 반환. 1이면 끝 */
      step: function (budget) {
        var t = now();
        if (!thickDone) { buildThickness(); thickDone = true; return 0.08; }
        while (cell < NC && now() - t < budget) {
          if (wgt[cell]) {
            carry += wgt[cell] / wTot * total;
            var nRoots = Math.floor(carry); carry -= nRoots;
            for (var j = 0; j < nRoots; j++) {
              var sdd = grow(cell);
              if (!sdd) continue;
              out.push(sdd); st.n++;
              st.sec[sdd.sec] = (st.sec[sdd.sec] || 0) + 1;
              if (st.n % 7 === 0) {            // 통계 표본
                var p = sdd.pts, L = 0, turn = 0, turns = 0, i2;
                for (i2 = 1; i2 < p.length; i2++) {
                  var ax = p[i2].x - p[i2 - 1].x, ay = p[i2].y - p[i2 - 1].y, az = p[i2].z - p[i2 - 1].z, al = Math.hypot(ax, ay, az);
                  L += al;
                  if (i2 > 1 && al > 1e-9) {
                    var bx = p[i2 - 1].x - p[i2 - 2].x, by = p[i2 - 1].y - p[i2 - 2].y, bz = p[i2 - 1].z - p[i2 - 2].z, bl = Math.hypot(bx, by, bz);
                    if (bl > 1e-9) { turn += Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by + az * bz) / (al * bl)))); turns++; }
                  }
                }
                st.len.push(L); if (turns) st.kink.push(turn / turns * 180 / Math.PI);
              }
            }
          }
          cell++;
        }
        return cell >= NC ? 1 : 0.08 + 0.92 * cell / NC;
      },
      finish: function () {
        var cm = 1; try { cm = modelCmPerUnit() || 1; } catch (e) {}
        var tv = []; for (var k = 0; k < NC; k++) if (known[k] === 1 && !offScalp(k)) tv.push(T[k] * cm);
        S = G.stats = {
          ms: Math.round(now() - t0), n: st.n, stub: st.stub, skipped: st.skipped, sec: st.sec,
          lenMed: q(st.len, 0.5) * cm, lenP90: q(st.len, 0.9) * cm, kinkMed: q(st.kink, 0.5), kinkP90: q(st.kink, 0.9),
          estPct: st.steps ? st.est / st.steps * 100 : 0, stopMask: st.stopMask, stopCap: st.stopCap, stopMax: st.stopMax, free: st.free, flipped: st.flipped,
          isLong: isLong, capTxt: Object.keys(cap).map(function (k) { return k + ' ' + n1(cap[k] * cm); }).join(' · '),
          tMed: q(tv, 0.5), tP90: q(tv, 0.9), tMeasured: tStat.measured, tFilled: tStat.filled, tZero: tStat.zero, cells: NC,
          cams: cams.map(function (c) { return c.angle; }).join(',')
        };
        return { strands: out, viewCal: photo.viewCal, yTop: photo.yTop, CY: photo.CY, field: photo.field || null, occ: photo.occ || null,
          grid: photo.grid, roots: photo.roots, mannequin: false, regrown: true, rgInfo: info };
      }
    };
  }

  /* ────────────────────────────────────────────────────────────────────────
   * 모델 바꿔 끼우기 — state.hair3Dneutral이 (마네킹이 꺼져 있고 REGROW.on이면) 다시 기른 모델을 돌려줌
   * ────────────────────────────────────────────────────────────────────── */
  var desc = null;
  try { desc = Object.getOwnPropertyDescriptor(state, 'hair3Dneutral'); } catch (e) {}
  if (!desc || !desc.get || !desc.set || !desc.configurable) { console.warn(TAG + ' state.hair3Dneutral 접근자를 못 찾아 건너뜀'); return; }
  G.model = null; G.src = null; G.building = false; G.lastErr = null;
  Object.defineProperty(state, 'hair3Dneutral', {
    enumerable: true, configurable: true,
    get: function () {
      var m = desc.get.call(this);
      if (!G.on || !m || m.mannequin) return m;
      if (G.model && G.src === this._hair3Dneutral) return G.model;
      if (!G.building && this._hair3Dneutral && G.failedFor !== this._hair3Dneutral) setTimeout(G.build, 0);   // 사진 모델이 새로 만들어졌으면 다시 기름
      return m;
    },
    set: function (v) { G.model = null; G.src = null; desc.set.call(this, v); }
  });

  function redraw() {
    try { if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump(); } catch (e) {}
    try { if (typeof combRefresh === 'function') combRefresh(); else if (typeof renderAdjustFrame === 'function') renderAdjustFrame(); } catch (e) { console.warn(TAG + ' 다시 그리기 실패', e); }
  }
  G.build = function (cb) {
    if (typeof cb !== 'function') cb = null;
    if (G.building) return;
    var photo = state._hair3Dneutral;
    if (!photo || !photo.strands || !photo.strands.length) { if (cb) cb(false); return; }
    try { if (typeof NEUTRAL_BUILD !== 'undefined' && NEUTRAL_BUILD.running) { setTimeout(function () { G.build(cb); }, 300); return; } } catch (e) {}
    var B;
    try { B = makeBuilder(photo); } catch (e) { B = { err: String(e && e.message || e) }; console.warn(TAG + ' 준비 실패', e); }
    if (!B || B.err) {
      G.lastErr = B ? B.err : '?'; G.failedFor = photo;
      console.warn(TAG + ' 못 기름 — ' + G.lastErr + ' · 사진 가닥을 그대로 씁니다');
      if (cb) cb(false); return;
    }
    G.building = true; G.lastErr = null;
    var sub = null;
    try { if (typeof showAI === 'function') { showAI('뿌리부터 다시 기르는 중…', '0%'); sub = document.getElementById('aiOverlaySub'); } } catch (e) {}
    (function tick() {
      var f;
      try { f = B.step(G.sliceMs); }
      catch (e) {
        G.building = false; G.lastErr = String(e && e.message || e); G.failedFor = photo;
        console.warn(TAG + ' 기르다 실패 — 사진 가닥을 그대로 씁니다', e);
        try { if (typeof hideAI === 'function') hideAI(); } catch (x) {}
        if (cb) cb(false); return;
      }
      if (sub) sub.textContent = Math.round(f * 100) + '%';
      if (f < 1) return setTimeout(tick, 0);
      var model = null;
      try { model = B.finish(); } catch (e) { G.lastErr = String(e && e.message || e); }
      G.building = false;
      try { if (typeof hideAI === 'function') hideAI(); } catch (x) {}
      if (!model || !model.strands.length || state._hair3Dneutral !== photo) {
        if (!model || !model.strands.length) { G.failedFor = photo; G.lastErr = G.lastErr || '가닥 0개'; console.warn(TAG + ' 결과가 비었습니다 — 사진 가닥을 그대로 씁니다'); }
        if (cb) cb(false); return;
      }
      G.model = model; G.src = photo;
      console.log(G.lines().join('\n'));
      redraw();
      if (cb) cb(true);
    })();
  };

  var btn = null;
  function syncBtn() { if (btn) { btn.textContent = '다시 기르기 ' + (G.on ? 'ON' : 'OFF'); btn.classList.toggle('on', !!G.on); } }
  G.refresh = function () { syncBtn(); if (G.on && !G.model) G.build(); else redraw(); };
  G.toggle = function () {
    G.on = !G.on;
    if (G.on) {
      try { if (typeof MANNEQUIN !== 'undefined' && MANNEQUIN.on && typeof toggleMannequin === 'function') toggleMannequin(); } catch (e) {}
      try { if (W.ORIG_ASIS && !W.ORIG_ASIS.on) W.ORIG_ASIS.toggle(); } catch (e) {}      // 조정 엔진이 안 섞인 결과부터 봄
      G.failedFor = null;
    }
    console.log(TAG + ' ' + (G.on ? '켬' : '끔 — 사진 가닥으로 되돌림'));
    G.refresh();
  };
  var origMq = W.mannequinReset;
  if (typeof origMq === 'function') W.mannequinReset = function () {
    if (G.on) { G.on = false; syncBtn(); }
    return origMq.apply(this, arguments);
  };
  if (G.button) try {
    var bar = document.querySelector('#screen-adjust .mode-bar');
    if (bar) {
      btn = document.createElement('button');
      btn.id = 'regrowBtn'; btn.type = 'button';
      btn.title = '두피 전체에 뿌리를 심고, 사진의 결을 직접 읽어 가닥을 다시 기릅니다';
      btn.addEventListener('click', function () { G.toggle(); });
      bar.appendChild(btn); syncBtn();
    }
  } catch (e) {}

  /* ────────────────────────────────────────────────────────────────────────
   * 스타일 숫자로 재기
   * ────────────────────────────────────────────────────────────────────── */
  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }
  G.measure = function () {
    var m = G.model;
    if (!m || G.src !== state._hair3Dneutral || !m.strands || !m.strands.length) return null;
    var info = m.rgInfo || { isLong: false, skipY: {}, plantY: {} };
    var cm = 1; try { cm = modelCmPerUnit() || 1; } catch (e) {}
    var hr = null; try { hr = headHeightRef(); } catch (e) {}
    var order = (typeof SECTION_ORDER !== 'undefined') ? SECTION_ORDER : ['crown', 'front', 'temple', 'side', 'occipital', 'nape'];
    var by = {}; m.strands.forEach(function (s) { if (s.rg) (by[s.sec] || (by[s.sec] = [])).push(s); });
    var lenCm = {}, tipAt = {}, raw = {}, lenFallback = {}, cut = {};
    order.forEach(function (sec) {
      lenFallback[sec] = 50;
      try {
        var d = JSON.parse(JSON.stringify(SECTIONS[sec].defaults)); delete d.length; delete d.curl; delete d.wave; delete d.color; cut[sec] = d;
      } catch (e) { cut[sec] = {}; }
      var a = by[sec] || []; if (a.length < 8) return;
      raw[sec] = { n: a.length, growCm: q(a.map(function (s) { return s.rg.L * cm; }), 0.5), thickCm: q(a.map(function (s) { return s.rg.t * cm; }), 0.5),
        freePct: Math.round(a.filter(function (s) { return s.rg.free; }).length / a.length * 100) };
      if (info.isLong) {
        if (hr) tipAt[sec] = +((hr.yTop - q(a.map(function (s) { return s.rg.tipY; }), 0.5)) / hr.H).toFixed(3);
      } else {
        lenCm[sec] = +q(a.map(function (s) {
          return (s.rg.free ? s.rg.L : Math.min(s.rg.L, Math.max(G.minLenCm / cm, G.liftK * s.rg.t))) * cm;
        }), 0.5).toFixed(1);
      }
    });
    // 뿌리 볼륨 · 넘김 · 가르마 — 윗머리에서
    var top = (by.crown || []).concat(by.front || []);
    var tTop = top.length ? q(top.map(function (s) { return s.rg.t * cm; }), 0.5) : 1.5;
    var volume = Math.round(clampN(35 + 10 * tTop, 20, 95));
    var swSum = 0; top.forEach(function (s) { swSum += -s.rg.dz; });
    var sweep = top.length ? Math.round(clampN(100 * swSum / top.length, -100, 100)) : 0;
    var part = { x: 0, score: 0, lateral: 0 };
    try {
      var E = getScalpEllipsoid(), best = -1, bx = 0, k, x0, okW, totW, lat = 0;
      top.forEach(function (s) { lat += Math.abs(s.rg.dx); }); lat = top.length ? lat / top.length : 0;
      for (k = -6; k <= 6; k++) {
        x0 = k / 10 * E.a; okW = 0; totW = 0;
        top.forEach(function (s) {
          var w = Math.abs(s.rg.dx); totW += w;
          if ((s.pts[0].x - x0) * s.rg.dx > 0) okW += w;      // 가르마 바깥쪽으로 흐르는가
        });
        if (totW > 0 && okW / totW > best) { best = okW / totW; bx = k / 10; }
      }
      part = { x: bx, score: best, lateral: lat };
    } catch (e) {}
    // 페이드
    var low = ['side', 'nape', 'occipital', 'temple'], nSkip = 0, nPlant = 0, vs = [];
    low.forEach(function (sec) {
      var sk = info.skipY[sec] || [], pl = info.plantY[sec] || [], all = sk.concat(pl);
      nSkip += sk.length; nPlant += pl.length;
      if (!all.length) return;
      var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
      if (!(hi > lo)) return;
      sk.forEach(function (y) { vs.push((y - lo) / (hi - lo)); });
    });
    var bareShare = nSkip + nPlant ? nSkip / (nSkip + nPlant) : 0;
    var fade = { enabled: false, guard: 1, height: 35, blendWidth: 40, disc: 0, taper: 0 };
    if (!info.isLong && bareShare > 0.12 && vs.length > 20) {
      fade = { enabled: true, guard: 1, height: Math.round(clampN(100 * q(vs, 0.8) + 10, 10, 95)), blendWidth: 40, disc: 0, taper: 60 };
    }
    var styling = {}; try { styling = neutralStyling(); } catch (e) { styling = { sweep: 0, volume: 50, flow: 0, part: 0, partAmt: 0, finish: 50, sleek: 0 }; }
    styling.sweep = sweep; styling.volume = volume;
    var spec = { name: '', cut: cut, perm: { curl: 0, wave: 50 }, styling: styling, globalCurl: 0, fade: fade, lenFallback: lenFallback, version: 1, source: 'regrow' };
    if (info.isLong) spec.tipAt = tipAt; else spec.lenCm = lenCm;
    return { spec: spec, isLong: info.isLong, raw: raw, tTopCm: tTop, part: part, bareShare: bareShare, order: order };
  };
  G.measureLines = function (r) {
    r = r || G.measure();
    if (!r) return ['[스타일 숫자] 다시 기른 모델이 없습니다 — [다시 기르기]를 먼저 켜세요'];
    var sp = r.spec, L = ['[스타일 숫자] 다시 기른 머리에서 잰 값 (' + (r.isLong ? '긴 머리 — 끝 높이로 저장' : '짧은 머리 — 길이 cm로 저장') + ')'];
    if (r.isLong) {
      L.push('  끝 높이(정수리에서 두상 높이의 몇 배 아래 · 1.00 ≈ 턱): ' + r.order.filter(function (k) { return sp.tipAt[k] != null; }).map(function (k) { return k + ' ' + sp.tipAt[k].toFixed(2); }).join(' · '));
    } else {
      L.push('  길이 cm(어림 — 두께×' + G.liftK + ' 또는 기른 길이 중 짧은 쪽): ' + r.order.filter(function (k) { return sp.lenCm[k] != null; }).map(function (k) { return k + ' ' + sp.lenCm[k]; }).join(' · '));
    }
    L.push('  참고 — 섹션별 [기른 길이 cm / 뿌리 자리 두께 cm / 두피 밖으로 늘어진 가닥 %]: ' + r.order.filter(function (k) { return r.raw[k]; }).map(function (k) {
      return k + ' ' + n1(r.raw[k].growCm) + '/' + n1(r.raw[k].thickCm) + '/' + r.raw[k].freePct + '%'; }).join(' · '));
    L.push('  페이드: ' + (sp.fade.enabled ? '켜짐 · 높이 ' + sp.fade.height + '% · 가드 ' + sp.fade.guard + ' · 테이퍼 ' + sp.fade.taper + '% (가드·테이퍼는 기본값)' : '꺼짐') +
      ' · 옆·뒤에서 사진에 머리가 없던 뿌리 ' + Math.round(r.bareShare * 100) + '%');
    L.push('  뿌리 볼륨 ' + sp.styling.volume + ' (윗머리 두께 ' + n1(r.tTopCm) + 'cm) · 넘김 ' + (sp.styling.sweep > 0 ? '+' : '') + sp.styling.sweep + ' (' + (sp.styling.sweep > 15 ? '뒤로' : sp.styling.sweep < -15 ? '앞으로' : '중립') + ')');
    L.push('  가르마(재기만 — 스펙에는 아직 안 넣음): 위치 ' + (r.part.x > 0 ? '+' : '') + r.part.x.toFixed(1) + ' (두상 반폭 대비, 모델 x축) · 양쪽으로 갈라지는 정도 ' + Math.round(r.part.score * 100) + '% · 옆으로 흐르는 세기 ' + r.part.lateral.toFixed(2));
    L.push('  컬: 아직 안 잽니다(0으로 저장)');
    return L;
  };
  G.register = function () {
    var r = G.measure();
    if (!r) { try { showToast('먼저 [다시 기르기]를 켜세요'); } catch (e) {} return null; }
    var name = null; try { name = prompt('이 스타일 이름을 입력하세요 (원본 머리에서 잰 숫자로 등록)', ''); } catch (e) {}
    if (!name || !name.trim()) return null;
    name = name.trim();
    var id = 'custom-' + Date.now(), sections = {}, sbv = {};
    r.order.forEach(function (sec) { try { sections[sec] = Object.assign({}, SECTIONS[sec].defaults, { curl: 0 }); } catch (e) {} });
    try { (typeof ANGLES !== 'undefined' ? ANGLES : []).forEach(function (a) { sbv[a] = Object.assign({}, r.spec.styling); }); } catch (e) {}
    r.spec.name = name;
    var color = '#2A1B12'; try { color = (state.hairMasks.front && state.hairMasks.front.avgColor) || color; } catch (e) {}
    var stl = { id: id, specId: id, spec: r.spec, name: name, tags: '원본에서 잼', isCustom: true, sections: sections, styling: Object.assign({}, r.spec.styling),
      stylingByView: sbv, globalCurl: 0, length: 50, curl: 0, volume: r.spec.styling.volume, colorHex: color };
    try {
      STYLES.push(stl);
      if (typeof saveCustomStylesToStorage === 'function') saveCustomStylesToStorage();
      if (typeof buildStyleGrid === 'function') buildStyleGrid();
      if (typeof showToast === 'function') showToast('"' + name + '" 스타일로 등록했어요');
      console.log(TAG + ' 스타일 등록 "' + name + '"\n' + G.measureLines(r).join('\n'));
    } catch (e) { console.warn(TAG + ' 스타일 등록 실패', e); return null; }
    return stl;
  };
  var mbox = null;
  G.showMeasure = function () {
    var r = G.measure(), text = G.measureLines(r).join('\n');
    console.log(text);
    try {
      var host = document.querySelector('#screen-adjust .adjust-preview'); if (!host) return;
      if (!mbox) {
        mbox = document.createElement('div');
        mbox.style.cssText = 'position:absolute;left:8px;right:8px;top:70px;bottom:56px;z-index:80;background:rgba(0,0,0,0.9);color:#0f0;font:11px/1.6 monospace;padding:8px;border-radius:6px;white-space:pre-wrap;overflow:auto;';
        host.appendChild(mbox);
      }
      mbox.textContent = '';
      var bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;';
      var mk = function (label, fn) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
        b.style.cssText = 'min-height:30px;padding:4px 12px;border-radius:8px;border:1px solid #0f0;background:#062a06;color:#0f0;font:600 12px monospace;';
        b.addEventListener('click', function (e) { e.stopPropagation(); fn(b); }); return b;
      };
      if (r) bar.appendChild(mk('이 숫자로 스타일 등록', function () { if (G.register()) mbox.style.display = 'none'; }));
      bar.appendChild(mk('복사', function (b) {
        try { navigator.clipboard.writeText(text).then(function () { b.textContent = '복사됨 ✓'; setTimeout(function () { b.textContent = '복사'; }, 1500); }, function () { b.textContent = '복사 실패'; }); } catch (e) { b.textContent = '복사 실패'; }
      }));
      bar.appendChild(mk('닫기', function () { mbox.style.display = 'none'; }));
      mbox.appendChild(bar); mbox.appendChild(document.createTextNode(text));
      mbox.style.display = 'block';
    } catch (e) {}
  };
  if (G.button) try {
    var bar3 = document.querySelector('#screen-adjust .mode-bar');
    if (bar3) {
      var mb = document.createElement('button');
      mb.id = 'regrowMeasureBtn'; mb.type = 'button'; mb.textContent = '스타일 숫자 재기';
      mb.title = '다시 기른 머리에서 길이·페이드·볼륨·넘김을 재서 스타일로 등록합니다';
      mb.addEventListener('click', function () { G.showMeasure(); });
      bar3.appendChild(mb);
    }
  } catch (e) {}

  G.lines = function () {
    var s = G.stats, L = ['[다시 기르기] ' + (G.on ? '켜짐' : '꺼짐') + (G.building ? ' · 만드는 중' : '') + (G.model && G.src === state._hair3Dneutral ? ' · 모델 있음' : ' · 모델 없음') + (G.lastErr ? ' · ⚠ ' + G.lastErr : '')];
    if (!s) return L;
    var tot = s.n || 1, secs = Object.keys(s.sec).map(function (k) { return k + ' ' + Math.round(s.sec[k] / tot * 100) + '%'; }).join(' · ');
    L.push('  가닥 ' + s.n + '개(사진에 머리가 없어 안 심은 뿌리 ' + s.skipped + ') · ' + s.ms + 'ms · 사진 ' + s.cams);
    L.push('  뿌리 분포 — ' + secs);
    L.push('  길이 ' + n1(s.lenMed) + '/' + n1(s.lenP90) + 'cm(중앙값/p90) · 꺾임 ' + n1(s.kinkMed) + '°/' + n1(s.kinkP90) + '° · 결을 사진에서 못 읽고 이어 간 걸음 ' + n1(s.estPct) + '%');
    L.push('  길이 상한(' + (s.isLong ? '긴 머리 — 넉넉히' : '짧은 머리 — 섹션 중앙값×' + G.lenMul) + ') cm: ' + s.capTxt);
    L.push('  멈춘 이유 — 머리 영역 밖 ' + s.stopMask + ' · 길이 상한 ' + s.stopCap + ' · 걸음 수 상한 ' + s.stopMax + ' · 두피 밖으로 나가 늘어뜨린 가닥 ' + s.free + ' · 반대로 기른 뿌리(아래쪽에 머리 없음) ' + s.flipped);
    L.push('  두께(두피→머리 겉면) 중앙값 ' + n1(s.tMed) + 'cm · p90 ' + n1(s.tP90) + 'cm · 윤곽선으로 잰 칸 ' + s.tMeasured + ' · 이웃으로 메운 칸(추정) ' + s.tFilled + ' · 두께 0으로 잰 칸 ' + s.tZero + ' / 전체 ' + s.cells);
    return L;
  };
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [];
    try { L = L.concat(G.lines()); } catch (e) {}
    return L;
  };

  console.log(TAG + ' 설치 — 조정 화면의 [다시 기르기] 버튼. 콘솔: REGROW.toggle() · REGROW.lines().join("\\n")');
})();
