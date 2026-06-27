import Database from "better-sqlite3";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { paths } from "@rcf/core";

let _db: Database.Database | null = null;
let _dbPath: string | null = null;

export const getDb = (): Database.Database => {
  const dbPath = path.resolve(paths.root, "analytics.sqlite");
  if (_db && _dbPath === dbPath) return _db;
  if (_db) _db.close();
  mkdirSync(path.dirname(dbPath), { recursive: true });
  _db = new Database(dbPath);
  _dbPath = dbPath;
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      story_id TEXT PRIMARY KEY,
      tone TEXT,
      intensity TEXT,
      twist_type TEXT,
      hook_pattern TEXT,
      background_mood TEXT,
      tts_voice TEXT,
      platform TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      hook_survival_3s REAL,
      completion_rate REAL,
      likes INTEGER,
      comments INTEGER,
      shares INTEGER,
      saves INTEGER,
      recorded_at TEXT
    );
  `);
  return _db;
};
