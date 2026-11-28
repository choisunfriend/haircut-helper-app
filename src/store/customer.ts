"use client"

// ============================================================================
// (2026-11-28) 손님 로그인 상태 — 진짜 서버(/api/customer/*)에 연결 (템플릿의 가짜 계정 대신)
// ============================================================================
// 로그인은 앱(네이티브)이 합니다. 쇼핑몰은 iframe 이라 애플 로그인 창을 직접 못 띄우기 때문입니다.
//   쇼핑몰 → 앱  { type: "gyeol-auth-get" }            열릴 때 "로그인돼 있나?" 묻기
//   쇼핑몰 → 앱  { type: "gyeol-login", provider }     로그인 버튼 → 앱이 애플 로그인 → 서버 로그인
//   쇼핑몰 → 앱  { type: "gyeol-logout" }              로그아웃·탈퇴 뒤 앱이 토큰을 버리게
//   앱 → 쇼핑몰  { type: "gyeol-auth", token|null }     토큰 전달(키체인 대신 앱 저장소에 보관)
//   앱 → 쇼핑몰  { type: "gyeol-login-error", error }
// 토큰은 앱 안에서는 메모리에만 둡니다(iframe 저장소는 막히거나 나뉘어 믿을 수 없음).
// (2026-11-28) 앱 밖(휴대폰·PC 브라우저)에서는 구글·카카오를 팝업으로 로그인 — 서버 /api/customer/oauth/* (src/lib/oauth-web.ts)
//   팝업이 끝나면 { type: "gyeol-oauth", ticket } 를 이 창에 보냄 → 티켓 + verifier 로 토큰을 받음 · 토큰은 localStorage(되면)
// ============================================================================

import { create } from "zustand"
import { inNativeApp, parentAppOrigin, postToApp } from "@/lib/app-bridge"

const WEB_KEY = "gyeol_customer_token"
const webSave = (t: string | null) => { try { if (t) localStorage.setItem(WEB_KEY, t); else localStorage.removeItem(WEB_KEY) } catch {} }
const webLoad = () => { try { const t = localStorage.getItem(WEB_KEY); return t && /^gy_[0-9a-f]{64}$/.test(t) ? t : null } catch { return null } }
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
let webPending: { verifier: string; popup: Window | null; timer: number; rid: string } | null = null

/** 팝업 결과(티켓) → 토큰 */
function finishWeb(ticket: unknown, error: unknown) {
  const p = webPending; if (!p) return
  webPending = null; clearInterval(p.timer)
  try { p.popup?.close() } catch {}
  if (typeof ticket !== "string") { useCustomer.setState({ loggingIn: false, error: typeof error === "string" ? error : "failed" }); return }
  void useCustomer.getState().api<{ token?: string }>("/api/customer/oauth/finish", { method: "POST", body: JSON.stringify({ ticket, verifier: p.verifier, platform: "web" }) })
    .then((r) => {
      if (r.ok && typeof r.data.token === "string") return useCustomer.getState().setToken(r.data.token)
      useCustomer.setState({ loggingIn: false, error: r.data.error || "failed" })
    })
}

export interface Me {
  id: string
  kind: "anonymous" | "member"
  displayName: string | null
  email: string | null
  lang: string | null
  providers: string[]
  createdAt: string
}

interface CustomerState {
  token: string | null
  me: Me | null
  ready: boolean // 앱에게 물어보고 답을 받았거나, 앱 밖이라 기다릴 필요가 없음
  loggingIn: boolean
  error: string | null
  setToken: (token: string | null) => Promise<void>
  refresh: () => Promise<void>
  login: (provider: "apple" | "google" | "kakao") => void
  logout: () => Promise<void>
  deleteAccount: () => Promise<boolean>
  api: <T = unknown>(path: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; data: T & { success?: boolean; error?: string } }>
}

