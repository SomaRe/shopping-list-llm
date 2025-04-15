// src/lib/api.js
const BASE_URL = 'http://localhost:8000/api/v1'; // Your backend URL

async function handleResponse(response) {
    if (!response.ok) {
        let errorData;
        try {
            // Try to parse JSON first
            errorData = await response.json();
        } catch (e) {
            // If JSON parsing fails, try to get text
            const errorText = await response.text();
            console.error('API Error (Non-JSON):', response.status, errorText);
            throw new Error(errorText || `HTTP error! status: ${response.status} - ${e}`);
        }
        console.error('API Error (JSON):', response.status, errorData);
        throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
    }
    // Only try to parse JSON if the response is ok and not No Content (204)
    if (response.status === 204) {
        return null; // Or handle as needed for DELETE/PUT success
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
	// Handle potential 204 No Content for successful delete
    if (!response.ok && response.status !== 204) {
        return handleResponse(response); // Let handleResponse throw
    }
    if (response.status === 204) {
        return { success: true, message: 'Category deleted successfully.' }; // Or null
    }
    return handleResponse(response); // Should ideally not reach here if 204 is handled
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
		method: 'PUT', // Or PATCH depending on your backend
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return handleResponse(response);
}

export async function deleteItem(itemId) {
    const response = await fetch(`${BASE_URL}/items/${itemId}`, {
		method: 'DELETE',
	});
	// Handle potential 204 No Content for successful delete
    if (!response.ok && response.status !== 204) {
        return handleResponse(response); // Let handleResponse throw
    }
     if (response.status === 204) {
        return { success: true, message: 'Item deleted successfully.' }; // Or null
    }
    return handleResponse(response); // Should ideally not reach here if 204 is handled
}

// -- Chat --
export async function sendChatMessage(messages) {
    const payload = { messages };
	const response = await fetch(`${BASE_URL}/chat/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
    // Use the standard handleResponse
	return handleResponse(response);
}