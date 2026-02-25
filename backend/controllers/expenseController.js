const Expense = require('../models/Expense');

const DAY_MS = 24 * 60 * 60 * 1000;

const buildRecurring = (input) => {
    const enabled = Boolean(input?.enabled);
    const frequency = ['daily', 'weekly', 'monthly', 'yearly'].includes(input?.frequency)
        ? input.frequency
        : 'monthly';
    const autoCreate = Boolean(input?.autoCreate);
    return { enabled, frequency, autoCreate };
};

const parseDateOrNull = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getNextRecurringDate = (baseDate, frequency) => {
    const nextDate = new Date(baseDate);
    switch (frequency) {
        case 'daily':
            nextDate.setTime(baseDate.getTime() + DAY_MS);
            break;
        case 'weekly':
            nextDate.setTime(baseDate.getTime() + (7 * DAY_MS));
            break;
        case 'yearly':
            nextDate.setFullYear(baseDate.getFullYear() + 1);
            break;
        case 'monthly':
        default:
            nextDate.setMonth(baseDate.getMonth() + 1);
            break;
    }
    return nextDate;
};

exports.addExpense = async (req, res) => {
    const { title, amount, category, description, date, recurring, type } = req.body;
    const amountNumber = Number(amount);
    const expenseDate = parseDateOrNull(date);
    const normalizedType = type === 'income' ? 'income' : 'expense';

    try {
        if (!title || !category || !expenseDate) {
            return res.status(400).json({ message: 'Title, category, and date are required!' });
        }
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number!' });
        }

        const expense = Expense({
            title: String(title).trim(),
            amount: amountNumber,
            type: normalizedType,
            category: String(category).trim(),
            description: String(description || '').trim(),
            date: expenseDate,
            recurring: buildRecurring(recurring),
            user: req.user.id
        });
        if (expense.recurring.enabled && normalizedType === 'expense') {
            expense.recurring.nextDueDate = getNextRecurringDate(expenseDate, expense.recurring.frequency);
        }

        await expense.save();
        return res.status(201).json(expense);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.getExpenses = async (req, res) => {
    try {
        const {
            page,
            limit,
            search,
            category,
            startDate,
            endDate,
            recurringOnly,
            type
        } = req.query;

        const shouldPaginate = Boolean(page || limit || search || category || startDate || endDate || recurringOnly || type);
        const query = { user: req.user.id };

        if (search) {
            query.title = { $regex: String(search), $options: 'i' };
        }
        if (category && category !== 'All') {
            query.category = category;
        }
        if (startDate || endDate) {
            query.date = {};
            const start = parseDateOrNull(startDate);
            const end = parseDateOrNull(endDate);
            if (start) query.date.$gte = start;
            if (end) query.date.$lte = end;
        }
        if (String(recurringOnly).toLowerCase() === 'true') {
            query['recurring.enabled'] = true;
        }
        if (type === 'income' || type === 'expense') {
            query.type = type;
        }

        if (!shouldPaginate) {
            const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });
            return res.status(200).json(expenses);
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const skip = (pageNumber - 1) * limitNumber;

        const [items, total] = await Promise.all([
            Expense.find(query)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limitNumber),
            Expense.countDocuments(query)
        ]);

        return res.status(200).json({
            items,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.max(Math.ceil(total / limitNumber), 1)
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateExpense = async (req, res) => {
    const { id } = req.params;
    const { title, amount, category, description, date, recurring, type } = req.body;
    const amountNumber = Number(amount);
    const expenseDate = parseDateOrNull(date);
    const normalizedType = type === 'income' ? 'income' : 'expense';

    try {
        const expense = await Expense.findById(id);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        if (expense.user.toString() !== req.user.id) return res.status(401).json({ message: 'User not authorized' });

        if (!title || !category || !expenseDate) {
            return res.status(400).json({ message: 'Title, category, and date are required!' });
        }
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number!' });
        }

        expense.title = String(title).trim();
        expense.amount = amountNumber;
        expense.type = normalizedType;
        expense.category = String(category).trim();
        expense.description = String(description || '').trim();
        expense.date = expenseDate;
        expense.recurring = buildRecurring(recurring);
        if (expense.recurring.enabled && normalizedType === 'expense') {
            const previousDue = parseDateOrNull(expense.recurring.nextDueDate);
            expense.recurring.nextDueDate = previousDue || getNextRecurringDate(expenseDate, expense.recurring.frequency);
        } else {
            expense.recurring.nextDueDate = null;
            expense.recurring.lastGeneratedAt = null;
        }
        await expense.save();

        return res.status(200).json(expense);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.generateRecurringExpense = async (req, res) => {
    const { id } = req.params;
    try {
        const template = await Expense.findById(id);
        if (!template) return res.status(404).json({ message: 'Expense not found' });
        if (template.user.toString() !== req.user.id) return res.status(401).json({ message: 'User not authorized' });
        if (!template.recurring?.enabled) return res.status(400).json({ message: 'Expense is not recurring' });

        const lastDate = parseDateOrNull(template.date) || new Date();
        const nextDate = getNextRecurringDate(lastDate, template.recurring.frequency);

        const newExpense = await Expense.create({
            user: template.user,
            title: template.title,
            amount: template.amount,
            type: template.type || 'expense',
            category: template.category,
            description: `${template.description} (Auto recurrence)`,
            date: nextDate,
            recurring: template.recurring
        });
        template.recurring.lastGeneratedAt = new Date();
        template.recurring.nextDueDate = getNextRecurringDate(nextDate, template.recurring.frequency);
        await template.save();

        return res.status(201).json(newExpense);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.getRecurringAlerts = async (req, res) => {
    try {
        const now = new Date();
        const dueItems = await Expense.find({
            user: req.user.id,
            type: { $ne: 'income' },
            'recurring.enabled': true,
            'recurring.nextDueDate': { $ne: null, $lte: now }
        }).sort({ 'recurring.nextDueDate': 1 }).limit(30);

        const alerts = dueItems.map((item) => ({
            _id: item._id,
            title: item.title,
            category: item.category,
            amount: Number(item.amount || 0),
            nextDueDate: item.recurring?.nextDueDate,
            autoCreate: Boolean(item.recurring?.autoCreate),
            frequency: item.recurring?.frequency || 'monthly'
        }));

        return res.json({
            dueCount: alerts.length,
            items: alerts
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.processRecurringDue = async (req, res) => {
    try {
        const now = new Date();
        const dueTemplates = await Expense.find({
            user: req.user.id,
            type: { $ne: 'income' },
            'recurring.enabled': true,
            'recurring.autoCreate': true,
            'recurring.nextDueDate': { $ne: null, $lte: now }
        }).limit(50);

        const created = [];
        for (const template of dueTemplates) {
            const dueDate = parseDateOrNull(template.recurring?.nextDueDate) || now;
            const generated = await Expense.create({
                user: template.user,
                title: template.title,
                amount: template.amount,
                type: template.type || 'expense',
                category: template.category,
                description: `${template.description} (Auto due)`,
                date: dueDate,
                recurring: template.recurring
            });
            created.push(generated);

            template.recurring.lastGeneratedAt = now;
            template.recurring.nextDueDate = getNextRecurringDate(dueDate, template.recurring.frequency);
            await template.save();
        }

        return res.json({
            createdCount: created.length,
            items: created
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteExpense = async (req, res) => {
    const { id } = req.params;
    try {
        const expense = await Expense.findById(id);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        if (expense.user.toString() !== req.user.id) return res.status(401).json({ message: 'User not authorized' });

        await Expense.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Expense Deleted' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};
