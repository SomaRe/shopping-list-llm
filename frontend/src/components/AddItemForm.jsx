// src/components/AddItemForm.jsx
import React, { useState, useEffect } from 'react';

function AddItemForm({ categories = [], onAddItem, onAddCategory }) {
    const [itemName, setItemName] = useState('');
    const [itemNote, setItemNote] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [priceMatch, setPriceMatch] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Effect to set default category when categories load or change
    useEffect(() => {
        if (categories.length > 0 && selectedCategoryId === '') {
            setSelectedCategoryId(categories[0].id.toString()); // Ensure string for select value
        }
        // If no categories exist and user hasn't chosen 'new', maybe default to 'new'?
        // else if (categories.length === 0 && selectedCategoryId === '') {
        //    setSelectedCategoryId('new');
        // }
    }, [categories, selectedCategoryId]); // Re-run if categories change or selection is reset


    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission
        if (!itemName.trim() || isSubmitting) return;
        if (selectedCategoryId === 'new' && !newCategoryName.trim()) {
            setError("Please enter a name for the new category.");
            return;
        }
        if (selectedCategoryId === '') {
            setError("Please select a category or create a new one.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        let categoryIdToUse;

        try {
            // 1. Handle category creation if needed
            if (selectedCategoryId === 'new') {
                // Call parent's add category handler which returns the new category
                const newCategory = await onAddCategory(newCategoryName.trim());
                categoryIdToUse = newCategory.id;
                // Optional: Automatically select the newly created category in the dropdown?
                // setSelectedCategoryId(newCategory.id.toString()); // Needs categories to update first
            } else {
                categoryIdToUse = Number(selectedCategoryId);
            }

            // 2. Create the item payload
            const payload = {
                name: itemName.trim(),
                category_id: categoryIdToUse,
                note: itemNote.trim() || null, // Send null if empty
                price_match: priceMatch,
            };

            // 3. Call parent's add item handler
            await onAddItem(payload);

            // 4. Reset form on success
            setItemName('');
            setItemNote('');
            setNewCategoryName('');
            setPriceMatch(false);
            setError(null);
            // Reset selected category back to the first available or empty
            setSelectedCategoryId(categories.length > 0 ? categories[0].id.toString() : '');

        } catch (err) {
            console.error("Failed to add item or category:", err);
            setError(err.message || "An error occurred.");
            // Don't reset form on error so user can fix input
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card bg-base-100 shadow mb-6 shrink-0">
          <div className="card-body space-y-4 p-4 md:p-6">
            <h3 className="text-lg font-medium card-title">Add New Item</h3>
            {error && (
                <div className="alert alert-error text-sm p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{error}</span>
                </div>
            )}
            <div className="form-control">
                <label htmlFor="item-name" className="label">
                    <span className="label-text">Item Name*</span>
                </label>
                <input
                    type="text"
                    id="item-name"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    required
                    className="input input-bordered w-full"
                />
            </div>

            <div className="form-control">
                <label htmlFor="category-select" className="label">
                     <span className="label-text">Category*</span>
                </label>
                <select
                    id="category-select"
                    value={selectedCategoryId}
                    onChange={(e) => {
                        setSelectedCategoryId(e.target.value);
                        if (e.target.value !== 'new') setNewCategoryName(''); // Clear new name if existing selected
                        setError(null); // Clear category errors on change
                    }}
                    required
                    className="select select-bordered w-full"
                >
                    <option value="" disabled>-- Select Category --</option>
                    {categories.map(category => (
                        <option key={category.id} value={category.id.toString()}>
                            {category.name}
                        </option>
                    ))}
                    <option value="new">-- Create New Category --</option>
                </select>
            </div>

            {selectedCategoryId === 'new' && (
                <div className="form-control">
                    <label htmlFor="new-category-name" className="label">
                        <span className="label-text">New Category Name*</span>
                    </label>
                    <input
                        type="text"
                        id="new-category-name"
                        placeholder="e.g., Pantry"
                        value={newCategoryName}
                        onChange={(e) => {
                            setNewCategoryName(e.target.value);
                             if (e.target.value.trim()) setError(null); // Clear error if user types
                        }}
                        required
                        className="input input-bordered w-full"
                    />
                </div>
            )}

            <div className="form-control">
                 <label htmlFor="item-note" className="label">
                     <span className="label-text">Note (Optional)</span>
                 </label>
                <input
                    type="text"
                    id="item-note"
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    placeholder="e.g., Brand name, quantity"
                    className="input input-bordered w-full"
                />
            </div>

            <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                     <input
                        id="price-match"
                        type="checkbox"
                        checked={priceMatch}
                        onChange={(e) => setPriceMatch(e.target.checked)}
                        className="checkbox checkbox-primary"
                    />
                    <span className="label-text">Flag for Price Match</span>
                </label>
            </div>

            <div className="card-actions justify-end">
                 <button
                    type="submit"
                    disabled={isSubmitting || !itemName.trim() || selectedCategoryId === '' || (selectedCategoryId === 'new' && !newCategoryName.trim())}
                    className="btn btn-primary w-full md:w-auto"
                >
                    {isSubmitting ? <> <span className="loading loading-spinner loading-xs"></span> Adding... </> : 'Add Item'}
                </button>
            </div>
           </div>
        </form>
    );
}

export default AddItemForm;