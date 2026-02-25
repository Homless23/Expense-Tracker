import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import './DashboardUI.css';

const Categories = () => {
  const getUrgencyColorByPercent = (percentValue) => {
    const p = Number(percentValue || 0);
    if (p >= 100) return '#ef4444';
    if (p >= 80) return '#f97316';
    if (p >= 60) return '#f59e0b';
    return '#22c55e';
  };

  const {
    error,
    loading,
    showToast,
    categorySummary,
    addCategory,
    getData,
    toggleCategoryStatus,
    updateCategory,
    deleteCategory,
    cleanupDuplicateCategories
  } = useGlobalContext();
  const [newCategory, setNewCategory] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    getData();
  }, [getData]);

  const rows = useMemo(
    () => Array.isArray(categorySummary.items) ? categorySummary.items : [],
    [categorySummary.items]
  );

  const onCreate = async () => {
    if (!newCategory.trim()) return;
    const success = await addCategory(newCategory.trim(), Number(newBudget) || 0);
    if (!success) return;
    setNewCategory('');
    setNewBudget('');
    await getData();
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

  const onCleanupDuplicates = async () => {
    setCleaning(true);
    const result = await cleanupDuplicateCategories();
    if (result.success) {
      const removed = Number(result?.data?.removed || 0);
      showToast(`Cleanup done: ${removed} duplicate ${removed === 1 ? 'entry' : 'entries'} removed`, { type: 'success' });
      await getData({ force: true });
    }
    setCleaning(false);
  };

  return (
    <AppShell
      title="Categories"
      subtitle="Manage category allocation and active status"
    >
      {loading ? <div className="inline-loading">Refreshing categories...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="ui-card categories-page-card">
        <div className="categories-toolbar">
          <h3>Categories</h3>
          <div className="categories-create-inline">
            <label>Category name:</label>
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <input type="number" min="0" placeholder="Budget" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} />
            <button className="btn-primary" onClick={onCreate}>Create</button>
            <button className="btn-secondary" onClick={onCleanupDuplicates} disabled={cleaning}>
              {cleaning ? 'Cleaning...' : 'Cleanup'}
            </button>
          </div>
        </div>

        <table className="dashboard-table categories-table">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Expense</th>
              <th>Active Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id}>
                <td className="categories-name-cell">
                  <span className="categories-dot" />
                  {row.name}
                </td>
                <td>
                  <div className="categories-progress">
                    <div className="budget-meter categories-meter">
                      <span
                        style={{
                          width: `${Math.min(row.expensePercent || 0, 100)}%`,
                          background: getUrgencyColorByPercent(row.expensePercent)
                        }}
                      />
                    </div>
                    <span>{Math.round(row.expensePercent || 0)}%</span>
                  </div>
                </td>
                <td>
                  <label className="categories-checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={row.active !== false}
                      onChange={(e) => toggleCategoryStatus(row._id, e.target.checked)}
                    />
                  </label>
                </td>
                <td>
                  <div className="inline-actions">
                    <button className="btn-secondary categories-pill-btn" onClick={() => onRename(row)}>Edit</button>
                    <button className="btn-danger categories-pill-btn" onClick={() => onDelete(row._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
};

export default Categories;
