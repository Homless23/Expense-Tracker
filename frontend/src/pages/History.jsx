import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import DataTable from '../components/ui/DataTable';
import ChartCard from '../components/ui/ChartCard';
import SkeletonTable from '../components/ui/SkeletonTable';
import './DashboardUI.css';

const History = () => {
  const {
    error,
    historyItems,
    historyPagination,
    historyLoading,
    categories,
    expenses,
    getData,
    getExpenseHistory
  } = useGlobalContext();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    await getExpenseHistory({
      page,
      limit: 8,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      category: category !== 'All' ? category : undefined
    });
  }, [category, endDate, getExpenseHistory, page, startDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    getData();
  }, [getData]);

  const monthlyLimit = useMemo(
    () => categories.reduce((sum, item) => sum + Number(item.budget || 0), 0),
    [categories]
  );

  const thisMonthSpent = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((item) => {
        if ((item.type || 'expense') !== 'expense') return false;
        const date = new Date(item.date);
        if (Number.isNaN(date.getTime())) return false;
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  const limitPercent = monthlyLimit > 0 ? Math.min((thisMonthSpent / monthlyLimit) * 100, 100) : 0;

  const chartData = useMemo(() => {
    const now = new Date();
    const totalsByDay = new Map();
    expenses.forEach((item) => {
      if ((item.type || 'expense') !== 'expense') return;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return;
      const day = date.getDate();
      totalsByDay.set(day, (totalsByDay.get(day) || 0) + Number(item.amount || 0));
    });
    return Array.from(totalsByDay.keys()).sort((a, b) => a - b).map((day) => ({
      day,
      amount: totalsByDay.get(day)
    }));
  }, [expenses]);

  const rightPanel = (
    <>
      <div className="ui-card fade-in">
        <h3 className="section-heading">Spending Limits</h3>
        <p className="muted mt-4 mb-8">Monthly transaction limit</p>
        <strong className="stat-large">Rs.{Math.round(monthlyLimit).toLocaleString()}</strong>
        <p className="muted mt-8 mb-4">{limitPercent.toFixed(1)}%</p>
        <div className="budget-meter">
          <span style={{ width: `${limitPercent}%` }} />
        </div>
      </div>

      <ChartCard title="Expense this month">
        <div className="chart-box h-210">
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#64748b"
                fill="#e2e8f0"
                fillOpacity={0.8}
                strokeWidth={1.4}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </>
  );

  const columns = useMemo(() => ([
    { key: 'title', label: 'Transaction', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row) => new Date(row.date).toLocaleString()
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (row) => (
        <span className={(row.type || 'expense') === 'income' ? 'amount-income' : 'amount-expense'}>
          {(row.type || 'expense') === 'income' ? '+' : '-'}Rs {Number(row.amount || 0).toLocaleString()}
        </span>
      )
    }
  ]), []);

  return (
    <AppShell
      title="Transaction"
      subtitle="Filter, review, and monitor your spending stream"
      rightPanel={rightPanel}
    >
      {historyLoading ? <div className="inline-loading">Loading transactions...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="ui-card fade-in">
        <div className="form-grid cols-4 gap-bottom">
          <div className="form-field">
            <label>Start date</label>
            <input type="date" value={startDate} onChange={(e) => { setPage(1); setStartDate(e.target.value); }} />
          </div>
          <div className="form-field">
            <label>End date</label>
            <input type="date" value={endDate} onChange={(e) => { setPage(1); setEndDate(e.target.value); }} />
          </div>
          <div className="form-field">
            <label>Category</label>
            <select value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }}>
              <option value="All">All</option>
              {categories.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}
            </select>
          </div>
          <div className="form-field align-end">
            <button className="btn-secondary" onClick={() => { setPage(1); setStartDate(''); setEndDate(''); setCategory('All'); }}>Clear filter</button>
          </div>
        </div>

        {historyLoading ? <SkeletonTable rows={8} cols={4} /> : null}
        {!historyLoading ? (
          <DataTable
            columns={columns}
            data={historyItems}
            rowKey="_id"
            searchable
            searchPlaceholder="Search transactions..."
            filterKeys={['title', 'category']}
            initialSort={{ key: 'date', dir: 'desc' }}
            pageSize={8}
            emptyTitle="No transactions found"
            emptyDescription="Try a different filter or add your first transaction."
          />
        ) : null}
        <div className="pagination-bar">
          <span className="muted">Server page {historyPagination.page} of {historyPagination.totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>Prev server page</button>
          <button className="btn-secondary" onClick={() => setPage((p) => Math.min(p + 1, historyPagination.totalPages))} disabled={page >= historyPagination.totalPages}>Next server page</button>
        </div>
      </section>
    </AppShell>
  );
};

export default History;
