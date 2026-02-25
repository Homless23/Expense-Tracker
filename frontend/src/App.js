import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useGlobalContext } from './context/globalContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import History from './pages/History';
import AddTransaction from './pages/AddTransaction';
import Budget from './pages/Budget';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import Spinner from './components/Spinner';
import Toast from './components/Toast';
import './App.css';
import './styles/ui.css';

/**
 * Protected route component to handle authenticated routes
 * Shows loading spinner while checking auth state
 */
const ProtectedRoute = ({ isAuthenticated, isLoading, element }) => {
    if (isLoading) {
        return <Spinner />;
    }
    return isAuthenticated ? element : <Navigate to="/login" replace />;
};

/**
 * Public route component for auth pages
 * Redirects authenticated users away from login/signup
 */
const PublicRoute = ({ isAuthenticated, isLoading, element }) => {
    if (isLoading) {
        return <Spinner />;
    }
    return !isAuthenticated ? element : <Navigate to="/" replace />;
};

const AdminRoute = ({ user, isLoading, element }) => {
    if (isLoading) {
        return <Spinner />;
    }
    if (!user) {
        return <Navigate to="/admin/login" replace />;
    }
    return user?.role === 'admin' ? element : <Navigate to="/dashboard" replace />;
};

/**
 * Main app content with routing logic
 * Handles initial user state restoration and route protection
 */
const AppContent = () => {
    const { user, setUser } = useGlobalContext();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Initialize user from localStorage on app mount
     * Only called once to restore persisted auth state
     */
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
            }
        } catch (err) {
            console.error('Failed to restore user from localStorage:', err);
            setError('Failed to restore session. Please log in again.');
            localStorage.removeItem('user');
        } finally {
            setIsLoading(false);
        }
    }, [setUser]);

    // Show error fallback if user restoration failed
    if (error) {
        return (
            <div className="error-container">
                <h2>Session Error</h2>
                <p>{error}</p>
                <Routes>
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </div>
        );
    }

    return (
        <>
            <Routes>
                <Route
                    path="/"
                    element={
                        <ProtectedRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<Navigate to="/dashboard" replace />}
                        />
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<Home />}
                        />
                    }
                />
                <Route
                    path="/transactions"
                    element={
                        <ProtectedRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<History />}
                        />
                    }
                />
                <Route
                    path="/add"
                    element={
                        <ProtectedRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<AddTransaction />}
                        />
                    }
                />
                <Route
                    path="/budget"
                    element={
                        <ProtectedRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<Budget />}
                        />
                    }
                />
                <Route
                    path="/categories"
                    element={
                        <ProtectedRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<Categories />}
                        />
                    }
                />
                <Route
                    path="/reports"
                    element={
                        <ProtectedRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<Reports />}
                        />
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<Profile />}
                        />
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <AdminRoute
                            user={user}
                            isLoading={isLoading}
                            element={<Admin />}
                        />
                    }
                />
                <Route
                    path="/analytics"
                    element={
                        <ProtectedRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<Budget />}
                        />
                    }
                />
                <Route
                    path="/history"
                    element={
                        <ProtectedRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<History />}
                        />
                    }
                />
                <Route
                    path="/login"
                    element={
                        <PublicRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<Login />}
                        />
                    }
                />
                <Route
                    path="/signup"
                    element={
                        <PublicRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<Signup />}
                        />
                    }
                />
                <Route
                    path="/admin/login"
                    element={
                        <PublicRoute
                            isAuthenticated={!!user}
                            isLoading={isLoading}
                            element={<AdminLogin />}
                        />
                    }
                />
                {/* Catch-all route for 404 pages */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toast />
        </>
    );
};

/**
 * Root App component
 * Note: GlobalProvider should only wrap the app once in index.js
 */
export default function App() {
    return <AppContent />;
}
