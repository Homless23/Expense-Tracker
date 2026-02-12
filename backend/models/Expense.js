const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: 50
    },
    amount: {
        type: Number,
        required: [true, 'Please add an amount'],
        min: [0.01, 'Amount must be greater than zero']
    },
    type: {
        type: String,
        default: 'expense',
        enum: ['expense']
    },
    date: {
        type: Date,
        required: [true, 'Please add a date']
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        trim: true,
        maxlength: 30
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        trim: true,
        maxlength: 200
    },
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
