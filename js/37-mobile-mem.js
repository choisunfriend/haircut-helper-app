/*
 * 37-mobile-mem.js — 폰 메모리 다이어트
 *
 * 조정 결과 캐시(ADJ_CACHE)는 가닥 전체(폰 기준 3만 가닥·77만 점)를 최대 3벌 들고 있다.
 * 조정 한 번 → 새 결과 + 예전 결과 2벌이 남은 채로 3D 객체까지 만들면 폰 크롬이 탭을 죽인다.
 * 폰에서는 1벌만 남긴다(화면 오갈 때 가끔 다시 계산 — 대신 안 꺼짐).
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
})();
