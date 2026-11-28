"use client"
// (2026-11-28) 새 예약 이메일 알림 켜기/끄기 (끄면 스케줄표에만)
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useL } from "@/i18n/client"

interface S { channels: string[]; email: string; available: { email: boolean } }

export function NotifySettings() {
  const { L } = useL()
  const [s, setS] = useState<S | null>(null)
  useEffect(() => {
    let alive = true
    fetch("/api/admin/notify-settings", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (alive && d.success) setS(d) }).catch(() => {})
    return () => { alive = false }
  }, [])
  if (!s || !s.available.email) return null // 이메일 키를 안 넣었으면 안 보임
  const on = s.channels.includes("email")
  const toggle = async () => {
    const channels = on ? [] : ["email"]
    setS({ ...s, channels })
    const d = await fetch("/api/admin/notify-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channels }) }).then((r) => r.json()).catch(() => ({}))
    if (!d.success) { setS(s); toast.error(d.error ?? L("저장하지 못했어요", "Couldn't save")) }
  }
  return (
    <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
      <input type="checkbox" className="size-4" checked={on} onChange={toggle} />
      <span className="font-medium">{L("새 예약을 이메일로도 받기", "Also email me new bookings")}</span>
      <span className="text-xs text-muted-foreground">{s.email || L("입점사 정보에 연락 이메일이 없어요", "No contact email in store info")}</span>
    </label>
  )
}
