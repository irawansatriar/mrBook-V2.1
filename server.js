import 'dotenv/config'; // Loads your GOOGLE_API_KEY
import { GoogleGenerativeAI } from "@google/generative-ai"; // Fixes the ReferenceError

import express from 'express';
import BookingService from './services/BookingService.js';

const app = express();
const ADMIN_PASSWORD = "admin123";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

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

app.get('/api/ai-insights', async (req, res) => {
    try {
        const rooms = await BookingService.getRooms();
        const allBookings = await BookingService.getAll(); // Assuming this fetches all data
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentTime = now.getHours().toString().padStart(2, '0') + ":00";

        // --- PRE-PROCESS DATA ---
        let roomStats = {};
        let userCounts = {};

        rooms.forEach(room => {
            const bookings = allBookings.filter(b => b.room_id === room.id);
            
            // 1. Check Today's earliest availability
            const todayB = bookings.filter(b => b.date === todayStr);
            // Logic: Is it free now? (Simplification for the LLM)
            const isFreeNow = !todayB.some(b => currentTime >= b.start_time.split('T')[1] && currentTime < b.end_time.split('T')[1]);

            // 2. Weekly/Next Week Density
            const thisWeekB = bookings.filter(b => b.date >= todayStr); 
            
            roomStats[room.name] = {
                isFreeNow,
                totalBookings: thisWeekB.length,
                bookings: todayB.map(b => `${b.start_time.split('T')[1]}-${b.end_time.split('T')[1]}`)
            };

            // 3. Track Users
            thisWeekB.forEach(b => {
                userCounts[b.user_name] = (userCounts[b.user_name] || 0) + 1;
            });
			
			
			
        });

        // Identify most frequent user
        const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0] || ["None", 0];

        // --- CONSTRUCT THE PROMPT ---
        const prompt = `
        System: You are the ZTE Office Coordinator.
        Current Time: ${currentTime}
        
        Data:
        ${JSON.stringify(roomStats)}
        Top User This Week: ${topUser[0]} with ${topUser[1]} bookings.

        Task: Provide a 3-point brief:
        1. Earliest Availability: Which room is free NOW? (Refer to isFreeNow)
        2. Booking Strategy: Which room has the fewest bookings this week/next week for easy scheduling?
        3. Activity: Mention the most frequent user.
        
        Rules: Be concise. Use professional language for a 5G project team.`;

        const model = genAI.getGenerativeModel({ model: "gemma-4-26b-it" });
        const result = await model.generateContent(prompt);
        res.json({ analysis: result.response.text() });

    } catch (err) {
        console.error(err);
        res.status(500).json({ analysis: "Accuracy check failed. Ensure data points are valid." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Live at http://localhost:${PORT}`));
