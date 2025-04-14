<script lang="ts">
	import type { Item } from '$lib/types';
	import * as api from '$lib/api';
	import PriceMatchIcon from '$lib/icons/PriceMatchIcon.svelte';

	let { item, onDelete, onUpdate, onEdit } = $props<{
		item: Item;
		onDelete: (id: number) => void | Promise<void>;
		onUpdate: (id: number, payload: Partial<Item>) => void | Promise<void>;
        onEdit: (item: Item) => void;
	}>();

    let isDeleting = $state(false);
    let isTogglingPriceMatch = $state(false);
    let localError = $state<string | null>(null);

	async function togglePriceMatch() {
		if ($isTogglingPriceMatch) return;
        $isTogglingPriceMatch = true;
        $localError = null;
		try {
			await api.updateItem(item.id, { price_match: !item.price_match });
            // Parent component's onUpdate will refresh the state
            onUpdate(item.id, { ...item, price_match: !item.price_match }); // Optimistic update call
		} catch (err: any) {
			console.error("Failed to toggle price match:", err);
            $localError = err.message || "Failed to update";
            // TODO: Maybe revert optimistic update visually here if needed
		} finally {
            $isTogglingPriceMatch = false;
        }
	}

    async function handleDelete() {
        if ($isDeleting) return;
        if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
        $isDeleting = true;
        $localError = null;
        try {
            await onDelete(item.id); // Call parent's delete handler
        } catch (err: any) {
             console.error("Failed to delete item:", err);
             $localError = err.message || "Failed to delete";
        } finally {
            $isDeleting = false;
        }
    }

</script>

<div class="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 group">
	<div class="flex-1 min-w-0">
		<p class="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
		{#if item.note}
			<p class="text-xs text-gray-500 dark:text-gray-400 truncate">{item.note}</p>
		{/if}
         {#if $localError}
            <p class="text-xs text-red-500 mt-1">{$localError}</p>
        {/if}
	</div>
	<div class="flex items-center space-x-2 ml-2">
        <!-- Price Match Toggle -->
		<button
            onclick={togglePriceMatch}
            disabled={$isTogglingPriceMatch}
			class="p-1 rounded text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title={item.price_match ? "Remove Price Match flag" : "Flag for Price Match"}
        >
            <PriceMatchIcon active={item.price_match} />
			<span class="sr-only">{item.price_match ? "Price Match Active" : "Flag for Price Match"}</span>
		</button>

         <!-- Edit Button -->
        <button
            onclick={() => onEdit(item)}
            class="p-1 rounded text-gray-500 hover:text-blue-600"
            title="Edit Item"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            <span class="sr-only">Edit Item</span>
        </button>

		<!-- Delete Button -->
        <button
            onclick={handleDelete}
            disabled={$isDeleting}
			class="p-1 rounded text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete Item"
        >
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
			</svg>
            <span class="sr-only">Delete Item</span>
		</button>
	</div>
</div>
