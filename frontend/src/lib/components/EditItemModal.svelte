<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Item, Category, ItemPayload } from '$lib/types';
    import * as api from '$lib/api';

	let { item, categories = [], show, onClose, onUpdate } = $props<{
		item: Item | null;
        categories: Category[];
		show: boolean;
		onClose: () => void;
		onUpdate: (id: number, payload: Partial<ItemPayload>) => Promise<void>;
	}>();

    // Use $derived to react to changes in the 'item' prop
    let editableItem = $derived({
        name: item?.name ?? '',
        note: item?.note ?? '',
        category_id: item?.category.id ?? '',
        price_match: item?.price_match ?? false,
    });

	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Need to reset local state if the input item changes *while* modal is technically open
	// (though usually it closes/reopens)
	$effect(() => {
		if (item) {
            editableItem = {
                 name: item.name,
                 note: item.note ?? '',
                 category_id: item.category.id,
                 price_match: item.price_match
            };
			$error = null; // Reset error when item changes
            $isSubmitting = false; // Reset submission state
		}
	});

	async function handleSubmit() {
		if (!item || !editableItem.name.trim() || !editableItem.category_id || $isSubmitting) return;

		$isSubmitting = true;
		$error = null;

		const payload: Partial<ItemPayload> = {
            name: editableItem.name.trim(),
            category_id: Number(editableItem.category_id), // Ensure it's a number
            note: editableItem.note.trim() || null, // Send null if empty
            price_match: editableItem.price_match,
        };

        // Only include fields that actually changed (optional optimization)
        const changedPayload: Partial<ItemPayload> = {};
        if (payload.name !== item.name) changedPayload.name = payload.name;
        if (payload.note !== (item.note ?? null)) changedPayload.note = payload.note; // handle null comparison
        if (payload.category_id !== item.category.id) changedPayload.category_id = payload.category_id;
        if (payload.price_match !== item.price_match) changedPayload.price_match = payload.price_match;

        if (Object.keys(changedPayload).length === 0) {
            // Nothing changed
            onClose(); // Just close the modal
            return;
        }

		try {
			await onUpdate(item.id, changedPayload);
			onClose(); // Close modal on success
		} catch (err: any) {
			console.error("Failed to update item:", err);
			$error = err.message || "An error occurred while updating the item.";
		} finally {
			$isSubmitting = false;
		}
	}

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            onClose();
        }
    }

</script>

{#if show && item}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
		on:click={onClose}
        transition:fade={{ duration: 150 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-item-title"
        on:keydown={handleKeydown}
	>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md"
			on:click|stopPropagation -- Prevent closing modal when clicking inside
		>
			<h2 id="edit-item-title" class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Edit "{item.name}"</h2>

			<form on:submit|preventDefault={handleSubmit} class="space-y-4">
				<div>
					<label for="edit-item-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name*</label>
					<input
						type="text"
						id="edit-item-name"
						bind:value={editableItem.name}
						required
						class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
					/>
				</div>

				<div>
					<label for="edit-category-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Category*</label>
					<select
						id="edit-category-select"
						bind:value={editableItem.category_id}
                        required
						class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
					>
                        <option value="" disabled>-- Select Category --</option>
						{#each categories as category (category.id)}
							<option value={category.id}>{category.name}</option>
						{/each}
                        <!-- No 'new category' option in edit mode for simplicity -->
					</select>
				</div>

				<div>
					<label for="edit-item-note" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Note (Optional)</label>
					<input
						type="text"
						id="edit-item-note"
						bind:value={editableItem.note}
						placeholder="e.g., Brand name, quantity"
						class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
					/>
				</div>

                 <div class="flex items-center">
                    <input
                        id="edit-price-match"
                        type="checkbox"
                        bind:checked={editableItem.price_match}
                        class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:focus:ring-offset-gray-800"
                    />
                    <label for="edit-price-match" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Flag for Price Match
                    </label>
                </div>


				{#if $error}
					<p class="text-sm text-red-600 dark:text-red-400">{$error}</p>
				{/if}

				<div class="flex justify-end space-x-3 pt-4">
					<button
						type="button"
						onclick={onClose}
						class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={$isSubmitting || !editableItem.name.trim() || !editableItem.category_id}
						class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if $isSubmitting} Saving... {:else} Save Changes {/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
