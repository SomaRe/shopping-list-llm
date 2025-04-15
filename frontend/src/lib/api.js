// src/lib/api.js
import apiClient from '../services/apiClient'; // Import the configured Axios instance

// Axios handles JSON parsing and throws errors for non-2xx responses by default.
// Adjust the error handling slightly.
async function handleAxiosResponse(axiosPromise) {
    try {
        const response = await axiosPromise;
        // For DELETE requests that return 204 No Content, Axios might return undefined data
        if (response.status === 204) {
             // You might want a consistent success object for deletes
            return { success: true, message: 'Operation successful (No Content)' };
        }
        return response.data; // Data is directly available in response.data
    } catch (error) {
        console.error('API Error (Axios):', error.response?.status, error.response?.data || error.message);
        // Extract detail message if available, otherwise use generic error message
        const detail = error.response?.data?.detail || error.message || `HTTP error! status: ${error.response?.status}`;
        throw new Error(detail);
    }
}


// -- Categories --
export async function fetchCategories() {
    const response = await handleAxiosResponse(apiClient.get('/categories/'));
    // Assuming the backend still wraps categories in a 'categories' key
    return response.categories || response; // Adjust if backend structure changed
}

export async function addCategory(payload) {
    return handleAxiosResponse(apiClient.post('/categories/', payload));
}

export async function deleteCategory(categoryId) {
    return handleAxiosResponse(apiClient.delete(`/categories/${categoryId}`));
}

// -- Items --
export async function fetchItems() {
    const response = await handleAxiosResponse(apiClient.get('/items/'));
     // Assuming the backend still wraps items in an 'items' key
    return response.items || response; // Adjust if backend structure changed
}

export async function addItem(payload) {
    return handleAxiosResponse(apiClient.post('/items/', payload));
}

export async function updateItem(itemId, payload) {
    // Use PATCH if your backend supports partial updates, otherwise stick to PUT
    // FastAPI PUT often requires the full object, while PATCH handles partials.
    // Let's assume PUT requires the full object based on the previous setup,
    // but your EditItemModal only sends partials. Adjust backend or payload if needed.
    // For now, using PUT as before.
    return handleAxiosResponse(apiClient.put(`/items/${itemId}`, payload));
}

export async function deleteItem(itemId) {
    return handleAxiosResponse(apiClient.delete(`/items/${itemId}`));
}

// -- Chat --
export async function sendChatMessage(messages) {
    const payload = { messages };
    return handleAxiosResponse(apiClient.post('/chat/', payload));
}