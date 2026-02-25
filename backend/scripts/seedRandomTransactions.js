const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Expense = require('../models/Expense');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const INCOME_CATEGORY_NAMES = ['Salary', 'Freelance', 'Investments', 'Bonus', 'Other'];
const EXPENSE_FALLBACK_CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Other'];
const EXPENSE_TITLES = [
    'Grocery Run', 'Fuel', 'Internet Bill', 'Dining Out', 'Coffee', 'Pharmacy',
    'Movie Tickets', 'Taxi Ride', 'Electricity Bill', 'Snacks', 'Gym', 'Stationery',
    'Phone Recharge', 'Clothing', 'Household Items'
];
const INCOME_TITLES = [
    'Monthly Salary', 'Freelance Payment', 'Investment Return', 'Bonus', 'Refund'
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const randomPastDate = (daysBack = 90) => {
    const now = Date.now();
    const backMs = rand(0, daysBack) * 24 * 60 * 60 * 1000;
    const d = new Date(now - backMs);
    d.setHours(rand(7, 21), rand(0, 59), rand(0, 59), 0);
    return d;
};

const run = async () => {
    try {
        await connectDB();

        const args = process.argv.slice(2);
        const targetAdmin = args.includes('--admin');
        const emailArgRaw = args.find((a) => a.startsWith('--email='));
        const targetEmail = emailArgRaw ? String(emailArgRaw.split('=')[1] || '').trim().toLowerCase() : '';

        let query = { role: { $ne: 'admin' } };
        if (targetAdmin) {
            query = { role: 'admin' };
        }
        if (targetEmail) {
            query = { email: targetEmail };
        }

        const targetUser = await User.findOne(query)
            .sort({ lastLoginAt: -1, updatedAt: -1, createdAt: -1 });

        if (!targetUser) {
            console.log('No matching user found for seeding.');
            process.exit(0);
        }

        const categories = await Category.find({ user: targetUser._id, active: { $ne: false } }).select('name');
        const userCategoryNames = categories.map((c) => String(c.name || '').trim()).filter(Boolean);

        const incomeCategories = Array.from(new Set([
            ...userCategoryNames.filter((name) => INCOME_CATEGORY_NAMES.map((i) => i.toLowerCase()).includes(name.toLowerCase())),
            ...INCOME_CATEGORY_NAMES
        ]));

        const expenseCategories = Array.from(new Set([
            ...userCategoryNames.filter((name) => !INCOME_CATEGORY_NAMES.map((i) => i.toLowerCase()).includes(name.toLowerCase())),
            ...EXPENSE_FALLBACK_CATEGORIES
        ]));

        const expenseCount = 45;
        const incomeCount = 16;
        const docs = [];

        for (let i = 0; i < expenseCount; i += 1) {
            docs.push({
                user: targetUser._id,
                type: 'expense',
                title: pick(EXPENSE_TITLES),
                amount: rand(80, 2500),
                category: pick(expenseCategories),
                description: '',
                date: randomPastDate(120),
                recurring: { enabled: false, frequency: 'monthly', autoCreate: false }
            });
        }

        for (let i = 0; i < incomeCount; i += 1) {
            docs.push({
                user: targetUser._id,
                type: 'income',
                title: pick(INCOME_TITLES),
                amount: rand(1200, 18000),
                category: pick(incomeCategories),
                description: '',
                date: randomPastDate(120),
                recurring: { enabled: false, frequency: 'monthly', autoCreate: false }
            });
        }

        await Expense.insertMany(docs, { ordered: false });

        console.log(`Seeded ${expenseCount} expenses and ${incomeCount} incomes for: ${targetUser.email} (${targetUser.role})`);
        process.exit(0);
    } catch (error) {
        console.log('Seeding failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
};

run();
