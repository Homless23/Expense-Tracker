import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGlobalContext } from '../context/globalContext';

const EXPENSE_CATEGORY_FALLBACK = ['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Tools', 'Other'];
const INCOME_CATEGORY_FALLBACK = ['Salary', 'Freelance', 'Investments', 'Bonus', 'Other'];

const AddTransactionModal = ({ isOpen, onClose, onSuccess }) => {
  const { categories, addTransaction, error, setError, showToast } = useGlobalContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'expense',
    title: '',
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0],
    recurringEnabled: false,
    recurringFrequency: 'monthly',
    recurringAutoCreate: false
  });

  const categoryOptions = useMemo(() => {
    const defaultOptions = form.type === 'income' ? INCOME_CATEGORY_FALLBACK : EXPENSE_CATEGORY_FALLBACK;
    const available = categories.map((c) => c.name).filter((name) => {
      const lower = name.toLowerCase();
      if (form.type === 'income') {
        return ['salary', 'freelance', 'investments', 'bonus', 'other'].includes(lower);
      }
      return !['salary', 'freelance', 'investments', 'bonus'].includes(lower);
    });
    const merged = [...new Set([...available, ...defaultOptions])];
    return merged.length ? merged : defaultOptions;
  }, [categories, form.type]);

  if (!isOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setIsSubmitting(true);
    const success = await addTransaction({
      type: form.type,
      title: form.title.trim(),
      amount,
      category: form.category,
      description: form.description.trim(),
      date: form.date,
      recurring: {
        enabled: form.recurringEnabled,
        frequency: form.recurringFrequency,
        autoCreate: form.recurringAutoCreate
      }
    });
    setIsSubmitting(false);
    if (!success) return;
    const signedAmount = `${form.type === 'income' ? '+' : '-'}Rs ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    showToast(`Successfully added "${form.title.trim()}" (${signedAmount})`, { type: 'success', duration: 2600 });
    if (onSuccess) onSuccess();
    onClose();
    setForm((prev) => ({
      ...prev,
      title: '',
      amount: '',
      description: '',
      recurringEnabled: false,
      recurringAutoCreate: false
    }));
  };

  const modalContent = (
    <div className="wizard-overlay transaction-modal-overlay">
      <div className="wizard-card transaction-modal">
        <h3 className="modal-title">Add Transaction</h3>
        {error && <div className="alert-error">{error}</div>}

        <form className="stacked-form" onSubmit={submit}>
          <div className="row">
            <select
              className="input"
              value={form.type}
              onChange={(e) => {
                const type = e.target.value;
                const nextCategory = type === 'income' ? 'Salary' : 'Food';
                setForm((p) => ({ ...p, type, category: nextCategory }));
              }}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input
              className="input"
              placeholder={form.type === 'income' ? 'Income title' : 'Expense title'}
              value={form.title}
              required
              onChange={(e) => {
                if (error) setError(null);
                setForm((p) => ({ ...p, title: e.target.value }));
              }}
            />
          </div>

          <div className="amount-hero">
            <label className="amount-label">Amount</label>
            <input
              className="input amount-input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              required
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            />
          </div>

          <div className="row">
            <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <input className="input" type="date" value={form.date} required onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          </div>

          <input className="input" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />

          {form.type === 'expense' && (
            <div className="row recurring-row">
              <label className="check-wrap">
                <input
                  type="checkbox"
                  checked={form.recurringEnabled}
                  onChange={(e) => setForm((p) => ({ ...p, recurringEnabled: e.target.checked }))}
                />
                <span>Recurring</span>
              </label>
              <label className="check-wrap">
                <input
                  type="checkbox"
                  disabled={!form.recurringEnabled}
                  checked={form.recurringAutoCreate}
                  onChange={(e) => setForm((p) => ({ ...p, recurringAutoCreate: e.target.checked }))}
                />
                <span>Auto-create due entries</span>
              </label>
              <select
                className="input"
                disabled={!form.recurringEnabled}
                value={form.recurringFrequency}
                onChange={(e) => setForm((p) => ({ ...p, recurringFrequency: e.target.value }))}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          <button className="primary-btn full-width" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : `Add ${form.type === 'income' ? 'Income' : 'Expense'}`}
          </button>
          <button className="ghost-btn subtle" type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AddTransactionModal;
