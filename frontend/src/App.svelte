<script lang="ts">
	import { Category, Item, ItemPayload, CategoryPayload } from '$lib/types';
	import * as api from '$lib/api';
	import CategoryDisplay from '$lib/components/CategoryDisplay.svelte';
    import AddItemForm from '$lib/components/AddItemForm.svelte';
    import EditItemModal from '$lib/components/EditItemModal.svelte';
    import FloatingChatButton from '$lib/components/FloatingChatButton.svelte';
    import ChatModal from '$lib/components/ChatModal.svelte';

	// --- State ---
	let items = $state<Item[]>([]);
	let categories = $state<Category[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
    let showAddItem = $state(true); // Show add form by default
    let editingItem = $state<Item | null>(null); // Controls edit modal
    let showChat = $state(false);

	// --- Derived State ---
    // Group items by category using $derived rune
	let itemsByCategory = $derived(() => {
		const grouped: Record<number, { category: Category; items: Item[] }> = {};

        // Initialize groups for all existing categories
        categories.forEach(cat => {
            grouped[cat.id] = { category: cat, items: [] };
        });

        // Populate groups with items
		items.forEach(item => {
            if (grouped[item.category.id]) { // Check if category exists in map
			    grouped[item.category.id].items.push(item);
            } else {
                // Optional: Handle items whose category might have been deleted?
                // Create an 'Uncategorized' group dynamically?
                // For now, they just won't appear if their category isn't in the categories list
                console.warn(`Item ${item.id} has unknown category ${item.category.id}`);
            }
		});

		// Sort categories alphabetically, then items within categories alphabetically
        const sortedCategories = Object.values(grouped).sort((a, b) =>
            a.category.name.localeCompare(b.category.name)
        );

        sortedCategories.forEach(group => {
            group.items.sort((a, b) => a.name.localeCompare(b.name));
        });

		return sortedCategories;
	});

	// --- Effects ---
	// Fetch initial data on mount
	$effect(() => {
		async function loadData() {
			$isLoading = true;
			$error = null;
			try {
                // Fetch in parallel
				const [fetchedCategories, fetchedItems] = await Promise.all([
					api.fetchCategories(),
					api.fetchItems()
				]);
				categories = fetchedCategories;
				items = fetchedItems;
			} catch (err: any) {
				console.error("Failed to load data:", err);
				$error = err.message || "Could not fetch grocery list.";
			} finally {
				$isLoading = false;
			}
		}
		loadData();
	}, []); // Empty dependency array means run once on mount

    // --- Functions ---
    async function handleAddItem(payload: ItemPayload) {
        $error = null; // Clear previous errors
        try {
            const newItem = await api.addItem(payload);
            // Update state directly - Svelte 5 reactivity handles the rest
            items = [...items, newItem];
            // Optional: scroll to the new item or category?
        } catch (err: any) {
            console.error("Add item failed:", err);
            $error = `Failed to add item: ${err.message}`;
            throw err; // Re-throw so the form knows it failed
        }
    }

    async function handleAddCategory(name: string): Promise<Category> {
         $error = null;
         try {
             const newCategory = await api.addCategory({ name });
             categories = [...categories, newCategory].sort((a,b) => a.name.localeCompare(b.name));
             return newCategory; // Return to form
         } catch (err: any) {
             console.error("Add category failed:", err);
             $error = `Failed to add category: ${err.message}`;
             throw err; // Re-throw
         }
    }

    async function handleDeleteItem(id: number) {
         $error = null;
         // Optimistic UI update (optional, remove if causing issues)
         // const originalItems = items;
         // items = items.filter(item => item.id !== id);
        try {
            await api.deleteItem(id);
             // Confirm update if not optimistic
             items = items.filter(item => item.id !== id);
        } catch (err: any) {
            console.error("Delete item failed:", err);
            $error = `Failed to delete item: ${err.message}`;
            // Revert optimistic update if it failed
            // items = originalItems;
            throw err; // Re-throw for ItemRow component
        }
    }

    async function handleUpdateItem(id: number, payload: Partial<ItemPayload>) {
         $error = null;
        try {
            const updatedItem = await api.updateItem(id, payload);
            // Find and replace item in the state array
            items = items.map(item => item.id === id ? updatedItem : item);
        } catch (err: any) {
            console.error("Update item failed:", err);
            $error = `Failed to update item: ${err.message}`;
            throw err; // Re-throw for modal/row component
        }
    }

    async function handleDeleteCategory(id: number) {
        $error = null;
         try {
            await api.deleteCategory(id);
            categories = categories.filter(cat => cat.id !== id);
            // Items in this category should already be handled (prevented deletion or reassigned)
            // If backend allowed deletion with items, you might need to filter items here too.
        } catch (err: any) {
            console.error("Delete category failed:", err);
            $error = `Failed to delete category: ${err.message}`;
            throw err; // Re-throw for CategoryDisplay component
        }
    }

    function openEditModal(item: Item) {
        editingItem = item;
    }

    function closeEditModal() {
        editingItem = null;
    }

    function openChatModal() {
        showChat = true;
    }

    function closeChatModal() {
        showChat = false;
    }

    // Function called by ChatModal when AI *might* have changed state
    // This forces a refetch for now. A better approach would be for the
    // chat API to return specific changes, and update state directly.
    async function handlePotentialStateChange() {
        console.log("AI indicated a potential state change, refreshing data...");
        $isLoading = true; // Show loading indicator during refresh
		$error = null;
        try {
            // Refetch both, as AI could affect items or categories
            const [fetchedCategories, fetchedItems] = await Promise.all([
                api.fetchCategories(),
                api.fetchItems()
            ]);
            categories = fetchedCategories;
            items = fetchedItems;
        } catch (err: any) {
            console.error("Failed to refresh data after chat:", err);
            $error = err.message || "Could not refresh list after AI action.";
        } finally {
            $isLoading = false;
        }
    }

</script>

<main class="container mx-auto p-4 max-w-3xl font-sans bg-gray-100 dark:bg-gray-900 min-h-screen">
	<h1 class="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">Grocery List</h1>

    <!-- Global Error Display -->
    {#if $error && !$isLoading} <!-- Don't show global error if loading, sub-components might show specific errors -->
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
			<strong class="font-bold">Error:</strong>
			<span class="block sm:inline">{$error}</span>
		</div>
	{/if}

    <!-- Add Item Form Section -->
    <button
        class="text-indigo-600 dark:text-indigo-400 hover:underline mb-4 text-sm"
        onclick={() => $showAddItem = !$showAddItem}
    >
        {$showAddItem ? 'Hide Add Item Form' : 'Show Add Item Form'}
    </button>

    {#if $showAddItem}
        <AddItemForm {categories} onAddItem={handleAddItem} onAddCategory={handleAddCategory} />
    {/if}

    <!-- Loading Indicator -->
	{#if $isLoading}
		<div class="text-center py-10">
			<p class="text-gray-500 dark:text-gray-400">Loading groceries...</p>
             <!-- Basic spinner -->
             <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mt-2"></div>
		</div>
	{/if}

    <!-- Grocery List Display -->
	{#if !$isLoading && itemsByCategory.length > 0}
		<div class="space-y-6">
			{#each itemsByCategory as group (group.category.id)}
				<CategoryDisplay
                    category={group.category}
                    items={group.items}
                    onDeleteItem={handleDeleteItem}
                    onUpdateItem={handleUpdateItem}
                    onEditItem={openEditModal}
                    onDeleteCategory={handleDeleteCategory}
                />
			{/each}
		</div>
	{:else if !$isLoading && items.length === 0}
        <div class="text-center py-10">
		    <p class="text-gray-500 dark:text-gray-400">Your grocery list is empty. Add some items above!</p>
        </div>
    {:else if !$isLoading && items.length > 0 && categories.length === 0}
         <div class="text-center py-10 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4" role="alert">
		    <p>You have items but no categories loaded. There might be an issue.</p>
        </div>
	{/if}


    <!-- Edit Item Modal -->
    <EditItemModal
        item={editingItem}
        {categories}
        show={!!editingItem}
        onClose={closeEditModal}
        onUpdate={handleUpdateItem}
    />

    <!-- Floating Chat Button -->
    <FloatingChatButton onClick={openChatModal} />

    <!-- Chat Modal -->
    <ChatModal
        show={showChat}
        onClose={closeChatModal}
        onStateChange={handlePotentialStateChange}
    />

</main>

<style>
	/* Optional: Add global styles or import a base stylesheet if needed */
	/* Ensure Tailwind base, components, and utilities are included via your main css file or vite config */
</style>
