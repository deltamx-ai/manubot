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

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Initialize session counter if not exists
  db.prepare('INSERT OR IGNORE INTO metadata (key, value) VALUES (?, ?)').run('session_counter', '0')
}

function getNextSessionNumber(): number {
  const update = db.prepare('UPDATE metadata SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = ?')
  const select = db.prepare('SELECT value FROM metadata WHERE key = ?')
  const run = db.transaction(() => {
    update.run('session_counter')
    return Number((select.get('session_counter') as { value: string }).value)
  })
  return run()
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
  const num = getNextSessionNumber()
  const title = `Chat ${num}`
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
