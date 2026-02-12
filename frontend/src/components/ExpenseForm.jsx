import React, { useState, useContext } from 'react';
import { GlobalContext } from '../context/globalContext';

const CURRENCY = { symbol: 'Rs' };

const ExpenseForm = () => {
  const { addExpense, addCategory, categories } = useContext(GlobalContext);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food'); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Category Mode State
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !title) return;

    setIsSubmitting(true);

    const newTransaction = {
      title,
      amount: parseFloat(amount),
      category: isCreatingCat ? newCatName : category,
      date: date
    };

    const result = await addExpense(newTransaction);

    if (result.success) {
      setTitle('');
      setAmount('');
      setIsSubmitting(false);
    } else {
      alert("Failed to add expense.");
      setIsSubmitting(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;

    const success = await addCategory(newCatName);
    if (success) {
        setCategory(newCatName);
        setIsCreatingCat(false);
        setNewCatName('');
    } else {
        alert("Failed to create category");
    }
  };

  const uniqueCategories = Array.from(new Set(["Food", "Transport", "Entertainment", "Bills", "Health", "Shopping", ...categories.map(c => c.name || c)]));

  // --- STYLES ---
  
  // The Base Input Style (for standard text fields)
  const baseInputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 16px',
    fontSize: '1rem',
    background: '#27272a', // Zinc-800
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s',
  };

  // Helper for focus state
  const handleFocus = (e) => {
    e.target.style.borderColor = '#3b82f6';
    e.target.style.background = '#09090b'; // Darken on focus
  };
  
  const handleBlur = (e) => {
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    e.target.style.background = '#27272a';
  };

  return (
    <div className="card" style={{ 
        background: '#18181b', // Zinc-900
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '2rem',
        maxWidth: '500px', 
        margin: '0 auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    }}>
      <h3 style={{ margin: '0 0 1.5rem 0', textAlign: 'center', fontSize: '1.25rem', color: '#fff' }}>Log New Expense</h3>
      
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* 1. AMOUNT INPUT (THE FIX: Flexbox Wrapper) */}
        <div>
           {/* This DIV looks like the input. The actual input inside is transparent. */}
           <div style={{ 
               display: 'flex', 
               alignItems: 'center', 
               background: '#09090b', // Deep black for contrast
               border: '1px solid rgba(255,255,255,0.15)',
               borderRadius: '16px',
               padding: '1rem 1.5rem',
               transition: 'border-color 0.2s'
           }}>
               <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#71717a', marginRight: '0.5rem' }}>
                   {CURRENCY.symbol}
               </span>
               <input 
                   type="number" 
                   placeholder="0" 
                   value={amount}
                   onChange={(e) => setAmount(e.target.value)}
                   autoFocus
                   style={{
                       background: 'transparent',
                       border: 'none',
                       color: '#fff',
                       fontSize: '2.5rem', // Big bold number
                       fontWeight: '700',
                       width: '100%',
                       outline: 'none'
                   }}
               />
           </div>
        </div>

        {/* 2. DESCRIPTION */}
        <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa', fontSize: '0.85rem' }}>Description</label>
            <input 
                type="text"
                placeholder="e.g. Grocery Shopping" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                style={baseInputStyle}
                onFocus={handleFocus} onBlur={handleBlur}
            />
        </div>
        
        {/* 3. ROW: CATEGORY + DATE */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          
          {/* CATEGORY */}
          <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa', fontSize: '0.85rem' }}>Category</label>
              
              {isCreatingCat ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                        type="text" 
                        placeholder="Name"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        autoFocus
                        style={{ ...baseInputStyle, padding: '12px' }}
                    />
                    <button type="button" onClick={handleSaveCategory} className="icon-btn" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', minWidth: '42px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
                    <button type="button" onClick={() => setIsCreatingCat(false)} className="icon-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', minWidth: '42px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                        style={{ ...baseInputStyle, appearance: 'none', cursor: 'pointer' }}
                    >
                        {uniqueCategories.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                        ))}
                    </select>
                    
                    <button 
                        type="button" 
                        onClick={() => setIsCreatingCat(true)}
                        style={{ 
                            minWidth: '48px', 
                            background: '#27272a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        +
                    </button>
                </div>
              )}
          </div>

          {/* DATE */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa', fontSize: '0.85rem' }}>Date</label>
            <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...baseInputStyle, cursor: 'pointer' }}
                onFocus={handleFocus} onBlur={handleBlur}
            />
          </div>
        </div>

        {/* 4. SUBMIT BUTTON */}
        <button 
            type="submit" 
            className="btn-primary" 
            disabled={isSubmitting}
            style={{ 
                marginTop: '1.5rem', 
                width: '100%', 
                padding: '16px', 
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                background: 'var(--brand-color)',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}
        >
          {isSubmitting ? "Saving..." : "Add Transaction"}
        </button>

      </form>
    </div>
  );
};

export default ExpenseForm;