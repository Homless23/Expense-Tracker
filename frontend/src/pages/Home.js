import React, { useEffect, useState } from 'react';
import { useGlobalContext } from '../context/globalContext';

function Home() {
    const { user, logoutUser, addExpense, getExpenses, expenses, deleteExpense } = useGlobalContext();
    const [form, setForm] = useState({ title: '', amount: '', category: 'Food', description: '', date: '' });

    useEffect(() => {
        if (user) getExpenses();
    }, [user, getExpenses]);

    const handleSubmit = (e) => {
        e.preventDefault();
        addExpense(form);
        setForm({ title: '', amount: '', category: 'Food', description: '', date: '' });
    };

    return (
        <div>
            <h1>Welcome, {user?.name}</h1>
            <button onClick={logoutUser}>Logout</button>

            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                <input type="text" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
                <button type="submit">Add Expense</button>
            </form>

            <h2>History</h2>
            {expenses.map(exp => (
                <div key={exp._id} style={{border: '1px solid black', margin: '5px', padding: '5px'}}>
                    <p>{exp.title} - ${exp.amount}</p>
                    <button onClick={() => deleteExpense(exp._id)}>Delete</button>
                </div>
            ))}
        </div>
    );
}
export default Home;