// GET /api/customer/oauth/{google|kakao}/callback — 구글·카카오가 돌려보내는 곳 → 앱으로 티켓 전달
import { appScheme, exchangeCode, isWebProvider, sign, unsign } from "@/lib/oauth-web"
import { verifyIdToken } from "@/lib/oidc"
import { getProductsDb } from "@/lib/products-db"

/* (2026-11-28) 웹: 팝업 창이 쇼핑몰 창(opener)을 잃어도 되게 결과를 D1에 잠깐 맡김 → 쇼핑몰 창이 /oauth/poll 로 가져감 */
async function keep(rid: string | undefined, q: Record<string, string>) {
  if (!rid) return
  try {
    const db = await getProductsDb(); if (!db) return
    await db.prepare("DELETE FROM oauth_web WHERE created_at < datetime('now', '-10 minutes')").run()
    await db.prepare("INSERT OR REPLACE INTO oauth_web (rid, ticket, error) VALUES (?, ?, ?)").bind(rid, q.ticket ?? null, q.error ?? null).run()
  } catch { /* 0009 마이그레이션 전 — postMessage 만 */ }
}

/* (2026-11-28) 웹 팝업 — 쇼핑몰 창(opener)에 티켓을 넘기고 닫힘. 받는 쪽은 같은 주소(origin)만 */
function toWeb(origin: string, params: Record<string, string>) {
  const msg = JSON.stringify({ type: "gyeol-oauth", ...params }).replace(/</g, "\\u003c")
  const html = `<!doctype html><meta charset="utf-8"><title>Today's Stylepeek</title><body style="font-family:sans-serif;padding:24px">
<p id="m">로그인 중… / Signing in…</p><script>
try{ if(window.opener){ window.opener.postMessage(${msg}, ${JSON.stringify(origin)}); window.close(); } }catch(e){}
document.getElementById("m").textContent = "이 창을 닫고 쇼핑몰로 돌아가 주세요. / Close this window and return to the shop.";
</script></body>`
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
}

function toApp(params: Record<string, string>) {
  const q = new URLSearchParams(params).toString()
  return new Response(null, { status: 302, headers: { Location: `${appScheme()}://oauth?${q}`, "Cache-Control": "no-store" } })
}

export async function GET(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  const url = new URL(request.url)
  if (!isWebProvider(provider)) return new Response("Not found", { status: 404 })
  const st = await unsign<{ p: string; chal: string; lang: string; web?: boolean; rid?: string }>(url.searchParams.get("state") ?? "")
  if (!st || st.p !== provider) return toWeb(url.origin, { error: "expired" })
  const send = async (q: Record<string, string>) => { if (st.web) { await keep(st.rid, q); return toWeb(url.origin, q) } return toApp(q) }
  const code = url.searchParams.get("code")
  if (!code) return send({ error: url.searchParams.get("error") === "access_denied" ? "cancelled" : "failed" })
  try {
    const idToken = await exchangeCode(provider, code, `${url.origin}/api/customer/oauth/${provider}/callback`)
    const idt = await verifyIdToken(provider, idToken, null)
    const ticket = await sign({ idt, chal: st.chal }, 300)
    return send({ ticket })
  } catch {
    return send({ error: "failed" })
  }
}
