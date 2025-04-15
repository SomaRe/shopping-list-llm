import React, { useState } from 'react';
import PriceMatchIcon from '../icons/PriceMatchIcon';

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
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdate = async (updatePayload) => {
        if (isUpdating || isDeleting) return;
        setIsUpdating(true);
        try {
            await onUpdate(item.id, updatePayload);
        } catch (err) {
            console.error("Failed to update item:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const togglePriceMatch = () => {
        handleUpdate({ price_match: !item.price_match });
    };

    const handleToggleTicked = () => {
        handleUpdate({ is_ticked: !item.is_ticked });
    };

    const handleDelete = async () => {
        if (isDeleting || isUpdating) return;
        if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
        setIsDeleting(true);
        try {
            await onDelete(item.id);
        } catch (err) {
            console.error("Failed to delete item:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex items-center justify-between py-2 px-3 hover:bg-base-200 group">
            <div className="flex-1 flex items-center min-w-0 mr-2">
                <input
                    type="checkbox"
                    checked={item.is_ticked}
                    onChange={handleToggleTicked}
                    disabled={isUpdating || isDeleting}
                    className={`checkbox checkbox-sm checkbox-primary mr-3 shrink-0 ${isUpdating ? 'opacity-50' : ''}`}
                    aria-label={`Mark ${item.name} as ${item.is_ticked ? 'not acquired' : 'acquired'}`}
                />
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-base-content truncate ${item.is_ticked ? 'line-through text-base-content/50' : ''}`}>
                        {item.name}
                    </p>
                    {item.note && (
                        <p className={`text-xs text-base-content/70 truncate ${item.is_ticked ? 'line-through' : ''}`}>
                            {item.note}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                <button
                    onClick={togglePriceMatch}
                    disabled={isUpdating || isDeleting}
                    className={`btn btn-ghost btn-xs p-1 ${item.price_match ? 'text-error hover:bg-error/10' : 'text-base-content/60 hover:text-error'} disabled:opacity-50`}
                    title={item.price_match ? "Remove Price Match flag" : "Flag for Price Match"}
                >
                    {isUpdating ? <span className="loading loading-spinner loading-xs"></span> : <PriceMatchIcon active={item.price_match} />}
                    <span className="sr-only">{item.price_match ? "Price Match Active" : "Flag for Price Match"}</span>
                </button>

                <button
                    onClick={() => onEdit(item)}
                    disabled={isUpdating || isDeleting}
                    className="btn btn-ghost btn-xs p-1 text-base-content/70 hover:text-info disabled:opacity-50"
                    title="Edit Item"
                >
                    <EditIcon />
                    <span className="sr-only">Edit Item</span>
                </button>

                <button
                    onClick={handleDelete}
                    disabled={isUpdating || isDeleting}
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
