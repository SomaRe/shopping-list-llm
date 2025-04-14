<script lang="ts">
	import type { Category, ItemPayload } from '$lib/types';
    import * as api from '$lib/api';

	let { categories = [], onAddItem, onAddCategory } = $props<{
        categories: Category[];
        onAddItem: (payload: ItemPayload) => Promise<void>; // Make it async to await
        onAddCategory: (name: string) => Promise<Category>; // Expects the new category back
    }>();

	let itemName = $state('');
	let itemNote = $state('');
	let selectedCategoryId = $state<number | string>(''); // Can be number or 'new'
	let newCategoryName = $state('');
    let priceMatch = $state(false);
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

    // Set default category if available
    $effect(() => {
        if (categories.length > 0 && $selectedCategoryId === '') {
            $selectedCategoryId = categories[0].id;
        }
    });

	async function handleSubmit() {
		if (!itemName.trim() || $isSubmitting) return;
        if ($selectedCategoryId === 'new' && !newCategoryName.trim()) {
            $error = "Please enter a name for the new category.";
            return;
        }
         if ($selectedCategoryId === '') {
            $error = "Please select a category.";
            return;
        }

		$isSubmitting = true;
		$error = null;
        let categoryIdToUse: number;

		try {
            // 1. Handle category creation if needed
			if ($selectedCategoryId === 'new') {
                const newCategory = await onAddCategory(newCategoryName.trim());
                categoryIdToUse = newCategory.id;
			} else {
                categoryIdToUse = Number($selectedCategoryId);
            }

            // 2. Create the item payload
			const payload: ItemPayload = {
				name: itemName.trim(),
				category_id: categoryIdToUse,
				note: itemNote.trim() || null, // Send null if empty
                price_match: $priceMatch,
			};

            // 3. Call parent's add item handler
			await onAddItem(payload);

			// 4. Reset form on success
			itemName = '';
			itemNote = '';
            newCategoryName = '';
            $priceMatch = false;
            // Reset selected category *carefully* - maybe back to default?
            if (categories.length > 0) {
                $selectedCategoryId = categories[0].id;
            } else {
                 $selectedCategoryId = ''; // Or 'new' if no categories exist?
            }

		} catch (err: any) {
			console.error("Failed to add item:", err);
			$error = err.message || "An error occurred while adding the item.";
		} finally {
			$isSubmitting = false;
		}
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow mb-6">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white">Add New Item</h3>
	<div>
		<label for="item-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name*</label>
		<input
			type="text"
			id="item-name"
			bind:value={itemName}
			required
			class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
		/>
	</div>

	<div>
		<label for="category-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Category*</label>
		<select
			id="category-select"
			bind:value={selectedCategoryId}
            required
			class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
		>
            <option value="" disabled>-- Select Category --</option>
			{#each categories as category (category.id)}
				<option value={category.id}>{category.name}</option>
			{/each}
			<option value="new">-- Create New Category --</option>
		</select>
	</div>

	{#if $selectedCategoryId === 'new'}
		<div>
			<label for="new-category-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">New Category Name*</label>
			<input
				type="text"
				id="new-category-name"
                placeholder="e.g., Pantry"
				bind:value={newCategoryName}
				required
				class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
			/>
		</div>
	{/if}

	<div>
		<label for="item-note" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Note (Optional)</label>
		<input
			type="text"
			id="item-note"
			bind:value={itemNote}
            placeholder="e.g., Brand name, quantity"
			class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
		/>
	</div>

    <div class="flex items-center">
        <input
            id="price-match"
            type="checkbox"
            bind:checked={priceMatch}
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:focus:ring-offset-gray-800"
        />
        <label for="price-match" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
            Flag for Price Match
        </label>
    </div>


	{#if $error}
		<p class="text-sm text-red-600 dark:text-red-400">{$error}</p>
	{/if}

	<button
		type="submit"
		disabled={$isSubmitting || !itemName.trim() || ($selectedCategoryId === 'new' && !newCategoryName.trim()) || $selectedCategoryId === ''}
		class="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
	>
		{#if $isSubmitting}
            Adding...
        {:else}
            Add Item
        {/if}
	</button>
</form>
