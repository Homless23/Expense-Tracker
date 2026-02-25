import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import DataTable from '../components/ui/DataTable';
import SkeletonTable from '../components/ui/SkeletonTable';
import { useGlobalContext } from '../context/globalContext';
import './DashboardUI.css';

const emptyForm = {
  amount: '',
  title: '',
  description: '',
  category: '',
  date: new Date().toISOString().split('T')[0]
};

const AddTransaction = () => {
  const {
    error,
    categories,
    historyItems,
    historyPagination,
    historyLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    getData,
    getExpenseHistory
  } = useGlobalContext();

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);

  const activeCategories = useMemo(
    () => categories.filter((item) => item.active !== false),
    [categories]
  );

  const fetchRows = useCallback(async () => {
    await getExpenseHistory({ page, limit: 10, type: 'expense' });
  }, [getExpenseHistory, page]);

  useEffect(() => {
    getData();
  }, [getData]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (!form.category && activeCategories.length) {
      setForm((prev) => ({ ...prev, category: activeCategories[0].name }));
    }
  }, [activeCategories, form.category]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      title: form.title.trim(),
      amount: Number(form.amount),
      description: form.description.trim(),
      category: form.category,
      date: form.date
    };
    if (!payload.title || !payload.category || payload.amount <= 0) return;

    let success = false;
    if (editingId) {
      success = await updateExpense(editingId, payload);
    } else {
      success = await addExpense(payload);
    }
    if (!success) return;

    setEditingId(null);
    setForm((prev) => ({ ...emptyForm, category: prev.category || '' }));
    if (editingId) {
      await fetchRows();
    } else if (page !== 1) {
      setPage(1);
    }
  };

  const onEdit = useCallback((item) => {
    setEditingId(item._id);
    setForm({
      amount: String(item.amount || ''),
      title: item.title || '',
      description: item.description || '',
      category: item.category || '',
      date: new Date(item.date).toISOString().slice(0, 10)
    });
  }, []);

  const onDelete = useCallback(async (id) => {
    const success = await deleteExpense(id);
    if (!success) return;
    await fetchRows();
  }, [deleteExpense, fetchRows]);

  const columns = useMemo(() => ([
    { key: 'title', label: 'Expense', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (row) => <span className="amount-expense">Rs.{Number(row.amount || 0).toLocaleString()}</span>
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row) => new Date(row.date).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="inline-actions">
          <button className="btn-secondary" onClick={() => onEdit(row)}>Edit</button>
          <button className="btn-danger" onClick={() => onDelete(row._id)}>Delete</button>
        </div>
      )
    }
  ]), [onDelete, onEdit]);

  return (
    <AppShell
      title="Create Expense Entry"
      subtitle="Add, edit, and manage your expense rows dynamically"
    >
      {historyLoading ? <div className="inline-loading">Loading expense entries...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="ui-card fade-in gap-bottom">
        <form onSubmit={onSubmit}>
          <div className="form-grid cols-4">
            <div className="form-field">
              <label>Expense</label>
              <input
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Description</label>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                {activeCategories.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-field transaction-textarea">
            <label>Details</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" type="submit">
              {editingId ? 'Update Entry' : 'Create'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm((prev) => ({ ...emptyForm, category: prev.category || '' }));
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="ui-card fade-in">
        <h3 className="section-heading">Expense Entries</h3>
        {historyLoading ? <SkeletonTable rows={8} cols={5} /> : null}
        {!historyLoading ? (
          <DataTable
            columns={columns}
            data={historyItems}
            rowKey="_id"
            searchable
            searchPlaceholder="Search expense entries..."
            filterKeys={['title', 'category', 'description']}
            initialSort={{ key: 'date', dir: 'desc' }}
            pageSize={10}
            emptyTitle="No expense entries found"
            emptyDescription="Create your first expense entry to start tracking."
          />
        ) : null}

        <div className="pagination-bar">
          <button className="btn-secondary" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>Prev</button>
          <span className="muted">Server page {historyPagination.page} of {historyPagination.totalPages}</span>
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.min(p + 1, historyPagination.totalPages))}
            disabled={page >= historyPagination.totalPages}
          >
            Next
          </button>
        </div>
      </section>
    </AppShell>
  );
};

export default AddTransaction;
