<script lang="ts">
	import type { Category, Item } from '$lib/types';
	import ItemRow from './ItemRow.svelte';
    import * as api from '$lib/api';

	let { category, items, onDeleteItem, onUpdateItem, onEditItem, onDeleteCategory } = $props<{
		category: Category;
		items: Item[];
        onDeleteItem: (id: number) => void | Promise<void>;
        onUpdateItem: (id: number, payload: Partial<Item>) => void | Promise<void>;
        onEditItem: (item: Item) => void;
        onDeleteCategory: (id: number) => void | Promise<void>;
	}>();

    let isDeletingCategory = $state(false);
    let categoryDeleteError = $state<string | null>(null);

    async function handleCategoryDelete() {
        if ($isDeletingCategory) return;
        // Basic check, backend enforces this better
        if (items.length > 0) {
             alert(`Cannot delete category "${category.name}" because it contains items. Please move or delete the items first.`);
             return;
        }
        if (!confirm(`Are you sure you want to delete the category "${category.name}"? This cannot be undone.`)) return;

        $isDeletingCategory = true;
        $categoryDeleteError = null;
        try {
            await onDeleteCategory(category.id);
        } catch (err: any) {
            console.error("Failed to delete category:", err);
            $categoryDeleteError = err.message || 'Failed to delete category.';
        } finally {
            $isDeletingCategory = false;
        }
    }

</script>

<div class="mb-6 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
	<div class="flex justify-between items-center bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b dark:border-gray-600">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">{category.name}</h2>
         <button
            onclick={handleCategoryDelete}
            disabled={$isDeletingCategory || items.length > 0}
			class="p-1 rounded text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            title={items.length > 0 ? "Cannot delete category with items" : "Delete Category"}
        >
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
			</svg>
            <span class="sr-only">Delete Category</span>
		</button>
    </div>
     {#if $categoryDeleteError}
        <p class="text-xs text-red-500 px-4 py-1">{$categoryDeleteError}</p>
    {/if}

	{#if items.length > 0}
		<div class="divide-y dark:divide-gray-600">
			{#each items as item (item.id)}
				<ItemRow {item} onDelete={onDeleteItem} onUpdate={onUpdateItem} onEdit={onEditItem} />
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400 px-4 py-3">No items in this category yet.</p>
	{/if}
</div>
