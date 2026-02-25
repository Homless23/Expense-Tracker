const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

const ensureAdminUser = async () => {
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || '');
    const adminName = String(process.env.ADMIN_NAME || 'Admin').trim();
    const syncAdminPassword = String(process.env.ADMIN_SYNC_PASSWORD || 'true').toLowerCase() !== 'false';
    if (!adminEmail || !adminPassword) return;

    try {
        const existing = await User.findOne({ email: adminEmail });
        if (existing) {
            let updated = false;
            if (existing.name !== adminName) {
                existing.name = adminName;
                updated = true;
            }
            if (existing.role !== 'admin') {
                existing.role = 'admin';
                updated = true;
            }
            if (syncAdminPassword) {
                existing.password = adminPassword;
                updated = true;
            }
            if (updated) {
                await existing.save();
                console.log('Admin user synchronized from environment');
            }
            return;
        }

        await User.create({
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            role: 'admin'
        });
        console.log('Admin user bootstrapped from environment');
    } catch (error) {
        console.log('Failed to bootstrap admin user:', error.message);
    }
};

ensureAdminUser();

// Middleware
app.use(express.json({ limit: '3mb' }));
app.use(cors());

// Health check endpoint for quick runtime verification
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/v1', require('./routes/expenses')); // Keeps your old URL structure for expenses
app.use('/api/v1', require('./routes/categoryRoutes'));
app.use('/api/v1', require('./routes/goals'));
app.use('/api/v1', require('./routes/budgets'));

app.listen(PORT, () => {
    console.log('You are listening to port:', PORT);
});
