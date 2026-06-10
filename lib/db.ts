// 端末内 SQLite 永続化（expo-sqlite, SDK56 async API）。バックエンドなし。
// session 1:N event / highlight。streak は単一行テーブル。
//
// 純粋ロジック（scoring/streak/classification）はテスト済み。本モジュールは薄い
// CRUD で、ネイティブ依存のため vitest 対象外（型チェックで担保）。

import * as SQLite from 'expo-sqlite';
import type {
  ClassificationEvent,
  HighlightClip,
  RecordingSession,
  Streak,
} from '../store/types';

const DB_NAME = 'ibiki.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY NOT NULL,
          startedAt INTEGER NOT NULL,
          endedAt INTEGER NOT NULL,
          durationSec REAL NOT NULL,
          audioFileUri TEXT,
          nightlyScore INTEGER NOT NULL,
          createdAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY NOT NULL,
          sessionId TEXT NOT NULL,
          label TEXT NOT NULL,
          startSec REAL NOT NULL,
          endSec REAL NOT NULL,
          peakDb REAL NOT NULL,
          confidence REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_events_session ON events(sessionId);
        CREATE TABLE IF NOT EXISTS highlights (
          id TEXT PRIMARY KEY NOT NULL,
          sessionId TEXT NOT NULL,
          label TEXT NOT NULL,
          clipUri TEXT NOT NULL,
          startSec REAL NOT NULL,
          peakDb REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_highlights_session ON highlights(sessionId);
        CREATE TABLE IF NOT EXISTS streak (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          current INTEGER NOT NULL,
          longest INTEGER NOT NULL,
          lastNightDate TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS session_remedies (
          sessionId TEXT NOT NULL,
          remedyId TEXT NOT NULL,
          PRIMARY KEY (sessionId, remedyId)
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

// --- sessions ---

export async function insertSession(s: RecordingSession): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO sessions (id, startedAt, endedAt, durationSec, audioFileUri, nightlyScore, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [s.id, s.startedAt, s.endedAt, s.durationSec, s.audioFileUri ?? null, s.nightlyScore, s.createdAt]
  );
}

export async function getSession(id: string): Promise<RecordingSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RecordingSession>(`SELECT * FROM sessions WHERE id = ?`, [id]);
  return row ?? null;
}

export async function listSessions(): Promise<RecordingSession[]> {
  const db = await getDb();
  return db.getAllAsync<RecordingSession>(`SELECT * FROM sessions ORDER BY startedAt DESC`);
}

// ハードペイウォール（2日目レポート閲覧時）の判定に使う。
export async function countSessions(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM sessions`);
  return row?.n ?? 0;
}

// --- events ---

export async function insertEvents(events: ClassificationEvent[]): Promise<void> {
  if (!events.length) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const e of events) {
      await db.runAsync(
        `INSERT OR REPLACE INTO events (id, sessionId, label, startSec, endSec, peakDb, confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.sessionId, e.label, e.startSec, e.endSec, e.peakDb, e.confidence]
      );
    }
  });
}

export async function getEvents(sessionId: string): Promise<ClassificationEvent[]> {
  const db = await getDb();
  return db.getAllAsync<ClassificationEvent>(
    `SELECT * FROM events WHERE sessionId = ? ORDER BY startSec ASC`,
    [sessionId]
  );
}

// --- highlights ---

export async function insertHighlights(clips: HighlightClip[]): Promise<void> {
  if (!clips.length) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const c of clips) {
      await db.runAsync(
        `INSERT OR REPLACE INTO highlights (id, sessionId, label, clipUri, startSec, peakDb)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [c.id, c.sessionId, c.label, c.clipUri, c.startSec, c.peakDb]
      );
    }
  });
}

export async function getHighlights(sessionId: string): Promise<HighlightClip[]> {
  const db = await getDb();
  return db.getAllAsync<HighlightClip>(
    `SELECT * FROM highlights WHERE sessionId = ? ORDER BY peakDb DESC`,
    [sessionId]
  );
}

// --- session remedies（その夜に試した対策のタグ） ---

export async function setSessionRemedies(sessionId: string, remedyIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM session_remedies WHERE sessionId = ?`, [sessionId]);
    for (const rid of remedyIds) {
      await db.runAsync(
        `INSERT OR REPLACE INTO session_remedies (sessionId, remedyId) VALUES (?, ?)`,
        [sessionId, rid]
      );
    }
  });
}

export async function getSessionRemedies(sessionId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ remedyId: string }>(
    `SELECT remedyId FROM session_remedies WHERE sessionId = ?`,
    [sessionId]
  );
  return rows.map((r) => r.remedyId);
}

// 全セッションの対策タグ（トレンドの効果分析用）。
export async function getAllSessionRemedies(): Promise<{ sessionId: string; remedyId: string }[]> {
  const db = await getDb();
  return db.getAllAsync<{ sessionId: string; remedyId: string }>(
    `SELECT sessionId, remedyId FROM session_remedies`
  );
}

// --- streak ---

export async function getStreak(): Promise<Streak | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Streak>(`SELECT current, longest, lastNightDate FROM streak WHERE id = 1`);
  return row ?? null;
}

export async function saveStreak(s: Streak): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO streak (id, current, longest, lastNightDate) VALUES (1, ?, ?, ?)`,
    [s.current, s.longest, s.lastNightDate]
  );
}
