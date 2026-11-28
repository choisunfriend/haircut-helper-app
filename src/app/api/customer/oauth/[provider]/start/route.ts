// GET /api/customer/oauth/{google|kakao}/start?chal=…&lang=ko  — 앱이 브라우저로 엶 (설명: src/lib/oauth-web.ts)
import { authorizeUrl, isWebProvider, sign, webEnabled } from "@/lib/oauth-web"

export async function GET(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  const url = new URL(request.url)
  const chal = url.searchParams.get("chal") ?? ""
  const lang = url.searchParams.get("lang") === "ko" ? "ko" : "en"
  if (!isWebProvider(provider) || !webEnabled(provider)) return new Response("Sign-in method not enabled", { status: 503 })
  if (!/^[A-Za-z0-9_-]{43}$/.test(chal)) return new Response("Bad request", { status: 400 })
  const web = url.searchParams.get("web") === "1"   // (2026-11-28) 웹(앱 밖) 팝업 로그인 — 끝나면 앱 주소 대신 팝업 페이지가 쇼핑몰 창에 알려 줌
  const rid = url.searchParams.get("rid") ?? ""   // 웹: 쇼핑몰 창이 결과를 가져갈 번호(난수)
  if (web && !/^[A-Za-z0-9_-]{43}$/.test(rid)) return new Response("Bad request", { status: 400 })
  const state = await sign({ p: provider, chal, lang, web, rid: web ? rid : undefined }, 600)
  const redirectUri = `${url.origin}/api/customer/oauth/${provider}/callback`
  return Response.redirect(authorizeUrl(provider, redirectUri, state, lang), 302)
}
