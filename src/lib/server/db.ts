import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = 'data/grocery.db';

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bought INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

export type Item = {
	id: number;
	name: string;
	bought: boolean;
};

type ItemRow = { id: number; name: string; bought: number };

const listStmt = db.prepare<[], ItemRow>(
	'SELECT id, name, bought FROM items ORDER BY bought ASC, id ASC'
);
const insertStmt = db.prepare<[string]>('INSERT INTO items (name) VALUES (?)');
const toggleStmt = db.prepare<[number]>('UPDATE items SET bought = 1 - bought WHERE id = ?');
const renameStmt = db.prepare<[string, number]>('UPDATE items SET name = ? WHERE id = ?');
const deleteStmt = db.prepare<[number]>('DELETE FROM items WHERE id = ?');

export function listItems(): Item[] {
	return listStmt.all().map((r) => ({ id: r.id, name: r.name, bought: r.bought === 1 }));
}

export function addItem(name: string): void {
	insertStmt.run(name);
}

export function toggleItem(id: number): void {
	toggleStmt.run(id);
}

export function renameItem(id: number, name: string): void {
	renameStmt.run(name, id);
}

export function deleteItem(id: number): void {
	deleteStmt.run(id);
}
