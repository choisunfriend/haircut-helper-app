// /api/admin/notify-settings  (2026-11-28) 입점사 예약 알림 방법
//   GET   → { channels, email, available: { email } }
//   PATCH body { channels: ["email"] 또는 [] }
import { NextResponse } from "next/server"
import { fail, noStore, requireAdmin } from "@/lib/admin-guard"
import { withLang } from "@/i18n/api"
import { bi } from "@/i18n/l"
import { CHANNELS, parseChannels } from "@/lib/booking-notify"

const available = () => {
  return { email: !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM) }
}

async function storeId(request: Request) {
  const g = await requireAdmin(request)
  if ("err" in g) return { err: g.err }
  const id = new URL(request.url).searchParams.get("storeId") || (g.session.role === "platform" ? null : g.session.sid)
  if (!id) return { err: fail(bi("입점사 계정으로 로그인하세요", "Sign in as a store")) }
  if (g.session.role !== "platform" && id !== g.session.sid) return { err: fail(bi("권한이 없습니다", "Forbidden"), 403) }
  return { db: g.db, id }
}

async function handleGET(request: Request) {
  const s = await storeId(request)
  if ("err" in s) return s.err
  try {
    const r = await s.db.prepare(`SELECT notify_channels, contact_email FROM stores WHERE id = ?`).bind(s.id)
      .first<{ notify_channels: string | null; contact_email: string | null }>()
    return NextResponse.json({ success: true, channels: parseChannels(r?.notify_channels), email: r?.contact_email ?? "", available: available() }, { headers: noStore })
  } catch {
    return fail(bi("migrations/0008_notify_prefs.sql 을 실행하세요", "Run migrations/0008_notify_prefs.sql"), 500)
  }
}

async function handlePATCH(request: Request) {
  const s = await storeId(request)
  if ("err" in s) return s.err
  const body = await request.json().catch(() => null) as { channels?: unknown } | null
  if (!body) return fail(bi("JSON 형식이 아닙니다", "Not valid JSON"))
  const channels = Array.isArray(body.channels) ? body.channels.filter((c): c is string => (CHANNELS as readonly string[]).includes(c as string)) : []
  await s.db.prepare(`UPDATE stores SET notify_channels = ? WHERE id = ?`).bind(channels.join(","), s.id).run()
  return NextResponse.json({ success: true }, { headers: noStore })
}

export const GET = withLang(handleGET)
export const PATCH = withLang(handlePATCH)
