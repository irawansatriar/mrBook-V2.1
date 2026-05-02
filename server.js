import express from 'express';
import BookingService from './services/BookingService.js';


const app = express();
const ADMIN_PASSWORD = "admin123";

app.use(express.json());
app.use(express.static('public'));


// Password Authentication Middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized: Invalid Password" });
    }
};

// Apply authentication only to admin routes
app.use('/api/admin', authenticate);

// --- ADMIN ROUTES (Requires Authorization Header) ---

// Get all bookings for admin table
app.get('/api/admin/bookings', async (req, res) => {
    try {
        res.json(await BookingService.getAll());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete a booking
app.delete('/api/admin/bookings/:id', async (req, res) => {
    try {
        await BookingService.delete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Room Management
app.post('/api/admin/rooms', async (req, res) => {
    try {
        const { name, capacity } = req.body;
        const result = await BookingService.addRoom(name, capacity);
        res.status(201).json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/rooms/:id', async (req, res) => {
    try {
        const { name, capacity } = req.body;
        await BookingService.updateRoom(req.params.id, name, capacity);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/rooms/:id', async (req, res) => {
    try {
        await BookingService.deleteRoom(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});



app.get('/api/rooms', async (req, res) => {
    try { res.json(await BookingService.getRooms()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { room_id, user_name, start_time, end_time } = req.body;
        const result = await BookingService.reserve(room_id, user_name, start_time, end_time);
        res.json(result);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/bookings/daily', async (req, res) => {
    try {
        const { room_id, date } = req.query;
        res.json(await BookingService.getDaily(room_id, date));
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Live at http://localhost:${PORT}`));