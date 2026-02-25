import React, { useCallback, useContext, useMemo, useState } from 'react';
import api from '../services/api';

const DEFAULT_CATEGORIES = [
  { name: 'Food', budget: 0 },
  { name: 'Transport', budget: 0 },
  { name: 'Bills', budget: 0 },
  { name: 'Shopping', budget: 0 },
  { name: 'Entertainment', budget: 0 },
  { name: 'Health', budget: 0 },
  { name: 'Other', budget: 0 },
  { name: 'Salary', budget: 0 },
  { name: 'Freelance', budget: 0 },
  { name: 'Investments', budget: 0 }
];

const normalizeCategoryName = (value) => String(value || '').trim().toLowerCase();

const dedupeCategoriesByName = (items) => {
  const list = Array.isArray(items) ? items : [];
  const map = new Map();

  list.forEach((item) => {
    const key = normalizeCategoryName(item?.name);
    if (!key) return;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      return;
    }

    const pickCurrent =
      (existing.active === false && item.active !== false) ||
      Number(item?.date || item?.updatedAt || 0) > Number(existing?.date || existing?.updatedAt || 0);
    if (pickCurrent) {
      map.set(key, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
};

export const GlobalContext = React.createContext();

export const GlobalProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    try {
      const raw = localStorage.getItem('notifications');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categorySummary, setCategorySummary] = useState({ items: [], totals: { totalSpent: 0, totalBudget: 0 } });
  const [goals, setGoals] = useState([]);
  const [insights, setInsights] = useState({ metrics: null, insights: [] });
  const [recurringAlerts, setRecurringAlerts] = useState({ dueCount: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(0);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastTimeoutId, setToastTimeoutId] = useState(null);

  const pushNotification = useCallback((message, options = {}) => {
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message: String(message || ''),
      type: options.type || 'info',
      createdAt: new Date().toISOString(),
      read: false
    };
    setNotifications((prev) => {
      const next = [item, ...prev].slice(0, 60);
      localStorage.setItem('notifications', JSON.stringify(next));
      return next;
    });
  }, []);

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem('notifications', JSON.stringify(next));
      return next;
    });
  }, []);

  const hideToast = useCallback(() => {
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      setToastTimeoutId(null);
    }
    setToast(null);
  }, [toastTimeoutId]);

  const showToast = useCallback((message, options = {}) => {
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      setToastTimeoutId(null);
    }

    const nextToast = {
      message,
      type: options.type || 'success',
      actionLabel: options.actionLabel || null,
      onAction: options.onAction || null
    };
    setToast(nextToast);

    const duration = Number(options.duration ?? 2500);
    if (duration > 0) {
      const id = setTimeout(() => {
        setToast(null);
        setToastTimeoutId(null);
      }, duration);
      setToastTimeoutId(id);
    }
  }, [toastTimeoutId]);

  const getApiErrorMessage = useCallback((err, fallback) => {
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.response?.data?.error) return err.response.data.error;
    if (Array.isArray(err?.response?.data?.errors) && err.response.data.errors[0]?.msg) {
      return err.response.data.errors[0].msg;
    }
    if (err?.code === 'ERR_NETWORK') {
      return 'Cannot reach backend API. Ensure backend is running on http://localhost:5000.';
    }
    return fallback;
  }, []);

  const registerUser = useCallback(async (userData) => {
    try {
      setError(null);
      const res = await api.post('/auth/register', userData);
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      pushNotification('New account registered successfully', { type: 'success' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration Failed'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const loginUser = useCallback(async (userData) => {
    try {
      setError(null);
      const res = await api.post('/auth/login', userData);
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      pushNotification('Signed in successfully', { type: 'success' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login Failed'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const logoutUser = useCallback(() => {
    localStorage.removeItem('user');
    setUser(null);
    setExpenses([]);
    setHistoryItems([]);
    setHistoryPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
    setCategories([]);
    setGoals([]);
    setInsights({ metrics: null, insights: [] });
    setRecurringAlerts({ dueCount: 0, items: [] });
    setError(null);
    pushNotification('Signed out', { type: 'warning' });
  }, [pushNotification]);

  const getCurrentUser = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/auth/me');
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching profile'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage]);

  const updateProfile = useCallback(async ({ name, avatarDataUrl, removeAvatar } = {}) => {
    try {
      setError(null);
      const payload = { name };
      if (typeof avatarDataUrl !== 'undefined') {
        payload.avatarDataUrl = avatarDataUrl;
      }
      if (typeof removeAvatar !== 'undefined') {
        payload.removeAvatar = Boolean(removeAvatar);
      }

      const res = await api.put('/auth/profile', payload);
      const nextUser = {
        ...(user || {}),
        name: res.data?.name || name || user?.name,
        email: res.data?.email || user?.email,
        avatarDataUrl: typeof res.data?.avatarDataUrl === 'string'
          ? res.data.avatarDataUrl
          : (removeAvatar ? '' : (avatarDataUrl ?? user?.avatarDataUrl ?? ''))
      };
      setUser(nextUser);
      localStorage.setItem('user', JSON.stringify(nextUser));
      pushNotification('Profile updated', { type: 'success' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating profile'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, pushNotification, user]);

  const updatePassword = useCallback(async ({ currentPassword, newPassword }) => {
    try {
      setError(null);
      const res = await api.put('/auth/password', { currentPassword, newPassword });
      pushNotification('Password updated', { type: 'success' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating password'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, pushNotification]);

  const getExpenses = useCallback(async () => {
    try {
      const res = await api.get('/v1/get-expenses');
      if (Array.isArray(res.data)) {
        setExpenses(res.data);
      } else if (Array.isArray(res.data?.items)) {
        setExpenses(res.data.items);
      } else {
        setExpenses([]);
      }
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching expenses'));
      return false;
    }
  }, [getApiErrorMessage]);

  const getExpenseHistory = useCallback(async (params = {}) => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/v1/get-expenses', { params });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      const pagination = res.data?.pagination || {
        page: Number(params.page) || 1,
        limit: Number(params.limit) || 10,
        total: items.length,
        totalPages: 1
      };
      setHistoryItems(items);
      setHistoryPagination(pagination);
      return { success: true, items, pagination };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching history'));
      return {
        success: false,
        items: [],
        pagination: {
          page: Number(params.page) || 1,
          limit: Number(params.limit) || 10,
          total: 0,
          totalPages: 1
        }
      };
    } finally {
      setHistoryLoading(false);
    }
  }, [getApiErrorMessage]);

  const addExpense = useCallback(async (expense) => {
    try {
      setError(null);
      const res = await api.post('/v1/add-expense', expense);
      const created = res?.data;
      if (created && created._id) {
        setExpenses((prev) => [created, ...prev.filter((item) => item._id !== created._id)]);
        setHistoryItems((prev) => {
          const safe = Array.isArray(prev) ? prev : [];
          if (Number(historyPagination.page || 1) !== 1) return safe;
          const limit = Number(historyPagination.limit) || 10;
          return [created, ...safe.filter((item) => item._id !== created._id)].slice(0, limit);
        });
        setHistoryPagination((prev) => {
          const nextTotal = Number(prev?.total || 0) + 1;
          const limit = Number(prev?.limit || 10);
          return {
            ...prev,
            total: nextTotal,
            totalPages: Math.max(Math.ceil(nextTotal / limit), 1)
          };
        });
      }
      pushNotification(`Expense added: ${expense.title}`, { type: 'success' });
      return created || true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error adding expense'));
      return false;
    }
  }, [getApiErrorMessage, historyPagination.limit, historyPagination.page, pushNotification]);

  const addTransaction = addExpense;

  const deleteExpense = useCallback(async (id) => {
    try {
      setError(null);
      await api.delete(`/v1/delete-expense/${id}`);
      await getExpenses();
      pushNotification('Expense deleted', { type: 'warning' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error deleting expense'));
      return false;
    }
  }, [getApiErrorMessage, getExpenses, pushNotification]);

  const updateExpense = useCallback(async (id, payload) => {
    try {
      setError(null);
      await api.put(`/v1/update-expense/${id}`, payload);
      await getExpenses();
      pushNotification(`Expense updated: ${payload?.title || 'item'}`, { type: 'info' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating expense'));
      return false;
    }
  }, [getApiErrorMessage, getExpenses, pushNotification]);

  const generateRecurringExpense = useCallback(async (id) => {
    try {
      setError(null);
      const res = await api.post(`/v1/generate-recurring/${id}`);
      await getExpenses();
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error generating recurring expense'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, getExpenses]);

  const addCategory = useCallback(async (name, budget = 0) => {
    const cleanedName = String(name || '').trim();
    if (!cleanedName) return false;

    try {
      setError(null);
      const res = await api.post('/v1/categories/add', { name: cleanedName, budget: Number(budget) || 0, active: true });
      setCategories((prev) => dedupeCategoriesByName([...prev, res.data]));
      pushNotification(`Category created: ${cleanedName}`, { type: 'success' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error adding category'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const getCategories = useCallback(async () => {
    try {
      const res = await api.get('/v1/categories');
      setCategories(dedupeCategoriesByName(res.data));
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching categories'));
      return false;
    }
  }, [getApiErrorMessage]);

  const getCategorySummary = useCallback(async () => {
    try {
      const res = await api.get('/v1/categories/summary');
      const payload = res?.data || {};
      setCategorySummary({
        items: Array.isArray(payload.items) ? payload.items : [],
        totals: payload.totals || { totalSpent: 0, totalBudget: 0 }
      });
      return true;
    } catch (err) {
      setCategorySummary({ items: [], totals: { totalSpent: 0, totalBudget: 0 } });
      return true;
    }
  }, []);

  const getGoals = useCallback(async () => {
    try {
      const res = await api.get('/v1/goals');
      setGoals(Array.isArray(res.data) ? res.data : []);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching goals'));
      return false;
    }
  }, [getApiErrorMessage]);

  const createGoal = useCallback(async (payload) => {
    try {
      setError(null);
      const res = await api.post('/v1/goals', payload);
      setGoals((prev) => [res.data, ...prev]);
      pushNotification(`Goal created: ${res?.data?.title || payload?.title || 'goal'}`, { type: 'success' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error creating goal'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, pushNotification]);

  const updateGoal = useCallback(async (id, payload) => {
    try {
      setError(null);
      const res = await api.put(`/v1/goals/${id}`, payload);
      setGoals((prev) => prev.map((goal) => (goal._id === id ? res.data : goal)));
      pushNotification(`Goal updated: ${res?.data?.title || 'goal'}`, { type: 'info' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating goal'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, pushNotification]);

  const deleteGoal = useCallback(async (id) => {
    try {
      setError(null);
      await api.delete(`/v1/goals/${id}`);
      setGoals((prev) => prev.filter((goal) => goal._id !== id));
      pushNotification('Goal deleted', { type: 'warning' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error deleting goal'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const getInsights = useCallback(async () => {
    try {
      const res = await api.get('/v1/insights');
      const payload = res?.data || {};
      setInsights({
        metrics: payload.metrics || null,
        insights: Array.isArray(payload.insights) ? payload.insights : []
      });
      return true;
    } catch (err) {
      setInsights({ metrics: null, insights: [] });
      return true;
    }
  }, []);

  const getRecurringAlerts = useCallback(async () => {
    try {
      const res = await api.get('/v1/recurring-alerts');
      const payload = res?.data || {};
      const dueCount = Number(payload.dueCount || 0);
      const items = Array.isArray(payload.items) ? payload.items : [];
      setRecurringAlerts({ dueCount, items });
      if (dueCount > 0) {
        const alertKey = `due_${dueCount}_${items[0]?._id || 'x'}`;
        if (localStorage.getItem('last_due_alert_key') !== alertKey) {
          localStorage.setItem('last_due_alert_key', alertKey);
          pushNotification(`${dueCount} recurring bill${dueCount > 1 ? 's are' : ' is'} due`, { type: 'warning' });
        }
      }
      return true;
    } catch (err) {
      setRecurringAlerts({ dueCount: 0, items: [] });
      return true;
    }
  }, [pushNotification]);

  const processRecurringDue = useCallback(async () => {
    try {
      setError(null);
      const res = await api.post('/v1/process-recurring-due');
      const createdCount = Number(res?.data?.createdCount || 0);
      if (createdCount > 0) {
        pushNotification(`Auto-created ${createdCount} due recurring expense${createdCount > 1 ? 's' : ''}`, { type: 'success' });
      }
      await getExpenses();
      await getRecurringAlerts();
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error processing recurring dues'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, getExpenses, getRecurringAlerts, pushNotification]);

  const autoAllocateBudgets = useCallback(async ({ savingsTarget, income, apply = true } = {}) => {
    try {
      setError(null);
      const payload = { apply: apply !== false };
      const hasSavingsValue = !(savingsTarget === '' || savingsTarget === null || typeof savingsTarget === 'undefined');
      const hasIncomeValue = !(income === '' || income === null || typeof income === 'undefined');
      const parsedSavings = hasSavingsValue ? Number(savingsTarget) : NaN;
      const parsedIncome = hasIncomeValue ? Number(income) : NaN;
      if (hasSavingsValue && Number.isFinite(parsedSavings) && parsedSavings >= 0) {
        payload.savingsTarget = parsedSavings;
      }
      if (hasIncomeValue && Number.isFinite(parsedIncome) && parsedIncome >= 0) {
        payload.income = parsedIncome;
      }

      const res = await api.post('/v1/budgets/auto-allocate', payload);
      await Promise.all([getCategories(), getCategorySummary()]);
      pushNotification('Budgets auto-allocated from income and savings target', { type: 'success' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error auto-allocating budgets'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, getCategories, getCategorySummary, pushNotification]);

  const editBudget = useCallback(async (id, budget) => {
    try {
      setError(null);
      const res = await api.put(`/v1/categories/${id}`, { budget: Number(budget) || 0 });
      setCategories((prev) => dedupeCategoriesByName(prev.map((c) => (c._id === id ? res.data : c))));
      pushNotification('Category budget updated', { type: 'info' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating budget'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const updateCategory = useCallback(async (id, payload) => {
    try {
      setError(null);
      const res = await api.put(`/v1/categories/${id}`, payload);
      setCategories((prev) => dedupeCategoriesByName(prev.map((category) => (category._id === id ? res.data : category))));
      pushNotification(`Category updated: ${res?.data?.name || 'item'}`, { type: 'info' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating category'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, pushNotification]);

  const toggleCategoryStatus = useCallback(async (id, active) => {
    return updateCategory(id, { active: Boolean(active) });
  }, [updateCategory]);

  const deleteCategory = useCallback(async (id) => {
    try {
      setError(null);
      await api.delete(`/v1/categories/${id}`);
      setCategories((prev) => dedupeCategoriesByName(prev.filter((category) => category._id !== id)));
      pushNotification('Category deleted', { type: 'warning' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error deleting category'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const cleanupDuplicateCategories = useCallback(async () => {
    try {
      setError(null);
      const res = await api.post('/v1/categories/cleanup-duplicates');
      await Promise.all([getCategories(), getCategorySummary()]);
      const removed = Number(res?.data?.removed || 0);
      pushNotification(`Category cleanup completed (${removed} duplicate${removed === 1 ? '' : 's'} removed)`, { type: 'success' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error cleaning duplicate categories'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, getCategories, getCategorySummary, pushNotification]);

  const ensureDefaultCategories = useCallback(async () => {
    try {
      const res = await api.get('/v1/categories');
      const existing = dedupeCategoriesByName(res.data);
      const existingNames = new Set(existing.map((c) => normalizeCategoryName(c.name)));

      for (const baseCategory of DEFAULT_CATEGORIES) {
        if (!existingNames.has(baseCategory.name.toLowerCase())) {
          try {
            await api.post('/v1/categories/add', baseCategory);
            existingNames.add(baseCategory.name.toLowerCase());
          } catch (err) {
            const duplicateError =
              err?.response?.status === 400 &&
              (
                err?.response?.data?.error === 'Category already exists' ||
                err?.response?.data?.message === 'Category already exists'
              );
            if (!duplicateError) {
              throw err;
            }
          }
        }
      }

      const finalRes = await api.get('/v1/categories');
      setCategories(dedupeCategoriesByName(finalRes.data));
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error preparing categories'));
      return false;
    }
  }, [getApiErrorMessage]);

  const getData = useCallback(async (options = {}) => {
    const force = Boolean(options.force);
    const now = Date.now();
    const hasCachedData = expenses.length > 0 || categories.length > 0;
    if (!force && hasCachedData && now - lastSyncAt < 20000) {
      return true;
    }

    setLoading(true);
    setError(null);
    const [expenseOk, categoryOk] = await Promise.all([
      getExpenses(),
      ensureDefaultCategories()
    ]);
    await Promise.all([
      getCategorySummary(),
      getGoals(),
      getInsights(),
      getRecurringAlerts()
    ]);
    setLastSyncAt(Date.now());
    setLoading(false);
    return expenseOk && categoryOk;
  }, [
    categories.length,
    ensureDefaultCategories,
    expenses.length,
    getCategorySummary,
    getExpenses,
    getGoals,
    getInsights,
    getRecurringAlerts,
    lastSyncAt
  ]);

  const contextValue = useMemo(() => ({
    user,
    setUser,
    expenses,
    historyItems,
    historyPagination,
    historyLoading,
    categories,
    categorySummary,
    goals,
    insights,
    recurringAlerts,
    loading,
    error,
    setError,
    toast,
    notifications,
    showToast,
    hideToast,
    pushNotification,
    markNotificationsRead,
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    updateProfile,
    updatePassword,
    addExpense,
    addTransaction,
    getExpenses,
    deleteExpense,
    updateExpense,
    getExpenseHistory,
    generateRecurringExpense,
    addCategory,
    getCategories,
    getCategorySummary,
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    getInsights,
    getRecurringAlerts,
    processRecurringDue,
    autoAllocateBudgets,
    editBudget,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    cleanupDuplicateCategories,
    getData
  }), [
    user,
    expenses,
    historyItems,
    historyPagination,
    historyLoading,
    categories,
    categorySummary,
    goals,
    insights,
    recurringAlerts,
    loading,
    error,
    toast,
    notifications,
    showToast,
    hideToast,
    pushNotification,
    markNotificationsRead,
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    updateProfile,
    updatePassword,
    addExpense,
    addTransaction,
    getExpenses,
    deleteExpense,
    updateExpense,
    getExpenseHistory,
    generateRecurringExpense,
    addCategory,
    getCategories,
    getCategorySummary,
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    getInsights,
    getRecurringAlerts,
    processRecurringDue,
    autoAllocateBudgets,
    editBudget,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    cleanupDuplicateCategories,
    getData
  ]);

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => {
  return useContext(GlobalContext);
};
