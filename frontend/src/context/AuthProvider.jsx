import React, { useState, useEffect, useCallback } from 'react';
import AuthContext from './AuthContext';
import apiClient from '../services/apiClient';
import * as api from '../lib/api';

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        try {
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            localStorage.removeItem('user');
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAndSetUser = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const currentUser = await api.fetchCurrentUser();
            if (currentUser && currentUser.id && currentUser.username) {
                setUser(currentUser);
                localStorage.setItem('user', JSON.stringify(currentUser));
            } else {
                console.error("Fetched user data is incomplete:", currentUser);
                logout();
            }
        } catch (fetchError) {
            console.error("Failed to fetch current user:", fetchError);
            setError("Session expired or invalid. Please log in again.");
            logout();
        } finally {
             setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            if (!user) {
                fetchAndSetUser();
            } else {
                setIsLoading(false);
            }
        } else {
            delete apiClient.defaults.headers.common['Authorization'];
            setUser(null);
            localStorage.removeItem('user');
            setIsLoading(false);
        }
    }, [token, fetchAndSetUser, user]);

    const login = async (username, password) => {
        setIsLoading(true);
        setError(null);
        try {
            // Use FormData for OAuth2PasswordRequestForm
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await apiClient.post('/login/token', formData, {
                 headers: {
                     'Content-Type': 'application/x-www-form-urlencoded' // Important for OAuth2 form data
                 }
            });

            const newToken = response.data.access_token;
            setToken(newToken);
            localStorage.setItem('authToken', newToken);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            await fetchAndSetUser();
            return true;
        } catch (err) {
            console.error("Login failed:", err.response?.data || err.message);
            setError(err.response?.data?.detail || 'Login failed. Please check credentials.');
            localStorage.removeItem('authToken'); // Clear invalid token attempt
            setToken(null);
            setUser(null);
            delete apiClient.defaults.headers.common['Authorization'];
            setIsLoading(false);
            return false; // Indicate failure
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        delete apiClient.defaults.headers.common['Authorization'];
        setError(null);
        if (window.location.pathname !== '/login') {
             window.location.href = '/login';
        }
    };

    const value = {
        token,
        user,
        isAuthenticated: !!token && !!user,
        isLoading,
        error,
        login,
        logout,
        fetchAndSetUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
