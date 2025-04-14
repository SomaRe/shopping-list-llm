<script lang="ts">
	import { fade } from 'svelte/transition';
    import type { ChatMessage } from '$lib/types';
    import * as api from '$lib/api';
    import { tick } from 'svelte'; // Import tick for scrolling

	let { show, onClose, onStateChange } = $props<{
		show: boolean;
		onClose: () => void;
        onStateChange?: () => void; // Callback to notify App.svelte that state *might* have changed
	}>();

    let messages = $state<ChatMessage[]>([]);
    let currentInput = $state('');
    let isLoading = $state(false);
    let error = $state<string | null>(null);
    let chatHistoryElement: HTMLDivElement | null = $state(null); // For scrolling

    // Function to scroll chat history to bottom
    async function scrollToBottom() {
        await tick(); // Wait for DOM updates
        if (chatHistoryElement) {
            chatHistoryElement.scrollTop = chatHistoryElement.scrollHeight;
        }
    }

    $effect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
        return () => {
            // Cleanup if needed
        };
    });

    async function handleSend() {
        const trimmedInput = currentInput.trim();
        if (!trimmedInput || $isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', content: trimmedInput };
        messages = [...messages, newUserMessage]; // Add user message optimistically
        currentInput = ''; // Clear input
        $isLoading = true;
        $error = null;

        try {
            const response = await api.sendChatMessage(messages); // Send the whole history
            messages = [...messages, response.message]; // Add assistant response

            // --- Crucial Part for Future ---
            // Here, you'd check if the response.message indicates a successful function call
            // that modified the grocery list (e.g., based on specific content or a special property).
            // If so, call the onStateChange callback to trigger a refresh in App.svelte.
            // Example (pseudo-code):
            // if (response.message.content?.includes("Item added successfully")) {
            //     if(onStateChange) onStateChange();
            // }
            // For now, we just call it to simulate a potential change. Remove if not needed yet.
             if(onStateChange) onStateChange();

        } catch (err: any) {
            console.error("Chat error:", err);
            $error = err.message || "Failed to get response from AI.";
            // Optionally remove the user message if the request totally failed? Or add an error message?
            messages = [...messages, { role: 'assistant', content: `Error: ${$error}` }];
        } finally {
            $isLoading = false;
            await tick(); // Ensure DOM updated before scrolling again
            scrollToBottom();
        }
    }

     function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            onClose();
        } else if (event.key === 'Enter' && !event.shiftKey) {
             event.preventDefault(); // Prevent newline in textarea
             handleSend();
        }
    }

</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
		on:click={onClose}
        transition:fade={{ duration: 150 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-modal-title"
        on:keydown={handleKeydown}
	>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col w-full max-w-lg h-[70vh] max-h-[600px]"
			on:click|stopPropagation
		>
			<h2 id="chat-modal-title" class="text-lg font-semibold p-4 border-b dark:border-gray-600 text-gray-900 dark:text-white">AI Shopping Assistant</h2>

            <!-- Chat History -->
			<div bind:this={chatHistoryElement} class="flex-1 overflow-y-auto p-4 space-y-4">
                {#if messages.length === 0}
                    <p class="text-center text-gray-500 dark:text-gray-400 text-sm">Start chatting to manage your list!</p>
                    <p class="text-center text-gray-500 dark:text-gray-400 text-xs">e.g., "Add milk, eggs, and bread"</p>
                {/if}
				{#each messages as message, i (i)}
					<div class="flex" class:justify-end={message.role === 'user'} class:justify-start={message.role === 'assistant'}>
						<div
							class="max-w-[80%] px-4 py-2 rounded-lg"
							class:bg-blue-500={message.role === 'user'}
							class:text-white={message.role === 'user'}
							class:bg-gray-200={message.role === 'assistant'}
                            class:dark:bg-gray-700={message.role === 'assistant'}
							class:text-gray-900={message.role === 'assistant'}
                            class:dark:text-gray-100={message.role === 'assistant'}
                            class:border={message.role === 'assistant'}
                            class:border-red-500={message.role === 'assistant' && message.content?.startsWith('Error:')}
						>
                            {#if message.content}
							    <p class="text-sm whitespace-pre-wrap">{message.content}</p>
                            {:else if message.role === 'assistant'}
                                <p class="text-sm italic text-gray-500 dark:text-gray-400">[Assistant processing...]</p> <!-- Placeholder if content is null -->
                            {/if}
						</div>
					</div>
				{/each}
                {#if $isLoading}
                    <div class="flex justify-start">
                         <div class="max-w-[80%] px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 animate-pulse">
                             <p class="text-sm">...</p>
                         </div>
                    </div>
                {/if}
			</div>

            <!-- Input Area -->
			<div class="p-4 border-t dark:border-gray-600">
                 {#if $error && !$isLoading} <!-- Show error only if not loading -->
                    <p class="text-xs text-red-500 mb-2">{$error}</p>
                 {/if}
				<div class="flex space-x-2">
					<textarea
						bind:value={currentInput}
						placeholder="Type your message... (e.g., add milk and bread)"
						rows="2"
                        on:keydown={handleKeydown}
						disabled={$isLoading}
						class="flex-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white disabled:opacity-60"
					></textarea>
					<button
						onclick={handleSend}
						disabled={$isLoading || !currentInput.trim()}
						class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Send
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 ml-1">
                            <path d="M3.105 3.105a1.5 1.5 0 0 1 2.122-.001l7.56 7.562a1.5 1.5 0 0 1 0 2.122l-7.56 7.562a1.5 1.5 0 1 1-2.122-2.122L9.536 12 3.105 5.227a1.5 1.5 0 0 1 0-2.122Z" />
                        </svg>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
