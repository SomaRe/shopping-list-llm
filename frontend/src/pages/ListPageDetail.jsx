import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as api from '../lib/api';
import CategoryDisplay from '../components/CategoryDisplay';
import AddItemForm from '../components/AddItemForm';
import EditItemModal from '../components/EditItemModal';
import FloatingChatButton from '../components/FloatingChatButton';
import ChatModal from '../components/ChatModal';
import { LuArrowLeft } from "react-icons/lu";

const LoadingSpinner = () => (
    <div className="text-center py-10">
        <p className="text-base-content/70 mb-2">Loading list details...</p>
        <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
);

function ListDetailPage() {
    const { listId } = useParams();
    const { isAuthenticated, logout, user } = useAuth();
    const navigate = useNavigate();

    const [listDetails, setListDetails] = useState(null);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddItem, setShowAddItem] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showChat, setShowChat] = useState(false);

    const loadData = useCallback(async (showLoading = true) => {
        if (!listId) return;

        if (showLoading) setIsLoading(true);
        setError(null);
        try {
            const listIdNum = parseInt(listId, 10);
            const [fetchedListDetails, fetchedCategories, fetchedItems] = await Promise.all([
                api.getListDetails(listIdNum),
                api.fetchCategories(listIdNum),
                api.fetchItems(listIdNum)
            ]);

            setListDetails(fetchedListDetails);
            const sortedCategories = fetchedCategories.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(sortedCategories);
            setItems(fetchedItems);

        } catch (err) {
            console.error("Failed to load list data:", err);
            if (err.message?.includes('401') || err.response?.status === 401) {
                 setError("Your session may have expired. Please log out and log back in.");
                 logout();
             } else if (err.message?.includes('403') || err.response?.status === 403) {
                 setError("You do not have permission to access this list.");
             } else if (err.message?.includes('404') || err.response?.status === 404) {
                  setError("List not found.");
             } else {
                 setError(err.message || "Could not fetch list data.");
             }
        } finally {
             if (showLoading) setIsLoading(false);
        }
    }, [listId, logout]);

    useEffect(() => {
        if (isAuthenticated && listId) {
            loadData();
        } else if (!listId) {
             setError("No list specified.");
             setIsLoading(false);
        }
    }, [isAuthenticated, listId, loadData]);

    const itemsByCategory = useMemo(() => {
        const grouped = {};
        categories.forEach(cat => {
            grouped[cat.id] = { category: cat, items: [] };
        });

        items.forEach(item => {
            if (item.category && grouped[item.category.id]) {
                grouped[item.category.id].items.push(item);
            } else {
                console.warn(`Item ${item.id} (${item.name}) has unknown category:`, item.category);
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
            await api.addItem(payload);
            loadData(false);
        } catch (err) {
            console.error("Add item failed:", err);
             setError(`Failed to add item: ${err.message}`);
             if (err.message?.includes('401')) logout();
             throw err;
        }
    }, [loadData, logout]);

    const handleAddCategory = useCallback(async (name) => {
        if (!listId) throw new Error("List context is missing");
        setError(null);
        try {
            const newCategory = await api.addCategory(parseInt(listId, 10), { name });
            loadData(false);
            return newCategory;
        } catch (err) {
            console.error("Add category failed:", err);
            setError(`Failed to add category: ${err.message}`);
             if (err.message?.includes('401')) logout();
            throw err;
        }
    }, [listId, loadData, logout]);

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
             if (err.message?.includes('401')) logout();
            throw err;
        }
    }, [items, logout]);

    const handleUpdateItem = useCallback(async (itemId, payload) => {
        setError(null);
        const originalItems = items;
        setItems(prevItems => prevItems.map(item =>
            item.id === itemId ? { ...item, ...payload } : item
        ));
        try {
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
             if (err.message?.includes('401')) logout();
            throw err;
        }
    }, [editingItem, items, logout]);

    const handleDeleteCategory = useCallback(async (categoryId) => {
        if (!listId) throw new Error("List context is missing");
         setError(null);
         const categoryHasItems = items.some(item => item.category?.id === categoryId);
         if (categoryHasItems) {
             const errorMsg = "Cannot delete category with items.";
             setError(errorMsg);
             throw new Error(errorMsg);
         }

         setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        try {
            await api.deleteCategory(parseInt(listId, 10), categoryId);
        } catch (err) {
            console.error("Delete category failed:", err);
            setError(`Failed to delete category: ${err.message}`);
             if (err.message?.includes('401')) logout();
            throw err;
        }
    }, [listId, items, logout]);

    const openEditModal = useCallback((item) => setEditingItem(item), []);
    const closeEditModal = useCallback(() => setEditingItem(null), []);
    const openChatModal = useCallback(() => setShowChat(true), []);
    const closeChatModal = useCallback(() => setShowChat(false), []);
    const handlePotentialStateChange = useCallback(() => {
        loadData(false);
    }, [loadData]);

    return (
        <div className="container mx-auto p-4 min-h-screen">
            <header className="flex justify-between items-center mb-5 pb-2 border-b border-base-300">
                 <div className="flex items-center gap-2">
                     <Link to="/" className="btn btn-sm btn-ghost" title="Back to Lists">
                         <LuArrowLeft className="w-5 h-5"/>
                     </Link>
                    <h1 className="text-xl sm:text-2xl font-bold text-base-content truncate">
                         {listDetails?.name || 'Shopping List'}
                    </h1>
                 </div>
            </header>

            {isLoading && <LoadingSpinner />}

            {error && (
                 <div className="alert alert-error shadow-lg">
                    <span>Error: {error}</span>
                     {!error.includes("permission") && !error.includes("not found") && !error.includes("expired") &&
                         <button className="btn btn-sm btn-ghost" onClick={() => loadData(true)}>Retry</button>
                     }
                     <Link to="/" className="btn btn-sm btn-ghost">Go Back to Lists</Link>
                 </div>
            )}

            {!isLoading && !error && listDetails && (
                <>
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

                    {itemsByCategory.length > 0 ? (
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
                                />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-10 card bg-base-100 shadow">
                            <div className="card-body items-center">
                                <p className="text-base-content/70">This shopping list is empty.</p>
                                <p className="text-xs text-base-content/50">Add categories and items using the form above!</p>
                            </div>
                        </div>
                    )}
                </>
            )}

            <EditItemModal
                item={editingItem}
                categories={categories}
                show={!!editingItem}
                onClose={closeEditModal}
                onUpdate={handleUpdateItem}
            />

             {!isLoading && !error && listDetails && (
                <>
                 <FloatingChatButton onClick={openChatModal} />
                 <ChatModal
                    show={showChat}
                    onClose={closeChatModal}
                    onStateChange={handlePotentialStateChange}
                    listId={listDetails.id}
                 />
                 </>
             )}
        </div>
    );
}

export default ListDetailPage;
