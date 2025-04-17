// src/pages/ListPageDetail.jsx
// (Based on AppContent.jsx, but heavily modified for list context)
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom'; // Import useParams and Link
import { useAuth } from '../hooks/useAuth';
import * as api from '../lib/api';
import CategoryDisplay from '../components/CategoryDisplay';
import AddItemForm from '../components/AddItemForm';
import EditItemModal from '../components/EditItemModal';
import FloatingChatButton from '../components/FloatingChatButton';
import ChatModal from '../components/ChatModal';
import { LuArrowLeft } from "react-icons/lu"; // Icon for back button

const LoadingSpinner = () => (
     <div className="text-center py-10">
        <p className="text-base-content/70 mb-2">Loading list details...</p>
        <span className="loading loading-spinner loading-lg text-primary"></span>
     </div>
);

// Main component
function ListDetailPage() {
    const { listId } = useParams(); // Get listId from URL
    const { isAuthenticated, logout } = useAuth(); // Keep auth context
    // const navigate = useNavigate();

    const [listDetails, setListDetails] = useState(null); // Store list name, etc.
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddItem, setShowAddItem] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showChat, setShowChat] = useState(false);

    // --- Data Loading ---
    const loadData = useCallback(async (showLoading = true) => {
        if (!listId) return; // Don't load if listId is missing

        if (showLoading) setIsLoading(true);
        setError(null);
        try {
            // Fetch list details, categories, and items in parallel
            const listIdNum = parseInt(listId, 10); // Ensure listId is a number
            const [fetchedListDetails, fetchedCategories, fetchedItems] = await Promise.all([
                api.getListDetails(listIdNum), // Fetch list details
                api.fetchCategories(listIdNum),
                api.fetchItems(listIdNum)
            ]);

            setListDetails(fetchedListDetails); // Store list details
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
                 // Optionally navigate back after a delay: setTimeout(() => navigate('/'), 3000);
             } else if (err.message?.includes('404') || err.response?.status === 404) {
                  setError("List not found.");
                   // Optionally navigate back: setTimeout(() => navigate('/'), 3000);
             } else {
                 setError(err.message || "Could not fetch list data.");
             }
        } finally {
             if (showLoading) setIsLoading(false);
        }
    }, [listId, logout]); // Added navigate dependency

    useEffect(() => {
        if (isAuthenticated && listId) {
            loadData();
        } else if (!listId) {
             setError("No list specified."); // Handle case where listId is missing somehow
             setIsLoading(false);
        }
        // No exhaustive-deps warning for loadData as its dependencies are listed
    }, [isAuthenticated, listId, loadData]);


    // --- Data Grouping (Memoized) ---
    const itemsByCategory = useMemo(() => {
        const grouped = {};
        // Initialize groups based on fetched categories for *this* list
        categories.forEach(cat => {
            grouped[cat.id] = { category: cat, items: [] };
        });

        items.forEach(item => {
            // item.category should be pre-loaded by the API
            if (item.category && grouped[item.category.id]) {
                grouped[item.category.id].items.push(item);
            } else {
                console.warn(`Item ${item.id} (${item.name}) has unknown, missing, or mismatched category:`, item.category);
                // Handle uncategorized if necessary, though should not happen with current API structure
            }
        });

        const sortedGroups = Object.values(grouped);
        sortedGroups.forEach(group => {
            group.items.sort((a, b) => a.name.localeCompare(b.name)); // Sort items within category
        });
        // Already sorted categories when fetching, so groups should be sorted.
        return sortedGroups;

    }, [items, categories]);


    // --- CRUD Callbacks (Updated for list context) ---

    const handleAddItem = useCallback(async (payload) => {
        // payload needs category_id, backend links category_id to list_id implicitly
        setError(null);
        try {
            const newItem = await api.addItem(payload); // No listId needed directly here
            // Optimistic update or refetch? Let's refetch for simplicity on add
            setItems(prevItems => [...prevItems, newItem]); // Optimistic
            loadData(false); // Refetch data without showing main loader
        } catch (err) {
            console.error("Add item failed:", err);
             setError(`Failed to add item: ${err.message}`);
             if (err.message?.includes('401')) logout();
             throw err; // Rethrow for AddItemForm's error handling
        }
    }, [loadData, logout]); // Depends on loadData now

    const handleAddCategory = useCallback(async (name) => {
        if (!listId) throw new Error("List context is missing");
        setError(null);
        try {
            const newCategory = await api.addCategory(parseInt(listId, 10), { name }); // Pass listId
            // setCategories(prevCategories => // Optimistic
            //     [...prevCategories, newCategory].sort((a, b) => a.name.localeCompare(b.name))
            // );
            loadData(false); // Refetch
            return newCategory; // Return for AddItemForm if needed
        } catch (err) {
            console.error("Add category failed:", err);
            setError(`Failed to add category: ${err.message}`);
             if (err.message?.includes('401')) logout();
            throw err; // Rethrow for AddItemForm
        }
    }, [listId, loadData, logout]);

    const handleDeleteItem = useCallback(async (itemId) => {
        setError(null);
        const originalItems = items;
        setItems(prevItems => prevItems.filter(item => item.id !== itemId)); // Optimistic UI remove
        try {
            await api.deleteItem(itemId); // No listId needed directly, backend checks access
             // Keep optimistic update or refetch? Refetch ensures consistency.
             // loadData(false);
        } catch (err) {
            console.error("Delete item failed:", err);
            setError(`Failed to delete item: ${err.message}`);
            setItems(originalItems); // Revert optimistic update on error
             if (err.message?.includes('401')) logout();
            throw err; // Rethrow for ItemRow if needed
        }
    }, [items, logout]); // No loadData dep if optimistic

    const handleUpdateItem = useCallback(async (itemId, payload) => {
        setError(null);
        const originalItems = items;
        // Optimistic update for faster UI feedback
        setItems(prevItems => prevItems.map(item =>
            item.id === itemId ? { ...item, ...payload, category: payload.category_id ? categories.find(c => c.id === payload.category_id) || item.category : item.category } : item // Basic optimistic category update
        ));
        try {
            const updatedItemFromServer = await api.updateItem(itemId, payload); // No listId direct needed
            // Update with server data for consistency
            setItems(prevItems => prevItems.map(item =>
               item.id === itemId ? updatedItemFromServer : item
           ));
           if (editingItem?.id === itemId) {
               setEditingItem(null); // Close modal if open
           }
        } catch (err) {
            console.error("Update item failed:", err);
            setError(`Failed to update item: ${err.message}`);
            setItems(originalItems); // Revert optimistic update
             if (err.message?.includes('401')) logout();
            throw err; // Rethrow for modal/row
        }
    }, [editingItem, items, categories, logout]); // Added categories dep for optimistic update

    const handleDeleteCategory = useCallback(async (categoryId) => {
        if (!listId) throw new Error("List context is missing");
         setError(null);
         const originalCategories = categories;
        //  const originalItems = items; // Need items to check if category is empty client-side

         // Client-side check if category has items
         const categoryHasItems = items.some(item => item.category?.id === categoryId);
         if (categoryHasItems) {
             const errorMsg = "Cannot delete category with items. Please move or delete the items first.";
             setError(errorMsg); // Display error locally
             alert(errorMsg); // Use alert or better notification
             throw new Error(errorMsg); // Prevent API call
         }

         // Optimistic UI remove
         setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        try {
            await api.deleteCategory(parseInt(listId, 10), categoryId); // Pass listId and categoryId
            // Keep optimistic or refetch? Let's keep optimistic here.
            // loadData(false);
        } catch (err) {
            console.error("Delete category failed:", err);
            setError(`Failed to delete category: ${err.message}`);
            setCategories(originalCategories); // Revert optimistic
            // No need to revert items unless API fails due to server-side item check
             if (err.message?.includes('401')) logout();
            throw err; // Rethrow for CategoryDisplay
        }
    }, [listId, categories, items, logout]); // Added items dependency for check

    // --- Modal/Chat State ---
    const openEditModal = useCallback((item) => setEditingItem(item), []);
    const closeEditModal = useCallback(() => setEditingItem(null), []);
    const openChatModal = useCallback(() => setShowChat(true), []);
    const closeChatModal = useCallback(() => setShowChat(false), []);

    // --- Chat State Change Handler ---
    const handlePotentialStateChange = useCallback(() => {
        console.log("AI indicated a potential state change, refreshing list data...");
        loadData(false); // Refresh data without full loading spinner
    }, [loadData]);

    // --- Render ---
    return (
        <div className="container mx-auto p-4 min-h-screen">
             {/* Header with Back Button and List Title */}
            <header className="flex justify-between items-center mb-5 pb-2 border-b border-base-300">
                 <div className="flex items-center gap-2">
                     <Link to="/" className="btn btn-sm btn-ghost" title="Back to Lists">
                         <LuArrowLeft className="w-5 h-5"/>
                     </Link>
                    <h1 className="text-xl sm:text-2xl font-bold text-base-content truncate">
                         {isLoading ? 'Loading...' : listDetails?.name ?? 'Shopping List'}
                    </h1>
                 </div>
                  {/* User Info/Logout can stay if desired, or remove if context is clear */}
                 {/* <div className="flex items-center gap-2">
                     {user && (
                         <span className="text-sm text-base-content/80 font-semibold hidden sm:inline">
                             {user.username}
                         </span>
                     )}
                     <button onClick={logout} className="btn btn-sm btn-outline btn-error" title="Logout">
                         <LuLogOut className="w-4 h-4"/>
                     </button>
                 </div> */}
            </header>

            {/* Main content loading/error/display */}
            {isLoading && <LoadingSpinner />}

            {error && (
                 <div className="alert alert-error shadow-lg">
                    {/* Error Icon */}
                    <span>Error: {error}</span>
                    {/* Optionally add a retry button if the error is recoverable */}
                     {!error.includes("permission") && !error.includes("not found") && !error.includes("expired") &&
                         <button className="btn btn-sm btn-ghost" onClick={() => loadData(true)}>Retry</button>
                     }
                     <Link to="/" className="btn btn-sm btn-ghost">Go Back to Lists</Link>
                 </div>
            )}

            {!isLoading && !error && listDetails && ( // Only render content if list loaded okay
                <>
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
                                // Pass categories available *in this list*
                                categories={categories}
                                onAddItem={handleAddItem}
                                onAddCategory={handleAddCategory} // AddCategory now implicitly uses listId
                             />
                        )}
                    </div>

                    {/* Categories and Items Display */}
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
                                    onDeleteCategory={handleDeleteCategory} // Implicitly uses listId
                                    // logout={logout} // Pass logout if needed inside
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


            {/* Edit Item Modal - Needs available categories for this list */}
            <EditItemModal
                item={editingItem}
                categories={categories} // Pass categories for this list
                show={!!editingItem}
                onClose={closeEditModal}
                onUpdate={handleUpdateItem} // Update implicitly uses listId context via backend
            />

            {/* Floating Chat Button and Modal - Need listId context */}
             {!isLoading && !error && listDetails && ( // Only show chat if list loaded
                <>
                 <FloatingChatButton onClick={openChatModal} />
                 <ChatModal
                    show={showChat}
                    onClose={closeChatModal}
                    onStateChange={handlePotentialStateChange}
                    listId={listDetails.id} // Pass listId to the chat modal
                 />
                 </>
             )}

        </div>
    );
}

export default ListDetailPage;