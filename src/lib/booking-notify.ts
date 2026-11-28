// ============================================================================
// (2026-11-28) 새 예약 → 원장 알림. 입점사가 [예약 스케줄 > 알림 설정]에서 켜고 끔.
//   email : RESEND_API_KEY · MAIL_FROM 이 있을 때만 (받는 곳: 입점사 연락 이메일)
// 꺼져 있거나 키가 없으면 스케줄표에만 보입니다. 실패해도 예약은 저장돼 있음.
// 나중: 미용실 앱 푸시(APNs·FCM)를 여기에 추가.
// ============================================================================
import type { D1Database } from "@/lib/products-db"
import { notifySalon, type BookingRow } from "@/lib/bookings-db"

export const CHANNELS = ["email"] as const
export type Channel = (typeof CHANNELS)[number]

export function parseChannels(v: string | null | undefined): Channel[] {
  return (v ?? "").split(",").map((s) => s.trim()).filter((s): s is Channel => (CHANNELS as readonly string[]).includes(s))
}

export async function onNewBooking(db: D1Database, b: BookingRow, salon: { name: string; store_id: string }, adminUrl: string): Promise<void> {
  let ch: Channel[] = ["email"]
  try {
    const r = await db.prepare(`SELECT notify_channels FROM stores WHERE id = ?`).bind(salon.store_id).first<{ notify_channels: string | null }>()
    if (r) ch = parseChannels(r.notify_channels)
  } catch { /* 0008 전이면 이메일 기본 */ }
  try {
    if (ch.includes("email")) await notifySalon(db, b, salon, adminUrl)
  } catch { /* 무시 */ }
}
