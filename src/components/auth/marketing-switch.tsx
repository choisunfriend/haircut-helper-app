"use client"
// (2026-11-28) [내 계정] 이벤트·혜택 알림 수신 동의 켜기/끄기 (정보통신망법 제50조: 언제든 철회 가능해야 함)
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useL } from "@/i18n/use-l"
import { CONSENT_VERSION } from "@/lib/consent"
import { useCustomer } from "@/store/customer"

export function MarketingSwitch() {
  const { L, lang } = useL()
  const api = useCustomer((s) => s.api)
  const [on, setOn] = useState<boolean | null>(null)
  useEffect(() => {
    let alive = true
    api<{ consents: { item: string; agreed: number }[] }>("/api/customer/consents").then((r) => {
      if (alive && r.ok) setOn(!!r.data.consents?.find((c) => c.item === "marketing")?.agreed)
    })
    return () => { alive = false }
  }, [api])
  if (on === null) return null
  const toggle = async () => {
    const next = !on
    setOn(next)
    const r = await api("/api/customer/consents", { method: "POST", body: JSON.stringify({ items: { marketing: next }, version: CONSENT_VERSION, lang }) })
    if (!r.ok) { setOn(!next); toast.error(L("저장하지 못했어요", "Couldn't save")); return }
    const d = new Date().toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US")
    // 수신 동의/철회 처리 결과를 알려야 함(정보통신망법 시행령 제62조의3)
    toast.success(next ? L(`${d} 혜택 알림 수신에 동의했어요`, `Opted in to offers on ${d}`) : L(`${d} 혜택 알림 수신을 거부했어요`, `Opted out of offers on ${d}`))
  }
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-4">
      <span>
        <span className="block text-sm font-medium">{L("이벤트·혜택 알림 받기", "Offers and event news")}</span>
        <span className="block text-xs text-muted-foreground">{L("예약 확인 같은 꼭 필요한 알림은 꺼도 받아요", "Essential notices like booking updates are always sent")}</span>
      </span>
      <button type="button" role="switch" aria-checked={on} onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-foreground" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  )
}
