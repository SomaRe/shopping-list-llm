// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as api from './lib/api';
import CategoryDisplay from './components/CategoryDisplay';
import AddItemForm from './components/AddItemForm';
import EditItemModal from './components/EditItemModal';
import FloatingChatButton from './components/FloatingChatButton';
import ChatModal from './components/ChatModal';

// Optional: Loading spinner component
const LoadingSpinner = () => (
     <div className="text-center py-10">
        <p className="text-base-content/70 mb-2">Loading groceries...</p>
        <span className="loading loading-spinner loading-lg text-primary"></span>
     </div>
);

// Optional: Global error display component
const GlobalError = ({ error, onClear }) => (
     <div className="alert alert-error shadow-lg mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <div>
            <h3 className="font-bold">Error</h3>
            <div className="text-xs">{error}</div>
        </div>
         {onClear && (
             <button className="btn btn-sm btn-ghost" onClick={onClear}>Clear</button>
         )}
    </div>
);


function App() {
    // --- State ---
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddItem, setShowAddItem] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // Holds the item object being edited, or null
    const [showChat, setShowChat] = useState(false);

    // --- Fetch Initial Data ---
    const loadData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError(null); // Clear errors before fetching
        try {
            // Fetch in parallel
            const [fetchedCategories, fetchedItems] = await Promise.all([
                api.fetchCategories(),
                api.fetchItems()
            ]);
            // Sort categories immediately after fetching
            const sortedCategories = fetchedCategories.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(sortedCategories);
            setItems(fetchedItems);
        } catch (err) {
            console.error("Failed to load data:", err);
            setError(err.message || "Could not fetch grocery list.");
        } finally {
             if (showLoading) setIsLoading(false);
        }
    }, []); // useCallback ensures loadData doesn't change unless dependencies do (none here)

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array means run once on mount

    // --- Derived State: Group items by category ---
    const itemsByCategory = useMemo(() => {
        const grouped = {};
        // Initialize groups for all existing categories (use sorted categories)
        categories.forEach(cat => {
            grouped[cat.id] = { category: cat, items: [] };
        });

        // Populate groups with items
        items.forEach(item => {
            // Ensure item.category exists and has an id
            if (item.category && grouped[item.category.id]) {
                grouped[item.category.id].items.push(item);
            } else {
                // Handle items with missing/invalid categories if necessary
                console.warn(`Item ${item.id} (${item.name}) has unknown or missing category:`, item.category);
                 // Optionally group them under an "Uncategorized" key
                 // if (!grouped['uncategorized']) {
                 //   grouped['uncategorized'] = { category: { id: 'uncategorized', name: 'Uncategorized' }, items: [] };
                 // }
                 // grouped['uncategorized'].items.push(item);
            }
        });

        // Get the groups as an array (already sorted by category name via initial sort)
        const sortedGroups = Object.values(grouped);

        // Sort items within each category alphabetically
        sortedGroups.forEach(group => {
            group.items.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Filter out categories with no items if desired (optional)
        // return sortedGroups.filter(group => group.items.length > 0);
        return sortedGroups;

    }, [items, categories]); // Recalculate when items or categories change

    // --- Event Handlers ---
    const handleAddItem = useCallback(async (payload) => {
        setError(null); // Clear previous global errors
        try {
            const newItem = await api.addItem(payload);
            // Add the new item to the state
            setItems(prevItems => [...prevItems, newItem]);
            // Potentially close the add form or give feedback
        } catch (err) {
            console.error("Add item failed:", err);
            setError(`Failed to add item: ${err.message}`); // Set global error
            throw err; // Re-throw so the form can catch it and display local error
        }
    }, []); // No dependencies needed if setError/setItems are stable

    const handleAddCategory = useCallback(async (name) => {
        setError(null);
        try {
            const newCategory = await api.addCategory({ name });
            // Add and re-sort categories
            setCategories(prevCategories =>
                [...prevCategories, newCategory].sort((a, b) => a.name.localeCompare(b.name))
            );
            return newCategory; // Return to form
        } catch (err) {
            console.error("Add category failed:", err);
            setError(`Failed to add category: ${err.message}`);
            throw err; // Re-throw for form
        }
    }, []);

    const handleDeleteItem = useCallback(async (itemId) => {
         setError(null);
         // Optimistic UI update (optional but good for UX)
         const originalItems = items;
         setItems(prevItems => prevItems.filter(item => item.id !== itemId));
        try {
            await api.deleteItem(itemId);
            // If optimistic update worked, no need to change state again
        } catch (err) {
            console.error("Delete item failed:", err);
            setError(`Failed to delete item: ${err.message}`);
            // Revert optimistic update if API call failed
            setItems(originalItems);
            throw err; // Re-throw for ItemRow component's local error handling
        }
    }, [items]); // Dependency on 'items' for optimistic revert

    const handleUpdateItem = useCallback(async (itemId, payload) => {
         setError(null);
         const originalItems = items; // Store for potential revert
        try {
             // Apply optimistic update first for better UX
             setItems(prevItems => prevItems.map(item =>
                item.id === itemId ? { ...item, ...payload } : item
             ));

             // Call the API - Use the *full* updated item for PUT if backend expects it
             // Or just send the 'payload' (changed fields) if backend uses PATCH/partial update
             // For simplicity, let's assume PATCH/partial update here based on EditItemModal logic
            const updatedItemFromServer = await api.updateItem(itemId, payload);

             // Update state with potentially more complete data from server response
            setItems(prevItems => prevItems.map(item =>
                item.id === itemId ? updatedItemFromServer : item
            ));
            // Close the modal if it was an edit from the modal
            if (editingItem?.id === itemId) {
                setEditingItem(null);
            }
        } catch (err) {
            console.error("Update item failed:", err);
            setError(`Failed to update item: ${err.message}`);
            // Revert optimistic update on failure
            setItems(originalItems);
            throw err; // Re-throw for modal/row component
        }
    }, [editingItem, items]); // Depend on editingItem to close modal, items for revert

    const handleDeleteCategory = useCallback(async (categoryId) => {
        setError(null);
         const originalCategories = categories;
         const originalItems = items;
         // Check if category has items (should be handled in CategoryDisplay, but double-check)
         const categoryHasItems = items.some(item => item.category?.id === categoryId);
         if (categoryHasItems) {
             const errorMsg = "Cannot delete category with items.";
             setError(errorMsg);
             throw new Error(errorMsg); // Prevent deletion
         }

         // Optimistic UI update
         setCategories(prev => prev.filter(cat => cat.id !== categoryId));
         // Note: Items in this category *should* be empty based on check above

        try {
            await api.deleteCategory(categoryId);
            // Success, optimistic update is correct
        } catch (err) {
            console.error("Delete category failed:", err);
            setError(`Failed to delete category: ${err.message}`);
            // Revert optimistic updates
            setCategories(originalCategories);
            setItems(originalItems);
            throw err; // Re-throw for CategoryDisplay component
        }
    }, [categories, items]); // Dependencies for checks and revert

    // --- Modal Control ---
    const openEditModal = useCallback((item) => setEditingItem(item), []);
    const closeEditModal = useCallback(() => setEditingItem(null), []);
    const openChatModal = useCallback(() => setShowChat(true), []);
    const closeChatModal = useCallback(() => setShowChat(false), []);

    // --- Chat State Change Handler ---
    const handlePotentialStateChange = useCallback(() => {
        console.log("AI indicated a potential state change, refreshing data...");
        // Re-call loadData, but maybe don't show the main loading spinner
        // to avoid disrupting the user flow too much after chat.
        loadData(false); // Pass false to prevent setting global isLoading
    }, [loadData]);

    return (
        // Use DaisyUI container for better control, or keep Tailwind's
        // `container mx-auto max-w-3xl` works well too.
        // Let's use DaisyUI's theme capability via html tag.
        <div className="container mx-auto p-4 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-center text-base-content">Grocery List</h1>

            {/* Global Error Display */}
            {error && <GlobalError error={error} onClear={() => setError(null)} />}

            {/* Add Item Form Section - Use DaisyUI collapse or just conditional render */}
            <div className="mb-4">
                 <button
                    className="btn btn-sm btn-ghost text-primary mb-2"
                    onClick={() => setShowAddItem(!showAddItem)}
                 >
                    {showAddItem ? 'Hide Add Item Form' : 'Show Add Item Form'}
                </button>

                {/* Conditional rendering for the form */}
                {showAddItem && (
                    <AddItemForm
                        categories={categories}
                        onAddItem={handleAddItem}
                        onAddCategory={handleAddCategory}
                     />
                )}
            </div>


            {/* Loading Indicator */}
            {isLoading && <LoadingSpinner />}

            {/* Grocery List Display */}
            {!isLoading && itemsByCategory.length > 0 && (
                <div className="space-y-6">
                    {itemsByCategory.map(group => (
                        <CategoryDisplay
                            key={group.category.id}
                            category={group.category}
                            items={group.items}
                            onDeleteItem={handleDeleteItem}
                            onUpdateItem={handleUpdateItem} // Pass the combined handler
                            onEditItem={openEditModal}
                            onDeleteCategory={handleDeleteCategory}
                        />
                    ))}
                </div>
            )}

            {/* Empty State Messages */}
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

             {/* Edge case: Items exist but no categories loaded (indicates data inconsistency) */}
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
                show={!!editingItem} // Show modal if editingItem is not null
                onClose={closeEditModal}
                onUpdate={handleUpdateItem} // Pass the main update handler
            />

            {/* Floating Chat Button */}
            <FloatingChatButton onClick={openChatModal} />

            {/* Chat Modal */}
            <ChatModal
                show={showChat}
                onClose={closeChatModal}
                onStateChange={handlePotentialStateChange} // Pass refresh handler
            />

        </div>
    );
}

export default App;