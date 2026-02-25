import React, { useEffect, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import KpiCard from '../components/ui/KpiCard';
import ChartCard from '../components/ui/ChartCard';
import EmptyState from '../components/ui/EmptyState';
import { exportExpensesToCSV } from '../utils/export';
import './DashboardUI.css';

const PIE_COLORS = ['#94a3b8', '#64748b', '#cbd5e1', '#475569', '#e2e8f0', '#334155', '#0f172a'];

const Home = () => {
  const navigate = useNavigate();
  const {
    user,
    expenses,
    categories,
    insights,
    recurringAlerts,
    loading,
    error,
    getData,
    processRecurringDue
  } = useGlobalContext();

  useEffect(() => {
    getData();
  }, [getData]);

  const expenseItems = useMemo(
    () => expenses.filter((item) => (item.type || 'expense') === 'expense'),
    [expenses]
  );

  const summaryCards = useMemo(() => {
    const now = new Date();
    const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const currentByCategory = {};
    const prevByCategory = {};

    expenseItems.forEach((item) => {
      const amount = Number(item.amount || 0);
      const itemDate = new Date(item.date);
      if (!Number.isFinite(amount) || Number.isNaN(itemDate.getTime())) return;

      if (itemDate >= startCurrent) {
        currentByCategory[item.category] = (currentByCategory[item.category] || 0) + amount;
      } else if (itemDate >= startPrev && itemDate <= endPrev) {
        prevByCategory[item.category] = (prevByCategory[item.category] || 0) + amount;
      }
    });

    return Object.keys(currentByCategory)
      .map((categoryName) => {
        const current = currentByCategory[categoryName] || 0;
        const previous = prevByCategory[categoryName] || 0;
        const change = previous > 0 ? ((current - previous) / previous) * 100 : 100;
        const diff = Math.abs(current - previous);
        return {
          categoryName,
          current,
          change,
          previous,
          deltaLabel: previous > 0
            ? `${Math.round(diff).toLocaleString()} ${current >= previous ? 'more' : 'less'}`
            : 'N/A'
        };
      })
      .sort((a, b) => b.current - a.current)
      .slice(0, 4);
  }, [expenseItems]);

  const weeklyChartData = useMemo(() => {
    const sorted = [...expenseItems].sort((a, b) => new Date(a.date) - new Date(b.date));
    const map = {};
    sorted.forEach((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + Number(item.amount || 0);
    });
    return Object.keys(map).slice(-8).map((key) => ({
      date: key,
      amount: map[key]
    }));
  }, [expenseItems]);

  const recentTransactions = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8),
    [expenses]
  );

  const pieData = useMemo(() => {
    const totals = {};
    expenseItems.forEach((item) => {
      const amount = Number(item.amount || 0);
      if (!Number.isFinite(amount)) return;
      totals[item.category] = (totals[item.category] || 0) + amount;
    });
    return Object.keys(totals).map((name) => ({ name, value: totals[name] }));
  }, [expenseItems]);

  const totalPie = useMemo(() => pieData.reduce((sum, item) => sum + Number(item.value || 0), 0), [pieData]);

  const chartByCategory = useMemo(() => {
    return (categories || []).map((category) => {
      const spent = expenseItems
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return {
        category: category.name,
        budget: Number(category.budget || 0),
        spent
      };
    });
  }, [categories, expenseItems]);

  const exportDashboard = () => {
    exportExpensesToCSV(
      expenseItems,
      `dashboard_expenses_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <AppShell
      title={`Hello, ${user?.name || 'User'}!`}
      subtitle="Here's your analytic details"
    >
      {loading ? <div className="inline-loading">Refreshing dashboard data...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="dashboard-home-grid">
        <div className="ui-card fade-in">
          <h3 className="section-heading">Top Expense Categories</h3>
          <div className="dashboard-kpi-grid">
            {summaryCards.length ? summaryCards.map((item) => (
              <KpiCard
                key={item.categoryName}
                title={`${item.categoryName} Expense`}
                value={Math.round(item.current).toLocaleString()}
                trend={item.change}
                meta={item.deltaLabel}
                onViewReport={() => navigate(`/reports?category=${encodeURIComponent(item.categoryName)}`)}
              />
            )) : <EmptyState title="No spending yet" description="Your category trends will appear once transactions are added." />}
          </div>
        </div>

        <ChartCard
          title="Total Expenditure"
          actions={(
            <button type="button" className="btn-primary shell-top-btn" onClick={exportDashboard}>
              Export
            </button>
          )}
        >
          <div className="chart-box h-230">
            <ResponsiveContainer>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="1 0" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar
                  dataKey="amount"
                  name="Expenses"
                  fill="#64748b"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="dashboard-home-grid">
        <div className="ui-card fade-in">
          <h3 className="section-heading">Recent Transactions</h3>
          {recentTransactions.length ? (
            <div className="table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Date &amp; Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((item) => (
                    <tr key={item._id}>
                      <td>{item.title}</td>
                      <td>
                        <span className={item.type === 'income' ? 'amount-income' : 'amount-expense'}>
                          {item.type === 'income' ? '+' : '-'}{Number(item.amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td>{item.category}</td>
                      <td>{new Date(item.date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No recent transactions" description="Your latest transaction list will appear here." />
          )}
        </div>

        <div className="ui-card fade-in">
          <h3 className="section-heading">Category Split</h3>
          <div className="chart-box h-250">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label={false}
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, ctx) => {
                    const pct = totalPie > 0 ? ((Number(value || 0) / totalPie) * 100).toFixed(1) : '0.0';
                    return [`Rs ${Number(value || 0).toLocaleString()} (${pct}%)`, String(ctx?.payload?.name || 'Spent')];
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-box h-210">
            <ResponsiveContainer>
              <BarChart data={chartByCategory}>
                <CartesianGrid strokeDasharray="1 0" stroke="#e5e7eb" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="spent" fill="#64748b" />
                <Bar dataKey="budget" fill="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="dashboard-home-grid single-column">
        <div className="ui-card fade-in">
          <h3 className="section-heading">Smart Insights</h3>
          <div className="insights-list">
            {insights?.insights?.length ? insights.insights.map((item) => (
              <div key={item.code} className={`insight-item-card ${item.severity || 'info'}`}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            )) : <p className="empty-hint">Insights will appear after more activity.</p>}
          </div>

          <h3 className="section-heading mt-12">Recurring Bills Due</h3>
          {recurringAlerts?.dueCount > 0 ? (
            <div className="recurring-due-list">
              {recurringAlerts.items.slice(0, 5).map((item) => (
                <div key={item._id} className="recurring-due-item">
                  <div>
                    <strong>{item.title}</strong>
                    <small>{new Date(item.nextDueDate).toLocaleDateString()} - {item.frequency}</small>
                  </div>
                  <span>Rs {Math.round(item.amount).toLocaleString()}</span>
                </div>
              ))}
              <button className="btn-primary mt-8" onClick={processRecurringDue}>
                Process Auto Due Bills
              </button>
            </div>
          ) : (
            <p className="empty-hint">No due recurring bills right now.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
};

export default Home;
