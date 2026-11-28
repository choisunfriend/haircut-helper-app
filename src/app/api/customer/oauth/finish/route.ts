// POST /api/customer/oauth/finish  body { ticket, verifier, platform? }  (Bearer 지금 토큰 있으면 이어 붙임)
//   → /api/customer/login 과 같은 응답 { success, token, expiresAt, customer, merged, created }
import { withLang } from "@/i18n/api"
import { bi } from "@/i18n/l"
import { bearerToken, cfail, cjson, clientInfo, customerDb, optionalCustomer, overCustomerLimit, preflight, readJson } from "@/lib/customer-auth"
import { AccountError, cleanSessionMeta, endSession, hashToken, linkOrLogin, toPublic, TOKEN_RE } from "@/lib/customers-db"
import { sha256b64u, unsign } from "@/lib/oauth-web"
import type { VerifiedIdentity } from "@/lib/oidc"

async function handlePOST(request: Request) {
  const info = clientInfo(request)
  if (await overCustomerLimit(`login:${info.ip}`)) return cfail(request, bi("요청이 너무 많습니다. 잠시 뒤 다시 해 주세요", "Too many requests. Try again shortly"), 429)
  const body = await readJson(request)
  if (!body) return cfail(request, bi("JSON 형식이 아닙니다", "Not valid JSON"))
  const t = await unsign<{ idt: VerifiedIdentity; chal: string }>(String(body.ticket ?? ""))
  const verifier = String(body.verifier ?? "")
  if (!t || !verifier || (await sha256b64u(verifier)) !== t.chal) {
    return cfail(request, bi("로그인 시간이 지났습니다. 다시 시도해 주세요", "Sign-in expired. Please try again"), 401)
  }
  const d = await customerDb(request)
  if ("err" in d) return d.err
  try {
    const current = await optionalCustomer(request, d.db)
    const r = await linkOrLogin(d.db, t.idt, current, cleanSessionMeta(body), info)
    const old = bearerToken(request)
    if (old && TOKEN_RE.test(old)) await endSession(d.db, await hashToken(old))
    return cjson(request, { success: true, token: r.token, expiresAt: r.expiresAt, customer: await toPublic(d.db, r.customer), merged: r.merged, created: r.created })
  } catch (e) {
    if (e instanceof AccountError && e.status === 403) return cfail(request, bi("사용이 중지된 계정입니다", "This account is disabled"), 403)
    return cfail(request, bi("로그인하지 못했습니다", "Couldn't sign in"), 500)
  }
}

export const POST = withLang(handlePOST)
export const OPTIONS = (request: Request) => preflight(request)
