// src/services/apiClient.js
import axios from 'axios';

// Use environment variable for base URL (from .env file)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const savedToken = localStorage.getItem('authToken');
if (savedToken) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}


export default apiClient;