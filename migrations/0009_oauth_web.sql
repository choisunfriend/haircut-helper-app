-- (2026-11-28) 브라우저 팝업 로그인 — 팝업이 받은 티켓을 쇼핑몰 창이 가져갈 때까지 잠깐(5분) 맡아 둠
CREATE TABLE IF NOT EXISTS oauth_web (rid TEXT PRIMARY KEY, ticket TEXT, error TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
