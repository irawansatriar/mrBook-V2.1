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

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.get('/api/ai-insights', async (req, res) => {
    try {
        const rooms = await BookingService.getRooms();
        const now = new Date();
        
        // Helper to format dates YYYY-MM-DD
        const fmt = (d) => d.toISOString().split('T')[0];

        // Define our windows
        const today = fmt(now);
        
        // Get end of "This Week" (7 days from now)
        const endOfThisWeek = new Date();
        endOfThisWeek.setDate(now.getDate() + 7);
        
        // Get end of "Next Week" (14 days from now)
        const endOfNextWeek = new Date();
        endOfNextWeek.setDate(now.getDate() + 14);

        let context = `Current Date/Time: ${today} ${now.getHours()}:${now.getMinutes()}\n\n`;

        for (const room of rooms) {
            // 1. Fetch Today
            const todayB = await BookingService.getDaily(room.id, today);
            
            // 2. Fetch Weekly Range (You might need to adjust your service to accept start/end)
            // If getWeekly only does current week, we simulate the logic here:
            const allBookings = await BookingService.getAll();
            const roomBookings = allBookings.filter(b => b.room_id === room.id);

            const thisWeek = roomBookings.filter(b => b.date >= today && b.date <= fmt(endOfThisWeek));
            const nextWeek = roomBookings.filter(b => b.date > fmt(endOfThisWeek) && b.date <= fmt(endOfNextWeek));

            context += `ROOM: ${room.name}\n`;
            context += `- TODAY: ${todayB.length} bookings.\n`;
            context += `- THIS WEEK: ${thisWeek.length} bookings.\n`;
            context += `- NEXT WEEK: ${nextWeek.length} bookings.\n\n`;
        }

        const model = genAI.getGenerativeModel({ model: "gemma-3-1b-it" });
        const prompt = `As an office coordinator, provide a 3-part summary based on this data:
        1. IMMEDIATE: What's free now?
        2. WEEKLY: Best day for a long meeting this week?
        3. NEXT WEEK: General outlook.
        Keep it professional and under 60 words.\n\nData:\n${context}`;

        const result = await model.generateContent(prompt);
        res.json({ analysis: result.response.text() });

    } catch (err) {
        console.error("Expansion Error:", err);
        res.status(500).json({ analysis: "Error expanding insights. Check if getAll() is supported." });
    }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Live at http://localhost:${PORT}`));
