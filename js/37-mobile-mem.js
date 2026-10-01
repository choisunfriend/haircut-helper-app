/*
 * 37-mobile-mem.js — 폰 메모리 다이어트
 *
 * 조정 결과 캐시(ADJ_CACHE)는 가닥 전체(폰 기준 3만 가닥·77만 점)를 최대 3벌 들고 있다.
 * 조정 한 번 → 새 결과 + 예전 결과 2벌이 남은 채로 3D 객체까지 만들면 폰 크롬이 탭을 죽인다.
 * 폰에서는 1벌만 남긴다(화면 오갈 때 가끔 다시 계산 — 대신 안 꺼짐).
 *
 * 3D 결과 화면을 떠나면 3D 장면을 반납한다(다시 들어오면 원래도 새로 만듦).
 *
 * 폰 판정: 저사양 판정(isLowMemDevice) 또는 터치 위주 기기(모바일 UA / pointer:coarse).
 * 끄기: MOBILE_MEM.on=false 후 새로고침 · 강제: MOBILE_MEM.force=true
 */
(function () {
  'use strict';
  var W = window, TAG = '[폰 메모리]';
  var M = W.MOBILE_MEM = W.MOBILE_MEM || { on: true, force: false, adjCacheMax: 1 };

  function isPhone() {
    if (M.force) return true;
    try { if (typeof isLowMemDevice === 'function' && isLowMemDevice()) return true; } catch (e) {}
    try { if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')) return true; } catch (e) {}
    try { if (W.matchMedia && W.matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 900) return true; } catch (e) {}
    return false;
  }

  if (!M.on || !isPhone()) { console.log(TAG + ' 데스크톱 — 그대로'); return; }

  try {
    if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE) {
      var before = ADJ_CACHE.max;
      ADJ_CACHE.max = M.adjCacheMax;
      console.log(TAG + ' 조정 캐시 ' + before + '벌 → ' + ADJ_CACHE.max + '벌 (끄기 MOBILE_MEM.on=false 후 새로고침)');
    } else {
      console.warn(TAG + ' ADJ_CACHE 없음 — 건너뜀');
    }
  } catch (e) { console.warn(TAG + ' 실패', e); }

  // ── 3D 결과 화면을 떠날 때 3D 장면(헤어·얼굴·의상)을 반납 ─────────────
  // setupModel3DScreen은 들어올 때마다 headGroup을 비우고 전부 새로 만든다.
  // 그래서 떠날 때 미리 비워도 다시 들어오면 똑같이 그려진다 — 차이는
  // 조정 화면에 있는 동안 3만 가닥짜리 3D 객체를 메모리에 안 들고 있다는 것뿐.
  // (조정 화면의 가닥·슬라이더 데이터는 건드리지 않는다)
  M.free3DOnLeave = M.free3DOnLeave !== false;
  var orig = W.activateScreen;
  if (typeof orig === 'function' && !orig.__mobileMem) {
    var wrapped = function (next) {
      var prev = typeof currentScreen !== 'undefined' ? currentScreen : null;
      var r = orig.apply(this, arguments);
      if (M.on && M.free3DOnLeave && prev === 'model3d' && next !== 'model3d') {
        try { free3DScene(prev + '→' + next); } catch (e) { console.warn(TAG + ' 3D 반납 실패', e); }
      }
      return r;
    };
    wrapped.__mobileMem = true;
    W.activateScreen = wrapped;
  }

  function free3DScene(why) {
    if (typeof model3D === 'undefined' || !model3D || !model3D.headGroup) return;
    // 진행 중인 3D 빌드가 있으면 중단시킴(세대 번호가 바뀌면 setupModel3DScreen이 스스로 멈춤)
    try { model3DGeneration++; } catch (e) {}
    var g = model3D.headGroup, n = 0, verts = 0;
    while (g.children.length) {
      var c = g.children[0];
      try {
        c.traverse(function (o) { if (o.geometry && o.geometry.attributes && o.geometry.attributes.position) verts += o.geometry.attributes.position.count; });
      } catch (e) {}
      try { if (typeof disposeObject3D === 'function') disposeObject3D(c); } catch (e) {}
      g.remove(c); n++;
    }
    try { model3D.renderer && model3D.renderer.renderLists && model3D.renderer.renderLists.dispose(); } catch (e) {}
    console.log(TAG + ' 3D 장면 반납 (' + why + ') · 객체 ' + n + '개 · 정점 약 ' + Math.round(verts / 1000) + '천 — 다시 들어가면 새로 그립니다 · 끄기 MOBILE_MEM.free3DOnLeave=false');
  }
  M.free3DScene = free3DScene;
})();
