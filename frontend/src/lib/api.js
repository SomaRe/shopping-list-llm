// src/lib/api.js
const BASE_URL = 'http://localhost:8000/api/v1'; // Your backend URL

async function handleResponse(response) {
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            const errorText = await response.text();
            console.error('API Error (Non-JSON):', response.status, errorText);
            throw new Error(errorText || `HTTP error! status: ${response.status} - ${e}`);
        }
        console.error('API Error (JSON):', response.status, errorData);
        throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
    }
    if (response.status === 204) {
        return null;
    }
    return response.json();
}


// -- Categories --
export async function fetchCategories(){
	const response = await fetch(`${BASE_URL}/categories/`);
	const data = await handleResponse(response);
    return data.categories;
}

export async function addCategory(payload) {
	const response = await fetch(`${BASE_URL}/categories/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return handleResponse(response);
}

export async function deleteCategory(categoryId){
    const response = await fetch(`${BASE_URL}/categories/${categoryId}`, {
		method: 'DELETE',
	});
    if (!response.ok && response.status !== 204) {
        return handleResponse(response);
    }
    if (response.status === 204) {
        return { success: true, message: 'Category deleted successfully.' };
    }
    return handleResponse(response);
}

// -- Items --
export async function fetchItems() {
	const response = await fetch(`${BASE_URL}/items/`);
    const data = await handleResponse(response);
	return data.items;
}

export async function addItem(payload) {
	const response = await fetch(`${BASE_URL}/items/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return handleResponse(response);
}

export async function updateItem(itemId, payload) {
    const response = await fetch(`${BASE_URL}/items/${itemId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return handleResponse(response);
}

export async function deleteItem(itemId) {
    const response = await fetch(`${BASE_URL}/items/${itemId}`, {
		method: 'DELETE',
	});
    if (!response.ok && response.status !== 204) {
        return handleResponse(response);
    }
     if (response.status === 204) {
        return { success: true, message: 'Item deleted successfully.' };
    }
    return handleResponse(response);
}

// -- Chat --
export async function sendChatMessage(messages) {
    const payload = { messages };
	const response = await fetch(`${BASE_URL}/chat/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return handleResponse(response);
}
