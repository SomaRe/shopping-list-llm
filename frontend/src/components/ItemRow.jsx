// src/components/ItemRow.jsx
import React, { useState } from 'react';
import PriceMatchIcon from '../icons/PriceMatchIcon';
import * as api from '../lib/api'; // Keep the api import

// Define Icons as simple functional components or import from a library
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);


function ItemRow({ item, onDelete, onUpdate, onEdit }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTogglingPriceMatch, setIsTogglingPriceMatch] = useState(false);
    const [localError, setLocalError] = useState(null);

    const togglePriceMatch = async () => {
        if (isTogglingPriceMatch) return;
        setIsTogglingPriceMatch(true);
        setLocalError(null);
        try {
            // Call the API directly to update the backend
            await api.updateItem(item.id, { price_match: !item.price_match });
            // Call the parent's update handler to update the main state
            onUpdate(item.id, { ...item, price_match: !item.price_match });
        } catch (err) {
            console.error("Failed to toggle price match:", err);
            setLocalError(err.message || "Failed to update");
        } finally {
            setIsTogglingPriceMatch(false);
        }
    };

    const handleDelete = async () => {
        if (isDeleting) return;
        // Use window.confirm for simplicity, replace with modal if needed
        if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
        setIsDeleting(true);
        setLocalError(null);
        try {
            await onDelete(item.id); // This should trigger the API call via the parent
        } catch (err) {
            console.error("Failed to delete item:", err);
            setLocalError(err.message || "Failed to delete");
            // No need to revert optimistic update if parent handles the source of truth
        } finally {
            setIsDeleting(false); // Only set if not deleted, otherwise component unmounts
        }
    };

    return (
        <div className="flex items-center justify-between py-2 px-3 hover:bg-base-200 group">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-base-content truncate">{item.name}</p>
                {item.note && (
                    <p className="text-xs text-base-content/70 truncate">{item.note}</p>
                )}
                {localError && (
                    <p className="text-xs text-error mt-1">{localError}</p>
                )}
            </div>
            <div className="flex items-center space-x-1 md:space-x-2 ml-2">
                {/* Price Match Toggle */}
                <button
                    onClick={togglePriceMatch}
                    disabled={isTogglingPriceMatch}
                    className="btn btn-ghost btn-xs p-1 text-base-content/70 hover:text-error disabled:opacity-50"
                    title={item.price_match ? "Remove Price Match flag" : "Flag for Price Match"}
                >
                    <PriceMatchIcon active={item.price_match} />
                    <span className="sr-only">{item.price_match ? "Price Match Active" : "Flag for Price Match"}</span>
                </button>

                {/* Edit Button */}
                <button
                    onClick={() => onEdit(item)}
                    className="btn btn-ghost btn-xs p-1 text-base-content/70 hover:text-info"
                    title="Edit Item"
                >
                    <EditIcon />
                    <span className="sr-only">Edit Item</span>
                </button>

                {/* Delete Button */}
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="btn btn-ghost btn-xs p-1 text-base-content/70 hover:text-error disabled:opacity-50"
                    title="Delete Item"
                >
                    {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : <DeleteIcon />}
                    <span className="sr-only">Delete Item</span>
                </button>
            </div>
        </div>
    );
}

export default ItemRow;