import React, { useState, useEffect } from 'react';
import AuthContext from './AuthContext';
import apiClient from '../services/apiClient';

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (token) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            // Optionally fetch user data here if needed
            // e.g., getUserProfile().then(setUser);
        } else {
            delete apiClient.defaults.headers.common['Authorization'];
        }
    }, [token]);

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
            localStorage.setItem('authToken', newToken); // Persist token
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            // Optionally set user info here if needed
            setUser({ username }); // Simple user object
            setIsLoading(false);
            return true; // Indicate success
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
        delete apiClient.defaults.headers.common['Authorization'];
        // Optionally redirect to login page here via router context or window.location
        window.location.href = '/login'; // Simple redirect
    };

    const value = {
        token,
        user,
        isAuthenticated: !!token, // Simple check if token exists
        isLoading,
        error,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;