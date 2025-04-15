// src/components/EditItemModal.jsx
import React, { useState, useEffect, useCallback } from 'react';

function EditItemModal({ item, categories = [], show, onClose, onUpdate }) {
    // Local state for the form fields within the modal
    const [name, setName] = useState('');
    const [note, setNote] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [priceMatch, setPriceMatch] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Effect to populate form when 'item' prop changes (modal opens or item changes)
    useEffect(() => {
        if (item) {
            setName(item.name ?? '');
            setNote(item.note ?? '');
            setCategoryId(item.category?.id?.toString() ?? ''); // Ensure string for select
            setPriceMatch(item.price_match ?? false);
            setError(null); // Clear previous errors
            setIsSubmitting(false); // Reset submission state
        }
        // No cleanup needed here, state resets on next item load
    }, [item]); // Dependency: re-run when the item to edit changes

    // Effect for handling Escape key press
    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (show) {
            document.addEventListener('keydown', handleKeyDown);
            // Optional: Focus the first input field when modal opens
            const firstInput = document.getElementById('edit-item-name');
            firstInput?.focus();
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }
        // Cleanup listener when component unmounts or 'show' becomes false
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [show, handleKeyDown]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!item || !name.trim() || !categoryId || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        // Construct the payload with only changed fields
        const payload = {};
        if (name.trim() !== item.name) payload.name = name.trim();
        const currentNote = note.trim() || null; // Treat empty string as null
        if (currentNote !== (item.note ?? null)) payload.note = currentNote;
        const currentCategoryId = Number(categoryId);
        if (currentCategoryId !== item.category.id) payload.category_id = currentCategoryId;
        if (priceMatch !== item.price_match) payload.price_match = priceMatch;


        // If nothing changed, just close the modal
        if (Object.keys(payload).length === 0) {
            onClose();
            return;
        }

        try {
            await onUpdate(item.id, payload); // Call parent's update handler
            onClose(); // Close modal on success
        } catch (err) {
            console.error("Failed to update item:", err);
            setError(err.message || "An error occurred while updating the item.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render nothing if show is false
    if (!show || !item) {
        return null;
    }

    // DaisyUI Modal Structure
    return (
        <dialog id={`edit_modal_${item.id}`} className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="edit-item-title">
            <div className="modal-box">
                 <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                <h3 id="edit-item-title" className="font-bold text-lg mb-4">Edit "{item.name}"</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="alert alert-error text-sm p-2">
                           <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           <span>{error}</span>
                        </div>
                     )}

                    <div className="form-control">
                        <label htmlFor="edit-item-name" className="label">
                            <span className="label-text">Item Name*</span>
                        </label>
                        <input
                            type="text"
                            id="edit-item-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="input input-bordered w-full"
                        />
                    </div>

                    <div className="form-control">
                        <label htmlFor="edit-category-select" className="label">
                            <span className="label-text">Category*</span>
                        </label>
                        <select
                            id="edit-category-select"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            required
                            className="select select-bordered w-full"
                        >
                            <option value="" disabled>-- Select Category --</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id.toString()}>
                                    {category.name}
                                </option>
                            ))}
                            {/* No 'new category' option in edit mode for simplicity */}
                        </select>
                    </div>

                    <div className="form-control">
                         <label htmlFor="edit-item-note" className="label">
                             <span className="label-text">Note (Optional)</span>
                         </label>
                        <input
                            type="text"
                            id="edit-item-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g., Brand name, quantity"
                            className="input input-bordered w-full"
                        />
                    </div>

                     <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-4">
                            <input
                                id="edit-price-match"
                                type="checkbox"
                                checked={priceMatch}
                                onChange={(e) => setPriceMatch(e.target.checked)}
                                className="checkbox checkbox-primary"
                            />
                             <span className="label-text">Flag for Price Match</span>
                        </label>
                    </div>

                    <div className="modal-action mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-ghost" // Close button
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim() || !categoryId}
                            className="btn btn-primary" // Submit button
                        >
                            {isSubmitting ? <> <span className="loading loading-spinner loading-xs"></span> Saving... </> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
             {/* Click outside to close */}
             <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
             </form>
        </dialog>
    );
}

export default EditItemModal;