const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const { cleanupCategoryDuplicatesForUser } = require('../utils/categoryCleanup');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const INCOME_CATEGORY_NAMES = ['Salary', 'Freelance', 'Investments', 'Bonus', 'Other'];
const EXPENSE_FALLBACK_CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Other'];
const EXPENSE_TITLES = [
    'Grocery Run', 'Fuel', 'Internet Bill', 'Dining Out', 'Coffee', 'Pharmacy',
    'Movie Tickets', 'Taxi Ride', 'Electricity Bill', 'Snacks', 'Gym', 'Stationery',
    'Phone Recharge', 'Clothing', 'Household Items'
];
const INCOME_TITLES = ['Monthly Salary', 'Freelance Payment', 'Investment Return', 'Bonus', 'Refund'];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const randomPastDate = (daysBack = 90) => {
    const now = Date.now();
    const backMs = rand(0, daysBack) * 24 * 60 * 60 * 1000;
    const d = new Date(now - backMs);
    d.setHours(rand(7, 21), rand(0, 59), rand(0, 59), 0);
    return d;
};

// GET /api/admin/users
const getUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('_id name email role createdAt lastLoginAt')
            .sort({ createdAt: -1 });
        return res.json(users);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// GET /api/admin/logins
const getLoginEvents = async (req, res) => {
    try {
        const events = await LoginEvent.find({})
            .sort({ createdAt: -1 })
            .limit(300);
        return res.json(events);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/admin/users
const createUserByAdmin = async (req, res) => {
    const { name, email, password, role } = req.body;
    const cleanedName = String(name || '').trim();
    const normalizedEmail = normalizeEmail(email);
    const cleanedPassword = String(password || '');
    const nextRole = role === 'admin' ? 'admin' : 'user';

    try {
        if (!cleanedName || !normalizedEmail || !cleanedPassword) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name: cleanedName,
            email: normalizedEmail,
            password: cleanedPassword,
            role: nextRole
        });

        return res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// DELETE /api/admin/users/:id
const deleteUserByAdmin = async (req, res) => {
    const { id } = req.params;

    try {
        if (String(req.user.id) === String(id)) {
            return res.status(400).json({ message: 'Admin cannot delete own account' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.findByIdAndDelete(id);
        return res.json({ message: 'User deleted' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/admin/categories/cleanup-duplicates
const cleanupCategoryDuplicatesForAllUsers = async (req, res) => {
    try {
        const userIds = await Category.distinct('user', { user: { $ne: null } });
        if (!userIds.length) {
            return res.json({
                message: 'No category data found',
                usersProcessed: 0,
                removed: 0,
                updated: 0,
                groupsWithDuplicates: 0,
                results: []
            });
        }

        const results = [];
        for (const userId of userIds) {
            // Sequential processing keeps DB pressure low for shared hosting.
            // eslint-disable-next-line no-await-in-loop
            const summary = await cleanupCategoryDuplicatesForUser(userId);
            results.push(summary);
        }

        const totals = results.reduce((acc, item) => {
            acc.removed += Number(item.removed || 0);
            acc.updated += Number(item.updated || 0);
            acc.groupsWithDuplicates += Number(item.groupsWithDuplicates || 0);
            return acc;
        }, { removed: 0, updated: 0, groupsWithDuplicates: 0 });

        return res.json({
            message: 'Category duplicate cleanup completed for all users',
            usersProcessed: results.length,
            ...totals,
            results
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/admin/seed-random-entries
const seedRandomEntriesForAdmin = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestedExpenseCount = Number(req.body?.expenseCount);
        const requestedIncomeCount = Number(req.body?.incomeCount);
        const expenseCount = Number.isFinite(requestedExpenseCount)
            ? Math.min(Math.max(Math.floor(requestedExpenseCount), 1), 200)
            : 30;
        const incomeCount = Number.isFinite(requestedIncomeCount)
            ? Math.min(Math.max(Math.floor(requestedIncomeCount), 1), 120)
            : 12;

        const categories = await Category.find({ user: userId, active: { $ne: false } }).select('name');
        const userCategoryNames = categories.map((c) => String(c.name || '').trim()).filter(Boolean);
        const incomeLookup = new Set(INCOME_CATEGORY_NAMES.map((item) => item.toLowerCase()));
        const incomeCategories = Array.from(new Set([
            ...userCategoryNames.filter((name) => incomeLookup.has(name.toLowerCase())),
            ...INCOME_CATEGORY_NAMES
        ]));
        const expenseCategories = Array.from(new Set([
            ...userCategoryNames.filter((name) => !incomeLookup.has(name.toLowerCase())),
            ...EXPENSE_FALLBACK_CATEGORIES
        ]));

        const docs = [];
        for (let i = 0; i < expenseCount; i += 1) {
            docs.push({
                user: userId,
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
                user: userId,
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

        return res.json({
            message: 'Random test entries added',
            expenseCount,
            incomeCount,
            totalAdded: docs.length
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getUsers,
    getLoginEvents,
    createUserByAdmin,
    deleteUserByAdmin,
    cleanupCategoryDuplicatesForAllUsers,
    seedRandomEntriesForAdmin
};
