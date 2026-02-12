import React, { useCallback, useContext, useMemo, useState } from 'react';
import axios from 'axios';

export const GlobalContext = React.createContext();

export const GlobalProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Compatibility placeholders for older components still mounted in the repo.
    const [categories, setCategories] = useState([]);
    const incomes = useMemo(() => [], []);

    const registerUser = useCallback(async (userData) => {
        setError(null);
        try {
            const res = await axios.post('/auth/register', userData);
            localStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
            return true;
        } catch (err) {
            setError(err.response?.data?.message || 'Registration Failed');
            return false;
        }
    }, []);

    const loginUser = useCallback(async (userData) => {
        setError(null);
        try {
            const res = await axios.post('/auth/login', userData);
            localStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
            return true;
        } catch (err) {
            setError(err.response?.data?.message || 'Login Failed');
            return false;
        }
    }, []);

    const logoutUser = useCallback(() => {
        localStorage.removeItem('user');
        setUser(null);
        setExpenses([]);
        setError(null);
    }, []);

    const getConfig = useCallback(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (!storedUser?.token) {
            throw new Error('Missing authentication token');
        }

        return {
            headers: {
                Authorization: `Bearer ${storedUser.token}`,
            },
        };
    }, []);

    const getExpenses = useCallback(async () => {
        setError(null);
        try {
            const res = await axios.get('/v1/get-expenses', getConfig());
            setExpenses(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error fetching expenses');
        }
    }, [getConfig]);

    const addExpense = useCallback(async (expense) => {
        setError(null);
        try {
            await axios.post('/v1/add-expense', expense, getConfig());
            await getExpenses();
            return { success: true };
        } catch (err) {
            setError(err.response?.data?.message || 'Error adding expense');
            return { success: false };
        }
    }, [getConfig, getExpenses]);

    const deleteExpense = useCallback(async (id) => {
        setError(null);
        try {
            await axios.delete(`/v1/delete-expense/${id}`, getConfig());
            await getExpenses();
        } catch (err) {
            setError(err.response?.data?.message || 'Error deleting expense');
        }
    }, [getConfig, getExpenses]);

    const getData = useCallback(async () => {
        setLoading(true);
        try {
            await getExpenses();
        } finally {
            setLoading(false);
        }
    }, [getExpenses]);

    const addCategory = useCallback(async (name) => {
        if (!name) return false;
        setCategories((prev) => {
            if (prev.some((item) => (item.name || item) === name)) {
                return prev;
            }
            return [...prev, { name, budget: 0 }];
        });
        return true;
    }, []);

    const editBudget = useCallback((id, budget) => {
        setCategories((prev) => prev.map((item) => {
            if ((item._id && item._id === id) || item.name === id) {
                return { ...item, budget };
            }
            return item;
        }));
    }, []);

    const value = useMemo(() => ({
        user,
        setUser,
        expenses,
        error,
        setError,
        loading,
        categories,
        incomes,
        registerUser,
        loginUser,
        logoutUser,
        addExpense,
        getExpenses,
        deleteExpense,
        getData,
        addCategory,
        editBudget,
    }), [
        user,
        expenses,
        error,
        loading,
        categories,
        incomes,
        registerUser,
        loginUser,
        logoutUser,
        addExpense,
        getExpenses,
        deleteExpense,
        getData,
        addCategory,
        editBudget,
    ]);

    return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => useContext(GlobalContext);
