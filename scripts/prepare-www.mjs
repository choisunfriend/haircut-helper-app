// prepare-www.mjs — 배포 레포(haircut-helper-app)를 앱 안에 넣을 www/로 만든다.
//  1) 배포 레포 복사(.git·개발 파일 제외)
//  2) CDN 라이브러리·글꼴을 node_modules에서 www/vendor/로 복사하고 주소를 바꿈 → 인터넷 없이도 열림
//  3) MediaPipe·셀피 세그 모델을 내려받아 www/vendor/models/에 넣고 주소를 바꿈(빌드 서버에서 — 실패하면 원래 주소 유지)
//  4) goatcounter 등 분석 스크립트 제거
// 사용: node scripts/prepare-www.mjs <배포 레포 경로>   (기본 ../haircut-helper-app)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.resolve(process.argv[2] || path.join(ROOT, '..', 'haircut-helper-app'));
const WWW = path.join(ROOT, 'www');
const NM = path.join(ROOT, 'node_modules');
const log = (...a) => console.log('[prepare-www]', ...a);

if (!fs.existsSync(path.join(SRC, 'index.html'))) { console.error('배포 레포를 찾지 못함: ' + SRC); process.exit(1); }
fs.rmSync(WWW, { recursive: true, force: true });
fs.cpSync(SRC, WWW, { recursive: true, filter: (p) => !/[\\/](\.git|\.github|node_modules)([\\/]|$)/.test(p) && !/\.(md|mp4)$/i.test(p) });
log('복사', SRC, '→', WWW);

const V = path.join(WWW, 'vendor');
const cp = (from, to) => { fs.mkdirSync(path.dirname(path.join(V, to)), { recursive: true }); fs.copyFileSync(path.join(NM, from), path.join(V, to)); };

