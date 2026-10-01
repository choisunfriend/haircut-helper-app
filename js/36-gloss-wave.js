/*
 * 36-gloss-wave.js
 *
 * 스타일 완성 단계의 "매끈·광택·찰랑" 마감 (Glossy finish)
 *
 * 문제: 촬영 결(원본 픽셀 경로)을 그대로 쓰다 보니 가닥마다 1~2cm 단위의 잔굴곡(부스스함)이
 *       남고, 그 위에 스타일 웨이브가 얹혀서 결과가 "곱슬·부스스"하게 보였다.
 *       또 결이 들쭉날쭉하니 결 하이라이트(Kajiya-Kay)도 점점이 흩어져 광택 띠가 안 생겼다.
 *
 * 해결(스타일 프로필에 gloss 가 있을 때만 동작):
 *   1) 가닥 모양 — 두 스케일 필터
 *        잔결  = 가닥 - G(σ_fine)          → 버림 (부스스·잔굴곡)
 *        웨이브 = G(σ_fine) - G(σ_flow)    → 살림 ×(1+waveBoost)  (굵은 S 웨이브)
 *        흐름  = G(σ_flow)                 → 그대로
 *      뿌리 rootCm 구간은 원래 모양 유지(가르마·볼륨 보존), 마디 길이는 원래 값으로 되돌려
 *      커트 기장이 변하지 않게 한다.
 *   2) 가닥 색 — 가닥을 따라 색을 고르게(colorSmooth) → 픽셀 노이즈 대신 매끈한 결 색.
 *   3) 광택 — 프로필의 shade(spec/specPow)를 올려 넓고 또렷한 하이라이트 띠.
 *
 * 2D 조정 화면과 3D 화면이 같은 소스(computeAdjustedHair3DStrands)를 쓰므로 둘 다 적용된다.
 * 끄기: GLOSS_WAVE.on=false  ·  세기: GLOSS_WAVE.set({ waveBoost:0.3, fineCm:0.8 })
 */
