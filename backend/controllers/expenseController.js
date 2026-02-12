const Expense = require('../models/Expense');

exports.addExpense = async (req, res) => {
    const { title, amount, category, description, date } = req.body;
    const parsedAmount = Number(amount);

    const expense = Expense({
        title,
        amount,
        category,
        description,
        date,
        user: req.user.id // Linked to logged in user
    });

    try {
        // Validations
        if (!title || !category || !description || !date) {
            return res.status(400).json({ message: 'All fields are required!' });
        }
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number!' });
        }

        expense.amount = parsedAmount;
        
        await expense.save();
        res.status(200).json({ message: 'Expense Added' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.getExpenses = async (req, res) => {
    try {
        // Only get expenses for the logged in user
        const expenses = await Expense.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(expenses);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.deleteExpense = async (req, res) => {
    const { id } = req.params;
    try {
        const expense = await Expense.findById(id);
        
        // Check if expense exists
        if(!expense){
             return res.status(404).json({ message: 'Expense not found' });
        }

        // Check if user matches
        if(expense.user.toString() !== req.user.id){
            return res.status(401).json({ message: 'User not authorized' });
        }

        await Expense.findByIdAndDelete(id);
        res.status(200).json({ message: 'Expense Deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}
