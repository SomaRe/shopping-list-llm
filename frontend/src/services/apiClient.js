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

// Optional: Interceptor to handle 401 Unauthorized automatically
// This requires careful handling to avoid infinite loops if token refresh is implemented
// apiClient.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         if (error.response && error.response.status === 401) {
//             // Token likely expired or invalid
//             console.warn("Unauthorized access - 401. Logging out.");
//             // Trigger logout - needs access to logout function or event bus
//             // This is tricky from here, often handled in the calling component
//             // or by redirecting. For now, just log it.
//             // Consider using authContext.logout() if accessible or redirecting.
//             // localStorage.removeItem('authToken'); // Direct but not ideal
//             // window.location.href = '/login';
//         }
//         return Promise.reject(error);
//     }
// );


export default apiClient;