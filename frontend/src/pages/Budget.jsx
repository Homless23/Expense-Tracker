import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import './DashboardUI.css';

const Budget = () => {
  const getUrgencyColor = (spent, budget) => {
    const safeBudget = Number(budget || 0);
    if (safeBudget <= 0) return '#94a3b8';
    const ratio = Number(spent || 0) / safeBudget;
    if (ratio >= 1) return '#ef4444';
    if (ratio >= 0.8) return '#f97316';
    if (ratio >= 0.6) return '#f59e0b';
    return '#22c55e';
  };

  const {
    error,
    categories,
    expenses,
    loading,
    showToast,
    pushNotification,
    editBudget,
    updateCategory,
    deleteCategory,
    autoAllocateBudgets,
    getData
  } = useGlobalContext();

  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingsTarget, setSavingsTarget] = useState('');
  const [incomeOverride, setIncomeOverride] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [allocationPreview, setAllocationPreview] = useState(null);

  useEffect(() => {
    getData();
  }, [getData]);

  const expenseOnly = useMemo(
    () => expenses.filter((item) => (item.type || 'expense') === 'expense'),
    [expenses]
  );

  const budgetRows = useMemo(() => {
    return categories.map((category) => {
      const spent = expenseOnly
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const budget = Number(category.budget || 0);
      return {
        ...category,
        spent,
        remaining: budget - spent
      };
    });
  }, [categories, expenseOnly]);

  const totalBudget = budgetRows.reduce((sum, item) => sum + Number(item.budget || 0), 0);
  const totalSpent = budgetRows.reduce((sum, item) => sum + item.spent, 0);

  const chartData = budgetRows.map((item) => ({
    category: item.name,
    budget: Number(item.budget || 0),
    spent: item.spent
  }));

  const onStartEdit = (row) => {
    setEditingBudgetId(row._id);
    setEditingValue(String(row.budget || 0));
  };

  const onSaveBudget = async (row) => {
    const success = await editBudget(row._id, Number(editingValue) || 0);
    if (success) {
      setEditingBudgetId(null);
      setEditingValue('');
      await getData();
    }
  };

  const onRename = async (row) => {
    const next = window.prompt('Edit category name', row.name);
    if (!next || next.trim() === row.name) return;
    await updateCategory(row._id, { name: next.trim() });
    await getData();
  };

  const onDelete = async (id) => {
    const confirmed = window.confirm('Delete this category?');
    if (!confirmed) return;
    await deleteCategory(id);
    await getData();
  };

  const onAutoAllocate = async () => {
    setAllocating(true);
    const result = await autoAllocateBudgets({
      savingsTarget,
      income: incomeOverride,
      apply: true
    });

    if (result.success) {
      const payload = result.data || {};
      const suggestionCount = Array.isArray(payload.suggestions) ? payload.suggestions.length : 0;
      if (!suggestionCount) {
        showToast('No eligible categories found to auto-allocate.', { type: 'warning' });
      } else {
        showToast('Budgets auto-allocated successfully', { type: 'success' });
        pushNotification(`Auto budget set: Rs.${Math.round(payload.spendableBudget || 0).toLocaleString()} spendable`, { type: 'info' });
      }
      await getData({ force: true });
    }
    setAllocating(false);
  };

  const onPreviewAllocate = async () => {
    setPreviewing(true);
    const result = await autoAllocateBudgets({
      savingsTarget,
      income: incomeOverride,
      apply: false
    });
    if (result.success) {
      setAllocationPreview(result.data || null);
      showToast('Preview ready. Review suggestions before applying.', { type: 'info' });
    }
    setPreviewing(false);
  };

  const clearPreview = () => {
    setAllocationPreview(null);
  };

  const rightPanel = (
    <>
      <div className="ui-card fade-in">
        <h3 className="section-heading">Total monthly expenditures</h3>
        <div className="chart-box h-230">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="spent">
                {chartData.map((entry) => (
                  <Cell key={`spent-${entry.category}`} fill={getUrgencyColor(entry.spent, entry.budget)} />
                ))}
              </Bar>
              <Bar dataKey="budget" fill="#cbd5e1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ui-card fade-in">
        <h3 className="section-heading">Remaining Budget</h3>
        <div className="budget-list mt-8">
          {budgetRows.map((row) => (
            <div key={row._id} className="budget-item">
              <strong>{row.name}</strong>
              <small>Rs.{Math.round(row.remaining).toLocaleString()} of {Math.round(row.budget || 0).toLocaleString()}</small>
              <div className="budget-meter">
                <span
                  style={{
                    width: `${Math.min((Number(row.spent || 0) / Math.max(Number(row.budget || 0), 1)) * 100, 100)}%`,
                    background: getUrgencyColor(row.spent, row.budget)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <AppShell
      title="Total Monthly Budget"
      subtitle={`Rs.${Math.round(totalBudget).toLocaleString()} budgeted, Rs.${Math.round(totalSpent).toLocaleString()} spent`}
      rightPanel={rightPanel}
    >
      {loading ? <div className="inline-loading">Refreshing budget data...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="ui-card fade-in">
        <h3 className="section-heading">Category Budget</h3>
        <div className="stack-row budget-controls">
          <input
            className="input-md"
            type="number"
            placeholder="Monthly income (optional)"
            value={incomeOverride}
            onChange={(e) => setIncomeOverride(e.target.value)}
          />
          <input
            className="input-md"
            type="number"
            placeholder="Savings target (optional)"
            value={savingsTarget}
            onChange={(e) => setSavingsTarget(e.target.value)}
          />
          <button className="btn-primary" onClick={onAutoAllocate} disabled={allocating}>
            {allocating ? 'Applying...' : 'Auto-Allocate Budgets'}
          </button>
          <button className="btn-secondary" onClick={onPreviewAllocate} disabled={previewing}>
            {previewing ? 'Preparing...' : 'Preview Allocation'}
          </button>
          {allocationPreview ? (
            <button className="btn-secondary" onClick={clearPreview}>Clear Preview</button>
          ) : null}
        </div>

        {allocationPreview ? (
          <div className="gap-bottom">
            <div className="budget-preview-summary">
              Income: Rs.{Math.round(allocationPreview.monthlyIncome || 0).toLocaleString()} | Savings: Rs.{Math.round(allocationPreview.savingsTarget || 0).toLocaleString()} | Spendable: Rs.{Math.round(allocationPreview.spendableBudget || 0).toLocaleString()}
            </div>
            <div className="budget-preview-apply">
              <button
                className="btn-primary"
                onClick={async () => {
                  await onAutoAllocate();
                  setAllocationPreview(null);
                }}
                disabled={allocating}
              >
                {allocating ? 'Applying...' : 'Apply These Suggestions'}
              </button>
            </div>
            <div className="table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Current</th>
                    <th>Suggested</th>
                    <th>Delta</th>
                    <th>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {(allocationPreview.suggestions || []).map((item) => {
                    const delta = Number(item.suggestedBudget || 0) - Number(item.currentBudget || 0);
                    return (
                      <tr key={item._id}>
                        <td>{item.name}</td>
                        <td>Rs.{Math.round(item.currentBudget || 0).toLocaleString()}</td>
                        <td>Rs.{Math.round(item.suggestedBudget || 0).toLocaleString()}</td>
                        <td style={{ color: delta >= 0 ? '#166534' : '#b91c1c' }}>
                          {delta >= 0 ? '+' : ''}Rs.{Math.round(delta).toLocaleString()}
                        </td>
                        <td>{Number(item.weightPercent || 0).toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Last Updated</th>
                <th>Budget</th>
                <th>Spent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {budgetRows.map((row) => (
                <tr key={row._id}>
                  <td>{row.name}</td>
                  <td>{new Date(row.date || row.updatedAt || Date.now()).toLocaleDateString()}</td>
                  <td>
                    {editingBudgetId === row._id ? (
                      <div className="budget-inline-edit">
                        <input
                          className="input-md"
                          type="number"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                        />
                        <button className="btn-primary" onClick={() => onSaveBudget(row)}>Save</button>
                      </div>
                    ) : (
                      <>Rs.{Number(row.budget || 0).toLocaleString()}</>
                    )}
                  </td>
                  <td>Rs.{Math.round(row.spent).toLocaleString()}</td>
                  <td>
                    <div className="inline-actions">
                      <button className="btn-secondary" onClick={() => onStartEdit(row)}>Edit</button>
                      <button className="btn-secondary" onClick={() => onRename(row)}>Rename</button>
                      <button className="btn-danger" onClick={() => onDelete(row._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
};

export default Budget;
