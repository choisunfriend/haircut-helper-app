/* ==========================================================================
 * native-lock.js (2026-11-28) — 앱 잠금: 저장된 사진이 있으면 앱을 열 때 폰에 설정된 잠금(Face ID·Touch ID·기기 암호)으로 확인
 *   사용자: "사진이 저장되어 있을경우 다른 사람이 손에 넣었을 때 잘못하면 다른데로 보낼 수도 있겠다" · "앱잠금해. 로그인없는대신.
 *           근데 방식은 핸드폰에 설정된 방식들 중에서?"
 *   · 저장된 사진(30 gyeol-saved-photos)이나 360 세트(05 gyeol-shot360)가 없으면 잠그지 않음(처음 쓰는 손님은 그냥 시작)
 *   · Face ID/Touch ID가 없거나 실패하면 기기 암호로(allowDeviceCredential)
 *   · 폰에 잠금 자체가 설정돼 있지 않으면 잠글 방법이 없으니 그냥 엶
 *   · 앱을 RELOCK_MS(10분) 넘게 백그라운드에 두었다가 돌아오면 다시 잠금
 *   · 잠금 화면 [잠금 해제] 아래 ☐ 다음부터 잠금 끄기 — 체크하고 풀면 꺼짐 · 꺼져 있으면 표지(#onboardOv.ob-cover) 맨 아래 ☐ 잠금 기능 켜기
 *   · 앱 밖(웹 브라우저)에서는 아무것도 안 함
 *   플러그인: @capgo/capacitor-native-biometric 7.x (SPM 지원 — 이 프로젝트는 CapApp-SPM)
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, C = W.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var P = C.Plugins || {}, BIO = P.NativeBiometric, APP = P.App;
  if (!BIO) return;
  var OFF_KEY = 'gyeol_lock_off', RELOCK_MS = 10 * 60 * 1000, hiddenAt = 0, busy = false, cover = null;
  var ko = (navigator.language || 'ko').toLowerCase().indexOf('ko') === 0;
  var T = function (k, e) { return ko ? k : e; };
  var isOff = function () { try { return localStorage.getItem(OFF_KEY) === '1'; } catch (e) { return false; } };
  var setOff = function (v) { try { if (v) localStorage.setItem(OFF_KEY, '1'); else localStorage.removeItem(OFF_KEY); } catch (e) {} };

  /* 화면 가림 — 확인 전에는 앱 화면이 비치지 않게(제일 먼저 그림) */
  function showCover(msg) {
    if (!cover) {
      cover = document.createElement('div');
      cover.id = 'gyeolLock';
      cover.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#1b1714;color:#e8d5bf;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:-apple-system,system-ui,sans-serif;text-align:center;padding:24px';
      cover.innerHTML = '<div style="font:600 26px Georgia,serif">Today\'s Stylepeek</div><div id="gyeolLockMsg" style="font-size:15px;opacity:.8"></div>'
        + '<button id="gyeolLockBtn" style="display:none;padding:12px 26px;border-radius:999px;border:1px solid #c98a4b;background:#c98a4b;color:#1b1714;font-size:16px;font-weight:600">' + T('잠금 해제', 'Unlock') + '</button>'
        + '<label style="display:flex;align-items:center;gap:8px;font-size:14px;opacity:.85"><input id="gyeolLockOff" type="checkbox" style="width:18px;height:18px">' + T('다음부터 잠금 끄기', 'Turn off lock from next time') + '</label>';
      (document.body || document.documentElement).appendChild(cover);
      cover.querySelector('#gyeolLockBtn').addEventListener('click', function () { unlock(); });
    }
    cover.style.display = 'flex';
    cover.querySelector('#gyeolLockMsg').textContent = msg || '';
  }
  function hideCover() { if (cover) cover.style.display = 'none'; }
  function showRetry(on) { if (cover) cover.querySelector('#gyeolLockBtn').style.display = on ? 'inline-block' : 'none'; }

  /* 저장된 사진이 있나 — 지우지도 바꾸지도 않고 열쇠만 셈 */
  function hasKey(db, store) {
    return new Promise(function (res) {
      try {
        var r = indexedDB.open(db);
        r.onupgradeneeded = function () { try { r.transaction.abort(); } catch (e) {} res(false); };
        r.onerror = function () { res(false); };
        r.onsuccess = function () {
          var d = r.result;
          try {
            if (!d.objectStoreNames.contains(store)) { d.close(); return res(false); }
            var c = d.transaction(store, 'readonly').objectStore(store).count();
            c.onsuccess = function () { d.close(); res(c.result > 0); };
            c.onerror = function () { d.close(); res(false); };
          } catch (e) { try { d.close(); } catch (e2) {} res(false); }
        };
      } catch (e) { res(false); }
    });
  }
  function hasSaved() {
    return Promise.all([hasKey('gyeol-saved-photos', 'shots'), hasKey('gyeol-shot360', 'sets')]).then(function (a) { return a[0] || a[1]; });
  }

  function unlock() {
    if (busy) return; busy = true; showRetry(false);
    showCover(T('폰 잠금으로 확인합니다', 'Confirm with your phone lock'));
    BIO.isAvailable({ useFallback: true }).then(function (b) {
      /* 폰에 Face ID·지문도 암호도 없으면 잠글 방법이 없음 → 그냥 엶 */
      if (!b || (!b.isAvailable && b.deviceIsSecure === false)) { busy = false; hideCover(); return; }
      return BIO.verifyIdentity({
        reason: T('저장된 사진을 보호하려고 확인합니다', 'Confirm it is you to protect your saved photos'),
        title: "Today's Stylepeek",
        subtitle: T('잠금 해제', 'Unlock'),
        negativeButtonText: T('취소', 'Cancel'),
        useFallback: true,                                 // Face ID 실패·미설정이면 기기 암호
        fallbackTitle: T('암호 입력', 'Use passcode'),
      }).then(function () {
        busy = false; hideCover();
        var cb = cover && cover.querySelector('#gyeolLockOff'); if (cb && cb.checked) { setOff(true); cb.checked = false; }   // 풀린 뒤에만 끔
      }, function () {
        busy = false; showCover(T('잠금을 풀어야 저장된 사진을 볼 수 있어요', 'Unlock to see your saved photos')); showRetry(true);
      });
    }).catch(function () { busy = false; hideCover(); });     // 플러그인 오류로 앱을 못 쓰게 만들지는 않음
  }

  function maybeLock() {
    if (isOff()) return;
    showCover('');
    hasSaved().then(function (yes) { if (yes) unlock(); else hideCover(); }, hideCover);
  }

  /* 표지(첫 화면) 맨 아래 — 잠금이 꺼져 있을 때만 ☐ 잠금 기능 켜기 */
  function coverOption() {
    var ov = document.querySelector('#onboardOv.ob-cover');
    if (!ov || ov.style.display === 'none') return;
    var el = ov.querySelector('#gyeolLockOn');
    if (!isOff()) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement('label'); el.id = 'gyeolLockOn';
    el.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;color:rgba(243,233,218,.8);padding:12px 0 4px';
    el.innerHTML = '<input type="checkbox" style="width:17px;height:17px">' + T('잠금 기능 켜기', 'Turn on app lock');
    el.querySelector('input').addEventListener('change', function (e) {
      if (!e.target.checked) return;
      setOff(false);
      el.innerHTML = T('다음에 앱을 열 때부터 폰 잠금으로 확인해요', 'The app will ask for your phone lock next time');
      setTimeout(function () { if (el.parentNode) el.remove(); }, 2500);
    });
    ov.appendChild(el);
  }
  try { new MutationObserver(coverOption).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] }); } catch (e) {}

  if (document.body) maybeLock(); else document.addEventListener('DOMContentLoaded', maybeLock);
  if (APP && APP.addListener) {
    APP.addListener('appStateChange', function (s) {
      if (!s.isActive) { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > RELOCK_MS && !busy) maybeLock();
      hiddenAt = 0;
    });
  }
})();