export const useCustomer = create<CustomerState>()((set, get) => ({
  token: null,
  me: null,
  ready: false,
  loggingIn: false,
  error: null,

  api: async (path, init = {}) => {
    const headers = new Headers(init.headers)
    const t = get().token
    if (t) headers.set("Authorization", `Bearer ${t}`)
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
    try {
      const r = await fetch(path, { ...init, headers, cache: "no-store" })
      const data = await r.json().catch(() => ({}))
      if (r.status === 401 && t) set({ token: null, me: null })
      return { ok: r.ok, status: r.status, data }
    } catch {
      return { ok: false, status: 0, data: { success: false, error: "network" } as never }
    }
  },

  setToken: async (token) => {
    set({ token, error: null })
    if (!inNativeApp()) webSave(token)
    if (token) await get().refresh()
    else set({ me: null })
    set({ ready: true, loggingIn: false })
  },

  refresh: async () => {
    if (!get().token) return set({ me: null })
    const r = await get().api<{ customer: Me }>("/api/customer/me")
    set({ me: r.ok ? r.data.customer : null })
  },

  login: (provider) => {
    set({ loggingIn: true, error: null })
    if (inNativeApp()) {
      if (!postToApp({ type: "gyeol-login", provider })) set({ loggingIn: false, error: "not-in-app" })
      return
    }
    if (provider === "apple") { set({ loggingIn: false, error: "apple-app-only" }); return }
    /* 웹: 팝업은 클릭과 같은 순간에 열어야 막히지 않음 → 먼저 빈 창을 열고 주소는 해시 계산 뒤에 */
    const popup = window.open("", "gyeol_oauth", "width=480,height=680")
    if (!popup) { set({ loggingIn: false, error: "popup-blocked" }); return }
    const a = new Uint8Array(32); crypto.getRandomValues(a)
    const verifier = b64u(a)
    const ra = new Uint8Array(32); crypto.getRandomValues(ra)
    const rid = b64u(ra)
    void crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)).then((h) => {
      const lang = (document.documentElement.lang || "ko").startsWith("ko") ? "ko" : "en"
      if (webPending) clearInterval(webPending.timer)
      /* 1.2초마다 서버에 결과를 물어봄(팝업이 이 창을 잃어도 됨) · 팝업을 그냥 닫았으면 몇 번 더 묻고 끝 · 10분 뒤 포기 */
      let closedTicks = 0, ticks = 0
      const timer = window.setInterval(() => {
        if (!webPending || webPending.rid !== rid) { clearInterval(timer); return }
        if (++ticks > 500) { finishWeb(null, "cancelled"); return }
        if (popup.closed && ++closedTicks > 4) { finishWeb(null, "cancelled"); return }
        void fetch(`/api/customer/oauth/poll?rid=${rid}`, { cache: "no-store" }).then((r) => r.json()).then((d) => {
          if (!webPending || webPending.rid !== rid || d.pending) return
          finishWeb(d.ticket, d.error)
        }).catch(() => {})
      }, 1200)
      webPending = { verifier, popup, timer, rid }
      popup.location.href = `/api/customer/oauth/${provider}/start?chal=${b64u(h)}&lang=${lang}&web=1&rid=${rid}`
    })
  },

  logout: async () => {
    if (get().token) await get().api("/api/customer/logout", { method: "POST" })
    postToApp({ type: "gyeol-logout" })
    if (!inNativeApp()) webSave(null)
    set({ token: null, me: null })
  },

  deleteAccount: async () => {
    const r = await get().api("/api/customer/me", { method: "DELETE", body: JSON.stringify({ confirm: "DELETE" }) })
    if (!r.ok) return false
    postToApp({ type: "gyeol-logout", deleted: true })
    if (!inNativeApp()) webSave(null)
    set({ token: null, me: null })
    return true
  },
}))

let wired = false
/** 레이아웃에서 한 번 — 앱이 보내는 토큰을 받고, 앱에게 지금 토큰을 물어봄 */
export function wireCustomerBridge(): () => void {
  if (typeof window === "undefined" || wired) return () => {}
  wired = true
  const onMessage = (e: MessageEvent) => {
    /* (2026-11-28) 웹 팝업 로그인 결과 — 같은 주소의 팝업만 */
    if (e.origin === window.location.origin && webPending && e.source === webPending.popup) {
      const d0 = e.data as { type?: string; ticket?: unknown; error?: unknown } | null
      if (!d0 || d0.type !== "gyeol-oauth") return
      finishWeb(d0.ticket, d0.error)   // 서버에 맡긴 같은 결과는 poll 에서 이미 지워지거나 그냥 남았다 10분 뒤 지워짐
      return
    }
    if (e.source !== window.parent || e.origin !== parentAppOrigin()) return
    const d = e.data as { type?: string; token?: unknown; error?: unknown } | null
    if (!d || typeof d !== "object") return
    if (d.type === "gyeol-auth") {
      const t = typeof d.token === "string" && /^gy_[0-9a-f]{64}$/.test(d.token) ? d.token : null
      void useCustomer.getState().setToken(t)
    } else if (d.type === "gyeol-login-error") {
      useCustomer.setState({ loggingIn: false, error: typeof d.error === "string" ? d.error.slice(0, 200) : "error" })
    }
  }
  window.addEventListener("message", onMessage)
  // 앱 밖: 지난번 웹 로그인 토큰
  if (!inNativeApp()) { const t0 = webLoad(); if (t0) void useCustomer.getState().setToken(t0) }
  // 앱 안이면 물어보고, 1.5초 안에 답이 없으면(예전 앱) 로그인 안 된 것으로
  const asked = postToApp({ type: "gyeol-auth-get" })
  setTimeout(() => { if (!useCustomer.getState().ready) useCustomer.setState({ ready: true }) }, asked ? 1500 : 0)
  return () => {
    window.removeEventListener("message", onMessage)
    wired = false
  }
}
