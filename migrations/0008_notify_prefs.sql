-- (2026-11-28) 원장 예약 알림 켜기/끄기 — 'email' 이면 이메일, '' 이면 스케줄표에만
ALTER TABLE stores ADD COLUMN notify_channels TEXT NOT NULL DEFAULT 'email';
