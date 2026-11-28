// ============================================================================
// (2026-11-28) 구글·카카오 로그인 — 앱이 시스템 브라우저(사파리 창)로 여는 방식. SDK 없이 서버가 처리.
//   ① 앱: verifier(난수) 만들고 chal = sha256(verifier) → 브라우저로 /api/customer/oauth/{p}/start?chal=
//   ② 서버: 구글/카카오 로그인 화면으로 보냄(state 에 chal 서명해 넣음)
//   ③ 구글/카카오 → /api/customer/oauth/{p}/callback?code&state → 서버가 code 로 id_token 받아 확인
//   ④ 서버 → com.ylcompany.stylepeek://oauth?ticket=…  (5분짜리 서명 티켓, 토큰 아님)
//   ⑤ 앱: POST /api/customer/oauth/finish { ticket, verifier } → 로그인 토큰
//   다른 앱이 주소를 가로채도 verifier 가 없어서 못 씀.
// 필요한 값(Cloudflare):
//   GOOGLE_WEB_CLIENT_ID · GOOGLE_WEB_CLIENT_SECRET (Secret)  — 그리고 GOOGLE_CLIENT_IDS 에 같은 클라이언트 ID
//   KAKAO_REST_API_KEY · KAKAO_CLIENT_SECRET(Secret, 콘솔에서 켰을 때만) — 그리고 KAKAO_CLIENT_IDS 에 REST API 키
//   OAUTH_TICKET_SECRET (Secret, 아무 긴 난수) — 없으면 ADMIN_SESSION_SECRET 을 씀
//   APP_URL_SCHEME (선택, 기본 com.ylcompany.stylepeek)
// ============================================================================
import type { Provider } from "@/lib/oidc"

export type WebProvider = Exclude<Provider, "apple">
export const isWebProvider = (v: unknown): v is WebProvider => v === "google" || v === "kakao"

const CONF = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    id: () => process.env.GOOGLE_WEB_CLIENT_ID,
    secret: () => process.env.GOOGLE_WEB_CLIENT_SECRET,
  },
  kakao: {
    authorize: "https://kauth.kakao.com/oauth/authorize",
    token: "https://kauth.kakao.com/oauth/token",
    scope: "openid",
    id: () => process.env.KAKAO_REST_API_KEY,
    secret: () => process.env.KAKAO_CLIENT_SECRET,
  },
} as const

export const appScheme = () => process.env.APP_URL_SCHEME || "com.ylcompany.stylepeek"
export const webEnabled = (p: WebProvider) => !!CONF[p].id() && (p === "kakao" || !!CONF[p].secret())

const enc = new TextEncoder()
const b64u = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))

async function key() {
  const s = process.env.OAUTH_TICKET_SECRET || process.env.ADMIN_SESSION_SECRET
  if (!s) throw new Error("no secret")
  return crypto.subtle.importKey("raw", enc.encode("oauth:" + s), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])
}

/** 서명한 짧은 문자열 (payload.sig) */
export async function sign(obj: Record<string, unknown>, ttlSec: number): Promise<string> {
  const body = b64u(enc.encode(JSON.stringify({ ...obj, exp: Date.now() + ttlSec * 1000 })))
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(body))
  return body + "." + b64u(sig)
}
export async function unsign<T>(s: string): Promise<T | null> {
  const [body, sig] = (s || "").split(".")
  if (!body || !sig) return null
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), unb64u(sig), enc.encode(body))
    if (!ok) return null
    const o = JSON.parse(new TextDecoder().decode(unb64u(body)))
    return o && typeof o.exp === "number" && o.exp > Date.now() ? (o as T) : null
  } catch { return null }
}

export async function sha256b64u(s: string) {
  return b64u(await crypto.subtle.digest("SHA-256", enc.encode(s)))
}

export function authorizeUrl(p: WebProvider, redirectUri: string, state: string, lang: string) {
  const c = CONF[p]
  const u = new URL(c.authorize)
  u.searchParams.set("response_type", "code")
  u.searchParams.set("client_id", c.id()!)
  u.searchParams.set("redirect_uri", redirectUri)
  u.searchParams.set("scope", c.scope)
  u.searchParams.set("state", state)
  if (p === "google") { u.searchParams.set("prompt", "select_account"); u.searchParams.set("hl", lang) }
  return u.toString()
}

/** code → id_token */
export async function exchangeCode(p: WebProvider, code: string, redirectUri: string): Promise<string> {
  const c = CONF[p]
  const form = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: c.id()! })
  const sec = c.secret()
  if (sec) form.set("client_secret", sec)
  const r = await fetch(c.token, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body: form })
  const d = (await r.json().catch(() => ({}))) as { id_token?: string }
  if (!r.ok || !d.id_token) throw new Error("token exchange failed")
  return d.id_token
}
