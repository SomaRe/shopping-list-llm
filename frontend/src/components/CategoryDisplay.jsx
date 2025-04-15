import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ItemRow from './ItemRow';

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

function CategoryDisplay({ category, items = [], onDeleteItem, onUpdateItem, onEditItem, onDeleteCategory }) {
    const [isDeletingCategory, setIsDeletingCategory] = useState(false);
    const [categoryDeleteError, setCategoryDeleteError] = useState(null);
    const hasItems = items.length > 0;

    const { logout } = useAuth();

    const handleCategoryDelete = async () => {
        if (isDeletingCategory || hasItems) {
             if(hasItems) {
                alert(`Cannot delete category "${category.name}" because it contains items. Please move or delete the items first.`);
             }
             return;
        }
        if (!window.confirm(`Are you sure you want to delete the category "${category.name}"? This cannot be undone.`)) return;

        setIsDeletingCategory(true);
        setCategoryDeleteError(null);
        try {
            await onDeleteCategory(category.id);
        } catch (err) {
            console.error("Failed to delete category:", err);
            if (err.response && err.response.status === 401) {
                setCategoryDeleteError("Your session expired. Please log in again.");
                logout();
            } else {
                setCategoryDeleteError(err.message || 'Failed to delete category.');
            }
        } finally {
            setIsDeletingCategory(false);
        }
    };

    return (
        <div className="card bg-base-100 shadow-md mb-6">
            <div className="card-body p-0">
                <div className="flex justify-between items-center bg-base-200 px-4 py-2 border-b border-base-300">
                    <h2 className="card-title text-lg">{category.name}</h2>
                    <button
                        onClick={handleCategoryDelete}
                        disabled={isDeletingCategory || hasItems}
                        className="btn btn-ghost btn-xs p-1 text-base-content/60 hover:text-error disabled:opacity-50 disabled:cursor-not-allowed"
                        title={hasItems ? "Cannot delete category with items" : "Delete Category"}
                    >
                        {isDeletingCategory ? <span className="loading loading-spinner loading-xs"></span> : <DeleteIcon />}
                        <span className="sr-only">Delete Category</span>
                    </button>
                </div>
                 {categoryDeleteError && (
                    <div className="p-2 px-4 text-xs text-error">
                       {categoryDeleteError}
                    </div>
                )}

                {hasItems ? (
                    <div className="divide-y divide-base-300">
                        {items.map(item => (
                            <ItemRow
                                key={item.id}
                                item={item}
                                onDelete={onDeleteItem}
                                onUpdate={onUpdateItem}
                                onEdit={onEditItem}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-base-content/70 px-4 py-3">No items in this category yet.</p>
                )}
            </div>
        </div>
    );
}

export default CategoryDisplay;
