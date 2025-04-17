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


// --- Shopping Lists ---
export async function fetchLists() {
    return handleAxiosResponse(apiClient.get('/lists/'));
}

export async function updateList(listId, payload) {
    return handleAxiosResponse(apiClient.put(`/lists/${listId}`, payload));
}

export async function addListMember(listId, username) {
    return handleAxiosResponse(apiClient.post(`/lists/${listId}/members`, { username }));
}

export async function removeListMember(listId, userIdToRemove) {
    return handleAxiosResponse(apiClient.delete(`/lists/${listId}/members/${userIdToRemove}`));
}

export async function deleteList(listId) {
    return handleAxiosResponse(apiClient.delete(`/lists/${listId}`));
}

export async function createList(payload) {
    return handleAxiosResponse(apiClient.post('/lists/', payload));
}

export async function getListDetails(listId) {
    return handleAxiosResponse(apiClient.get(`/lists/${listId}`));
}

// --- Categories (Now require listId) ---
export async function fetchCategories(listId) {
    const response = await handleAxiosResponse(apiClient.get(`/lists/${listId}/categories/`));
    return response.categories || [];
}

export async function addCategory(listId, payload) {
    return handleAxiosResponse(apiClient.post(`/lists/${listId}/categories/`, payload));
}

export async function deleteCategory(listId, categoryId) {
    return handleAxiosResponse(apiClient.delete(`/lists/${listId}/categories/${categoryId}`));
}

// --- Items (Now require listId for fetching multiple) ---
export async function fetchItems(listId) {
    const response = await handleAxiosResponse(apiClient.get(`/items/?list_id=${listId}`));
    return response.items || [];
}

export async function addItem(payload) {
    return handleAxiosResponse(apiClient.post('/items/', payload));
}

export async function updateItem(itemId, payload) {
    return handleAxiosResponse(apiClient.put(`/items/${itemId}`, payload));
}

export async function deleteItem(itemId) {
    return handleAxiosResponse(apiClient.delete(`/items/${itemId}`));
}

// --- Chat (Now requires listId) ---
export async function sendChatMessage(messages, listId) {
    const payload = { messages, list_id: listId };
    return handleAxiosResponse(apiClient.post('/chat/', payload));
}
