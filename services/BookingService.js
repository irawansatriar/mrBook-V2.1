import db from '../models/database.js';

class BookingService {
    // KEEP: New V2.0 Reservation logic[cite: 2]
    static async reserve(roomId, userName, startTime, endTime) {
        const checkSql = `
            SELECT id FROM bookings 
            WHERE room_id = ? 
            AND start_time < ? 
            AND end_time > ?`;

        return new Promise((resolve, reject) => {
            db.get(checkSql, [roomId, endTime, startTime], (err, row) => {
                if (err) return reject(err);
                if (row) return resolve({ success: false, message: "This slot is already booked!" });

                const insertSql = `INSERT INTO bookings (room_id, user_name, start_time, end_time) VALUES (?, ?, ?, ?)`;
                db.run(insertSql, [roomId, userName, startTime, endTime], function(err) {
                    if (err) return reject(err);
                    resolve({ success: true, id: this.lastID });
                });
            });
        });
    }

    // KEEP: Required for the new room.html calendar[cite: 2]
    static async getDaily(roomId, date) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT id, user_name, start_time, end_time FROM bookings 
                         WHERE room_id = ? AND start_time LIKE ? ORDER BY start_time ASC`;
            db.all(sql, [roomId, `${date}%`], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
    }

	static async getRooms() {
        return new Promise((res, rej) => {
            db.all("SELECT * FROM rooms", [], (err, rows) => { if (err) rej(err); res(rows); });
        });
    }

    static async getByRoom(roomId) {
        return new Promise((res, rej) => {
            const sql = `SELECT id, user_name, start_time, end_time FROM bookings 
                        WHERE room_id = ? 
                        AND start_time >= date('now', 'start of month')
                        ORDER BY start_time ASC`;
            db.all(sql, [roomId], (err, rows) => { 
                if (err) rej(err); 
                res(rows); 
            });
        });
    }





    // RESTORED: Required for Admin Booking Management[cite: 1]
	static async getAll() {
        return new Promise((res, rej) => {
            const sql = `SELECT b.*, r.name as room_name 
                         FROM bookings b 
                         LEFT JOIN rooms r ON b.room_id = r.id 
                         ORDER BY b.start_time DESC`;
            db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error("SQL Error in getAll:", err.message);
                    rej(err);
                }
                res(rows || []); 
            });
        });
    }

	static async delete(id) {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM bookings WHERE id = ?`, [id], function(err) {
                if (err) reject(err);
                resolve({ success: true });
            });
        });
    }

    static async addRoom(name, capacity) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO rooms (name, capacity) VALUES (?, ?)`;
            db.run(sql, [name, capacity], function(err) {
                if (err) reject(err);
                resolve({ id: this.lastID });
            });
        });
    }

    static async updateRoom(id, name, capacity) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE rooms SET name = ?, capacity = ? WHERE id = ?`;
            db.run(sql, [name, capacity, id], (err) => {
                if (err) reject(err);
                resolve({ success: true });
            });
        });
    }

    static async deleteRoom(id) {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM rooms WHERE id = ?`, [id], (err) => {
                if (err) reject(err);
                resolve({ success: true });
            });
        });
    }
}

export default BookingService;