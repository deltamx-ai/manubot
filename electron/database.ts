import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'

let db: Database.Database

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'manubot.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      content TEXT NOT NULL,
      sender TEXT NOT NULL CHECK(sender IN ('user', 'bot')),
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

export function getSessions() {
  const sessions = db.prepare('SELECT * FROM sessions ORDER BY id DESC').all() as {
    id: string; title: string; created_at: string; updated_at: string
  }[]

  const getMessages = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC')

  return sessions.map(s => ({
    id: s.id,
    title: s.title,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    messages: (getMessages.all(s.id) as {
      id: string; session_id: string; content: string; sender: string; timestamp: string
    }[]).map(m => ({
      id: m.id,
      content: m.content,
      sender: m.sender,
      timestamp: m.timestamp,
    })),
  }))
}

export function createSession(id: string): string {
  const title = 'New Chat'
  const now = new Date().toISOString()
  db.prepare('INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, title, now, now)
  return title
}

export function deleteSession(id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export function createMessage(sessionId: string, message: { id: string; content: string; sender: string; timestamp: string }): void {
  db.prepare('INSERT INTO messages (id, session_id, content, sender, timestamp) VALUES (?, ?, ?, ?, ?)').run(
    message.id, sessionId, message.content, message.sender, message.timestamp
  )
  db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(message.timestamp, sessionId)
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}