// ---- 라이브러리 ----
const LIBS = [
  ['three/build/three.min.js', 'three/three.min.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'],
  ['three/examples/js/loaders/MTLLoader.js', 'three/MTLLoader.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/MTLLoader.js'],
  ['three/examples/js/loaders/OBJLoader.js', 'three/OBJLoader.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js'],
  ['@tensorflow/tfjs-core/dist/tf-core.min.js', 'tf/tf-core.min.js', 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.17.0/dist/tf-core.min.js'],
  ['@tensorflow/tfjs-converter/dist/tf-converter.min.js', 'tf/tf-converter.min.js', 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter@4.17.0/dist/tf-converter.min.js'],
  ['@tensorflow/tfjs-backend-webgl/dist/tf-backend-webgl.min.js', 'tf/tf-backend-webgl.min.js', 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.17.0/dist/tf-backend-webgl.min.js'],
  ['@tensorflow-models/body-segmentation/dist/body-segmentation.min.js', 'tf/body-segmentation.min.js', 'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-segmentation@1.0.1/dist/body-segmentation.min.js'],
  ['@mediapipe/tasks-vision/vision_bundle.mjs', 'mediapipe/vision_bundle.mjs', null],
];
const REWRITE = [];   // [원래 문자열, 새 문자열]
for (const [from, to, url] of LIBS) { cp(from, to); if (url) REWRITE.push([url, 'vendor/' + to]); }
for (const f of fs.readdirSync(path.join(NM, '@mediapipe/tasks-vision/wasm'))) cp('@mediapipe/tasks-vision/wasm/' + f, 'mediapipe/wasm/' + f);
// tasks-vision: import('…tasks-vision@0.10.9') 와 wasm 경로(…@0.10.9/wasm). wasm 경로를 먼저 바꿈(더 긴 문자열)
REWRITE.unshift(['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm', 'vendor/mediapipe/wasm']);
REWRITE.push(["import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9')", "import('./vendor/mediapipe/vision_bundle.mjs')"]);

fs.copyFileSync(path.join(ROOT, 'scripts', 'native-save.js'), path.join(V, 'native-save.js'));
fs.copyFileSync(path.join(ROOT, 'scripts', 'native-auth.js'), path.join(V, 'native-auth.js'));
fs.copyFileSync(path.join(ROOT, 'scripts', 'native-lock.js'), path.join(V, 'native-lock.js'));   // (2026-11-28) 앱 잠금

// ---- 글꼴 ----
const FD = path.join(V, 'fonts'); fs.mkdirSync(FD, { recursive: true });
const fontFiles = [
  ['@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2', 'Fraunces', '400 600'],
  ['@fontsource/inter/files/inter-latin-400-normal.woff2', 'Inter', '400'],
  ['@fontsource/inter/files/inter-latin-500-normal.woff2', 'Inter', '500'],
  ['@fontsource/inter/files/inter-latin-600-normal.woff2', 'Inter', '600'],
  ['@fontsource/inter/files/inter-latin-700-normal.woff2', 'Inter', '700'],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2', 'JetBrains Mono', '400'],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2', 'JetBrains Mono', '500'],
];
let css = '';
for (const [f, fam, w] of fontFiles) {
  const b = path.basename(f); fs.copyFileSync(path.join(NM, f), path.join(FD, b));
  css += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(${b}) format('woff2');}\n`;
}
fs.writeFileSync(path.join(FD, 'fonts.css'), css);

// ---- 모델(빌드 서버에서 내려받음) ----
const MODELS = [
  ['https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', 'models/face_landmarker.task'],
  ['https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite', 'models/hair_segmenter.tflite'],
  ['https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', 'models/pose_landmarker_lite.task'],
];
const dl = (url, out) => { fs.mkdirSync(path.dirname(out), { recursive: true }); execSync(`curl -fsSL --retry 3 -o "${out}" "${url}"`, { stdio: 'inherit' }); };
for (const [url, to] of MODELS) {
  try { dl(url, path.join(V, to)); REWRITE.push([url, 'vendor/' + to]); log('모델', to); }
  catch (e) { log('⚠ 모델 내려받기 실패 — 원래 주소를 씀:', url); }
}
// 셀피 세그(TF.js) — 기본 주소가 tfhub라 modelUrl을 넣어 줌
let selfieOk = false;
try {
  const base = 'https://tfhub.dev/mediapipe/tfjs-model/selfie_segmentation/general/1';
  const mj = path.join(V, 'models/selfie/model.json');
  dl(base + '/model.json?tfjs-format=file', mj);
  const m = JSON.parse(fs.readFileSync(mj, 'utf8'));
  for (const g of m.weightsManifest || []) for (const p of g.paths) dl(base + '/' + p + '?tfjs-format=file', path.join(V, 'models/selfie', p));
  selfieOk = true; log('모델 models/selfie');
} catch (e) { log('⚠ 셀피 세그 모델 내려받기 실패 — tfhub 주소를 씀'); }

// ---- 주소 바꾸기 ----
const files = [path.join(WWW, 'index.html'), ...fs.readdirSync(path.join(WWW, 'js')).filter((f) => f.endsWith('.js')).map((f) => path.join(WWW, 'js', f))];
let n = 0;
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8'), o = s;
  for (const [a, b] of REWRITE) s = s.split(a).join(b);
  if (f.endsWith('index.html')) {
    s = s.replace(/<link[^>]+fonts\.googleapis\.com[^>]*>/g, '<link rel="stylesheet" href="vendor/fonts/fonts.css">');
    s = s.replace(/<link[^>]+fonts\.gstatic\.com[^>]*>/g, '');
    s = s.replace(/<script[^>]*goatcounter[^>]*>\s*<\/script>/g, '');
    // 심사 모드 끄기(결제·구매 링크·위치를 그대로 보여 줌)
    s = s.replace('<head>', '<head><script>window.APP_REVIEW={on:false};</script>');
    // 사진 저장 → iOS 공유 시트(내 사진 앱에 저장)
    s = s.replace('</body>', '<script src="vendor/native-save.js"></script><script src="vendor/native-auth.js"></script></body>');
    // 앱 잠금 — 앱 화면보다 먼저 가리도록 body 맨 앞
    s = s.replace(/<body([^>]*)>/, '<body$1><script src="vendor/native-lock.js"></script>');
  }
  if (selfieOk) s = s.split("{'runtime':'tfjs','modelType':'general'}").join("{'runtime':'tfjs','modelType':'general','modelUrl':'vendor/models/selfie/model.json'}");
  if (s !== o) { fs.writeFileSync(f, s); n++; }
}
log('주소 바꾼 파일', n);

// 남은 외부 주소 보고(앱 동작에 꼭 필요한 쇼핑몰·지도는 남는 게 정상)
const left = new Set();
for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)) left.add(m[0]);
log('남은 외부 주소:', [...left].sort().join(' '));
