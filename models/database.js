import sqlite3 from 'sqlite3';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Logic: Use the /data folder on Railway, or models folder on your laptop
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join('/data', 'database.sqlite') 
    : path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath), (err) => {
    if (err) console.error("Database opening error:", err.message);
    else console.log("Connected to SQLite database.");
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        capacity TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id)
    )`);

    db.get("SELECT count(*) as count FROM rooms", (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO rooms (name, capacity) VALUES ('Room A', '4 Pax'), ('Room B', '8 Pax'), ('Room C', '15 Pax')");
        }
    });
});

export default db;
