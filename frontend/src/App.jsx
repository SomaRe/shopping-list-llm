// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AuthProvider } from './context/AuthProvider';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import * as api from './lib/api';
import CategoryDisplay from './components/CategoryDisplay';
import AddItemForm from './components/AddItemForm';
import EditItemModal from './components/EditItemModal';
import FloatingChatButton from './components/FloatingChatButton';
import ChatModal from './components/ChatModal';
import Login from './components/Login';
import ListPageDetail from './pages/ListPageDetail';
import ShoppingListsPage from './pages/ShoppingListsPage';

const LoadingSpinner = () => (
     <div className="text-center py-10">
        <p className="text-base-content/70 mb-2">Loading groceries...</p>
        <span className="loading loading-spinner loading-lg text-primary"></span>
     </div>
);


function AppContent() {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddItem, setShowAddItem] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showChat, setShowChat] = useState(false);

    // --- Get user and logout from AuthContext ---
    const { isAuthenticated, logout, user } = useAuth();
    // -------------------------------------------

    const loadData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError(null);
        try {
            const [fetchedCategories, fetchedItems] = await Promise.all([
                api.fetchCategories(),
                api.fetchItems()
            ]);
            const sortedCategories = fetchedCategories.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(sortedCategories);
            setItems(fetchedItems);
        } catch (err) {
            console.error("Failed to load data:", err);
            if (err.message?.includes('401') || err.response?.status === 401) {
                 setError("Your session may have expired. Please log out and log back in.");
             } else {
                 setError(err.message || "Could not fetch grocery list.");
             }
        } finally {
             if (showLoading) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
         // Only load data if authenticated
        if (isAuthenticated) {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const itemsByCategory = useMemo(() => {
        const grouped = {};
        categories.forEach(cat => {
            grouped[cat.id] = { category: cat, items: [] };
        });

        items.forEach(item => {
            if (item.category && grouped[item.category.id]) {
                grouped[item.category.id].items.push(item);
            } else {
                console.warn(`Item ${item.id} (${item.name}) has unknown or missing category:`, item.category);
                // Optionally create an 'Uncategorized' group
            }
        });

        const sortedGroups = Object.values(grouped);

        sortedGroups.forEach(group => {
            group.items.sort((a, b) => a.name.localeCompare(b.name));
        });

        return sortedGroups;

    }, [items, categories]);

    const handleAddItem = useCallback(async (payload) => {
        setError(null);
        try {
            const newItem = await api.addItem(payload);
            setItems(prevItems => [...prevItems, newItem]);
        } catch (err) {
            console.error("Add item failed:", err);
             setError(`Failed to add item: ${err.message}`);
             if (err.message?.includes('401') || err.response?.status === 401) logout();
            throw err;
        }
    }, [logout]);

    const handleAddCategory = useCallback(async (name) => {
        setError(null);
        try {
            const newCategory = await api.addCategory({ name });
            setCategories(prevCategories =>
                [...prevCategories, newCategory].sort((a, b) => a.name.localeCompare(b.name))
            );
            return newCategory;
        } catch (err) {
            console.error("Add category failed:", err);
            setError(`Failed to add category: ${err.message}`);
             if (err.message?.includes('401') || err.response?.status === 401) logout();
            throw err;
        }
    }, [logout]);

    const handleDeleteItem = useCallback(async (itemId) => {
         setError(null);
         const originalItems = items;
         setItems(prevItems => prevItems.filter(item => item.id !== itemId));
        try {
            await api.deleteItem(itemId);
        } catch (err) {
            console.error("Delete item failed:", err);
            setError(`Failed to delete item: ${err.message}`);
            setItems(originalItems);
             if (err.message?.includes('401') || err.response?.status === 401) logout();
            throw err;
        }
    }, [items, logout]);

    const handleUpdateItem = useCallback(async (itemId, payload) => {
         setError(null);
         const originalItems = items;
        try {
             setItems(prevItems => prevItems.map(item =>
                item.id === itemId ? { ...item, ...payload } : item
             ));
             const updatedItemFromServer = await api.updateItem(itemId, payload);
             setItems(prevItems => prevItems.map(item =>
                item.id === itemId ? updatedItemFromServer : item
            ));
            if (editingItem?.id === itemId) {
                setEditingItem(null);
            }
        } catch (err) {
            console.error("Update item failed:", err);
            setError(`Failed to update item: ${err.message}`);
            setItems(originalItems);
             if (err.message?.includes('401') || err.response?.status === 401) logout();
            throw err;
        }
    }, [editingItem, items, logout]);

    const handleDeleteCategory = useCallback(async (categoryId) => {
        setError(null);
         const originalCategories = categories;
         const originalItems = items;
         const categoryHasItems = items.some(item => item.category?.id === categoryId);
         if (categoryHasItems) {
             const errorMsg = "Cannot delete category with items.";
             setError(errorMsg);
             throw new Error(errorMsg);
         }
         setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        try {
            await api.deleteCategory(categoryId);
        } catch (err) {
            console.error("Delete category failed:", err);
            setError(`Failed to delete category: ${err.message}`);
            setCategories(originalCategories);
            setItems(originalItems);
             if (err.message?.includes('401') || err.response?.status === 401) logout();
            throw err;
        }
    }, [categories, items, logout]);

    const openEditModal = useCallback((item) => setEditingItem(item), []);
    const closeEditModal = useCallback(() => setEditingItem(null), []);
    const openChatModal = useCallback(() => setShowChat(true), []);
    const closeChatModal = useCallback(() => setShowChat(false), []);

    const handlePotentialStateChange = useCallback(() => {
        console.log("AI indicated a potential state change, refreshing data...");
        loadData(false);
    }, [loadData]);

    return (
        <div className="container mx-auto p-4 min-h-screen">
            {/* --- User Info and Logout Header --- */}
            <header className="flex justify-between items-center mb-5 pb-2 border-b border-base-300">
                 {user && (
                     <span className="text-lg text-base-content/80 font-bold">
                         {user.username.charAt(0).toUpperCase() + user.username.slice(1)}
                     </span>
                 )}
                 {/* Provides a fallback span if user is somehow null */}
                 {!user && <span className="text-sm text-base-content/50">Loading user...</span>}

                 <button
                    onClick={logout}
                    className="btn btn-sm btn-outline btn-error" // Clearer logout style
                    title="Logout"
                >
                    Logout
                </button>
            </header>
            {/* ------------------------------------- */}


            <h1 className="text-3xl font-bold mb-6 text-center text-base-content">Grocery List</h1>

            {/* Add Item Form Section */}
            <div className="mb-4">
                 <button
                    className="btn btn-sm btn-ghost text-primary mb-2"
                    onClick={() => setShowAddItem(!showAddItem)}
                 >
                    {showAddItem ? 'Hide Add Item Form' : 'Show Add Item Form'}
                </button>

                {showAddItem && (
                    <AddItemForm
                        categories={categories}
                        onAddItem={handleAddItem}
                        onAddCategory={handleAddCategory}
                     />
                )}
            </div>


            {isLoading && <LoadingSpinner />}

            {!isLoading && itemsByCategory.length > 0 && (
                <div className="space-y-6">
                    {itemsByCategory.map(group => (
                        <CategoryDisplay
                            key={group.category.id}
                            category={group.category}
                            items={group.items}
                            onDeleteItem={handleDeleteItem}
                            onUpdateItem={handleUpdateItem}
                            onEditItem={openEditModal}
                            onDeleteCategory={handleDeleteCategory}
                            logout={logout} // Pass logout down if needed for specific 401 handling inside
                        />
                    ))}
                </div>
            )}

            {/* ... (rest of the conditional rendering for empty states etc.) ... */}
             {!isLoading && items.length === 0 && categories.length > 0 && (
                <div className="text-center py-10 card bg-base-100 shadow">
                    <div className="card-body items-center">
                        <p className="text-base-content/70">Your grocery list is empty.</p>
                        <p className="text-xs text-base-content/50">Add some items using the form above!</p>
                    </div>
                </div>
            )}

            {!isLoading && items.length === 0 && categories.length === 0 && !error && (
                 <div className="text-center py-10 card bg-base-100 shadow">
                    <div className="card-body items-center">
                         <p className="text-base-content/70">Welcome!</p>
                         <p className="text-xs text-base-content/50">Add categories and items to get started.</p>
                    </div>
                </div>
            )}

            {!isLoading && items.length > 0 && categories.length === 0 && (
                 <div className="alert alert-warning shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>Warning: Items found but no categories loaded. The list might be incomplete or data is inconsistent.</span>
                 </div>
            )}

            {/* Edit Item Modal */}
            <EditItemModal
                item={editingItem}
                categories={categories}
                show={!!editingItem}
                onClose={closeEditModal}
                onUpdate={handleUpdateItem}
            />

            {/* Floating Chat Button */}
            <FloatingChatButton onClick={openChatModal} />

            {/* Chat Modal */}
            <ChatModal
                show={showChat}
                onClose={closeChatModal}
                onStateChange={handlePotentialStateChange}
            />

        </div>
    );
}

// AppLayout remains the same
function AppLayout() {
    return <AppContent />;
}

// App remains the same
function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<ShoppingListsPage />} />
                    <Route path="/lists/:listId" element={<ListPageDetail />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