(function () {
  'use strict';
  var W = window;
  var TAG = '[광택·웨이브]';

  var G = W.GLOSS_WAVE = W.GLOSS_WAVE || {};
  G.on = true;
  // 기본값 — 프로필의 gloss 객체가 덮어씀
  G.defaults = {
    fineCm: 1.2,      // 이보다 짧은 파장의 굴곡(잔결)은 지움
    flowCm: 3.2,      // 이보다 긴 흐름은 그대로 둠
    waveBoost: 0.3,   // 그 사이(웨이브) 진폭을 이만큼 키움
    rootCm: 2.0,      // 뿌리에서 이 길이까지는 원래 모양 → 점점 매끈
    keepLen: false,   // true면 마디 길이 보존(잔결 길이가 남아 다시 꼬일 수 있음)
    colorSmooth: 0.7, // 가닥 색 고르게 (0=원본, 1=완전 평균)
    colorWin: 4       // 색 평균 창(점 개수, 한쪽)
  };
  G.set = function (o) { Object.assign(G.defaults, o || {}); bump(); };

  function activeCfg() {
    if (!G.on) return null;
    var sb = W.STYLE_BASE;
    var p = sb && sb.on !== false && sb.active;
    if (!p || !p.gloss) return null;
    return Object.assign({}, G.defaults, p.gloss === true ? {} : p.gloss);
  }

  function cmPerUnit() {
    try { var v = typeof modelCmPerUnit === 'function' ? modelCmPerUnit() : null; if (v > 0) return v; } catch (e) {}
    return 19.3;
  }

  // ── 가닥 모양 ───────────────────────────────────────────
  function arcLen(pts) {
    var s = new Float64Array(pts.length);
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      s[i] = s[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    }
    return s;
  }

  // 호길이 기반 가우시안 (점 간격이 고르지 않아도 됨). 끝은 반사 없이 정규화.
  function gauss(pts, s, sigma, out) {
    var n = pts.length, r = 3 * sigma, inv = 1 / (2 * sigma * sigma), lo = 0;
    for (var i = 0; i < n; i++) {
      while (s[i] - s[lo] > r) lo++;
      var sx = 0, sy = 0, sz = 0, sw = 0;
      for (var j = lo; j < n; j++) {
        var d = s[j] - s[i];
        if (d > r) break;
        var w = Math.exp(-d * d * inv);
        sx += pts[j].x * w; sy += pts[j].y * w; sz += pts[j].z * w; sw += w;
      }
      out[i * 3] = sx / sw; out[i * 3 + 1] = sy / sw; out[i * 3 + 2] = sz / sw;
    }
    return out;
  }

  function smoothPts(pts, cfg, cpu, st) {
    var n = pts.length;
    if (n < 5) return pts;
    var s = arcLen(pts), L = s[n - 1];
    if (!(L > 0)) return pts;
    var sf = (cfg.fineCm / cpu) / 2.5, sl = (cfg.flowCm / cpu) / 2.5; // 파장→σ 대략 변환
    var A = gauss(pts, s, sf, new Float64Array(n * 3));
    // 잔결이 심하면 호길이가 부풀어 σ가 실제보다 좁게 먹으므로, 매끈해진 경로로 한 번 더
    var P2 = new Array(n);
    for (var a2 = 0; a2 < n; a2++) P2[a2] = { x: A[a2 * 3], y: A[a2 * 3 + 1], z: A[a2 * 3 + 2] };
    A = gauss(P2, arcLen(P2), sf, new Float64Array(n * 3));
    var B = gauss(pts, s, sl, new Float64Array(n * 3));
    var k = 1 + cfg.waveBoost, root = cfg.rootCm / cpu;
    var out = new Array(n);
    var dev = 0;
    for (var i = 0; i < n; i++) {
      var t = root > 0 ? Math.min(1, s[i] / root) : 1;
      t = t * t * (3 - 2 * t); // smoothstep
      var x = B[i * 3] + (A[i * 3] - B[i * 3]) * k,
          y = B[i * 3 + 1] + (A[i * 3 + 1] - B[i * 3 + 1]) * k,
          z = B[i * 3 + 2] + (A[i * 3 + 2] - B[i * 3 + 2]) * k;
      var p = pts[i];
      var q = Object.assign({}, p);
      q.x = p.x + (x - p.x) * t; q.y = p.y + (y - p.y) * t; q.z = p.z + (z - p.z) * t;
      dev += Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
      out[i] = q;
    }
    out[0] = Object.assign({}, pts[0]);
    if (cfg.keepLen) {
      // 방향은 매끈한 것, 마디 길이는 원래 것 → 기장 그대로
      var px = out[0].x, py = out[0].y, pz = out[0].z;
      for (var m = 1; m < n; m++) {
        var dx = out[m].x - out[m - 1].x, dy = out[m].y - out[m - 1].y, dz = out[m].z - out[m - 1].z;
        var dl = Math.hypot(dx, dy, dz) || 1e-9, seg = s[m] - s[m - 1];
        px += dx / dl * seg; py += dy / dl * seg; pz += dz / dl * seg;
        out[m].__nx = px; out[m].__ny = py; out[m].__nz = pz;
      }
      for (var r2 = 1; r2 < n; r2++) {
        out[r2].x = out[r2].__nx; out[r2].y = out[r2].__ny; out[r2].z = out[r2].__nz;
        delete out[r2].__nx; delete out[r2].__ny; delete out[r2].__nz;
      }
    }
    if (st) { st.n++; st.dev += dev / n * cpu; }
    return out;
  }

  // ── 가닥 색 ─────────────────────────────────────────────
  function parseCol(c) {
    if (typeof c === 'number') return [(c >> 16) & 255, (c >> 8) & 255, c & 255, 'n'];
    if (typeof c !== 'string') return null;
    if (c[0] === '#' && c.length === 7) return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16), 'h'];
    var m = /^rgba?\(([^)]+)\)/.exec(c);
    if (m) { var a = m[1].split(',').map(parseFloat); return [a[0], a[1], a[2], 'h']; }
    return null;
  }
  function fmtCol(r, g, b, kind) {
    r = Math.max(0, Math.min(255, Math.round(r))); g = Math.max(0, Math.min(255, Math.round(g))); b = Math.max(0, Math.min(255, Math.round(b)));
    if (kind === 'n') return (r << 16) | (g << 8) | b;
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function smoothColors(cols, cfg) {
    if (!cols || !cols.length || cols.length < 3 || !(cfg.colorSmooth > 0)) return cols;
    var P = new Array(cols.length);
    for (var i = 0; i < cols.length; i++) { P[i] = parseCol(cols[i]); if (!P[i]) return cols; }
    var w = Math.max(1, cfg.colorWin | 0), a = cfg.colorSmooth, out = new Array(cols.length);
    for (var j = 0; j < cols.length; j++) {
      var r = 0, g = 0, b = 0, c = 0;
      for (var k = Math.max(0, j - w); k <= Math.min(cols.length - 1, j + w); k++) { r += P[k][0]; g += P[k][1]; b += P[k][2]; c++; }
      out[j] = fmtCol(P[j][0] + (r / c - P[j][0]) * a, P[j][1] + (g / c - P[j][1]) * a, P[j][2] + (b / c - P[j][2]) * a, P[j][3]);
    }
    return out;
  }

  // ── 훅 ──────────────────────────────────────────────────
  var memo = new WeakMap(), ver = 0;
  function bump() { ver++; try { if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump(); } catch (e) {} }
  G.bump = bump;

  function wrap(name, make) {
    var f = W[name];
    if (typeof f !== 'function') { console.warn(TAG + ' ' + name + ' 없음 — 건너뜀'); return false; }
    if (f.__glossWrapped) return true;
    var g = make(f); g.__glossWrapped = true;
    for (var k in f) if (Object.prototype.hasOwnProperty.call(f, k) && !(k in g)) g[k] = f[k];
    W[name] = g;
    return true;
  }

  wrap('computeAdjustedHair3DStrands', function (orig) {
    return function () {
      var res = orig.apply(this, arguments);
      var cfg = activeCfg();
      if (!cfg || !Array.isArray(res) || !res.length) return res;
      var key = JSON.stringify(cfg) + '|' + ver;
      var hit = memo.get(res);
      if (hit && hit.key === key) return hit.out;
      var t0 = performance.now(), cpu = cmPerUnit(), st = { n: 0, dev: 0 };
      var out = new Array(res.length);
      for (var i = 0; i < res.length; i++) {
        var sd = res[i];
        if (!sd || !sd.pts || sd.pts.length < 5) { out[i] = sd; continue; }
        var c = Object.assign({}, sd);
        try {
          c.pts = smoothPts(sd.pts, cfg, cpu, st);
          if (sd.colors) c.colors = smoothColors(sd.colors, cfg);
        } catch (e) { c = sd; }
        out[i] = c;
      }
      memo.set(res, { key: key, out: out });
      if (!G._logged || G._logged !== key) {
        G._logged = key;
        console.log(TAG + ' 가닥 ' + st.n + '개 매끈하게 — 잔결(<' + cfg.fineCm + 'cm) 제거 · 웨이브(' + cfg.fineCm + '~' + cfg.flowCm +
          'cm) ×' + (1 + cfg.waveBoost).toFixed(2) + ' · 평균 이동 ' + (st.dev / Math.max(1, st.n)).toFixed(2) + 'cm · ' +
          Math.round(performance.now() - t0) + 'ms · 끄기 GLOSS_WAVE.on=false');
      }
      return out;
    };
  });

  // 촬영 사진에서 다시 굽는 색(재투영)도 가닥을 따라 고르게
  wrap('bakeStrandColors3D', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      var cfg = activeCfg();
      if (!cfg || !Array.isArray(r)) return r;
      try { return smoothColors(r, cfg); } catch (e) { return r; }
    };
  });

  // 다른 롱 웨이브 스타일에도 같은 마감
  try {
    var pr = W.STYLE_BASE && W.STYLE_BASE.profiles;
    if (pr && pr.long_blowout_waves && !pr.long_blowout_waves.gloss) {
      pr.long_blowout_waves.gloss = { waveBoost: 0.25 };
      pr.long_blowout_waves.shade = { ao: 0.5, lumCap: 1.35, spec: 0.42, specPow: 36 };
    }
  } catch (e) {}

  console.log(TAG + ' 설치 — gloss 있는 스타일에서 잔결 제거·웨이브 살림·색 고르게 · 끄기 GLOSS_WAVE.on=false');
})();
