// GET /api/customer/oauth/poll?rid=…  (2026-11-28) 브라우저 팝업 로그인 결과 가져가기 — 한 번 가져가면 지움
//   → { success, pending:true } | { success, ticket } | { success:false, error }
import { NextResponse } from "next/server"
import { getProductsDb } from "@/lib/products-db"

export async function GET(request: Request) {
  const rid = new URL(request.url).searchParams.get("rid") ?? ""
  if (!/^[A-Za-z0-9_-]{43}$/.test(rid)) return NextResponse.json({ success: false, error: "bad" }, { status: 400 })
  const db = await getProductsDb()
  if (!db) return NextResponse.json({ success: false, error: "db" }, { status: 503 })
  try {
    const r = await db.prepare("SELECT ticket, error FROM oauth_web WHERE rid = ?").bind(rid).first<{ ticket: string | null; error: string | null }>()
    if (!r) return NextResponse.json({ success: true, pending: true }, { headers: { "Cache-Control": "no-store" } })
    await db.prepare("DELETE FROM oauth_web WHERE rid = ?").bind(rid).run()
    return NextResponse.json(r.ticket ? { success: true, ticket: r.ticket } : { success: false, error: r.error || "failed" }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ success: false, error: "migration" }, { status: 500 })
  }
}
