// src/components/ChatModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../lib/api';

// Send Icon
const SendIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1">
         <path d="M3.105 3.105a1.5 1.5 0 0 1 2.122-.001l7.56 7.562a1.5 1.5 0 0 1 0 2.122l-7.56 7.562a1.5 1.5 0 1 1-2.122-2.122L9.536 12 3.105 5.227a1.5 1.5 0 0 1 0-2.122Z" />
     </svg>
);

function ChatModal({ show, onClose, onStateChange }) {
    const [messages, setMessages] = useState([]);
    const [currentInput, setCurrentInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const chatHistoryRef = useRef(null);

    useEffect(() => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    }, [messages]);


    const handleSend = useCallback(async () => {
        const trimmedInput = currentInput.trim();
        if (!trimmedInput || isLoading) return;

        const newUserMessage = { role: 'user', content: trimmedInput };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages); // Optimistic update of user message
        setCurrentInput('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.sendChatMessage(updatedMessages);
            setMessages(prevMessages => [...prevMessages, response.message]);
            if (response.message?.content?.toLowerCase().includes("list updated") ||
                response.message?.content?.toLowerCase().includes("added") ||
                response.message?.content?.toLowerCase().includes("removed") ||
                response.message?.content?.toLowerCase().includes("deleted") ) {
                if(onStateChange) onStateChange();
            }

        } catch (err) {
            console.error("Chat error:", err);
            const errorMessage = err.message || "Failed to get response from AI.";
            setError(errorMessage);
            setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: `Error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [currentInput, isLoading, messages, onStateChange]);

     const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape') {
            onClose();
        } else if (event.key === 'Enter' && !event.shiftKey) {
             event.preventDefault(); // Prevent newline in textarea
             handleSend();
        }
    }, [onClose, handleSend]);

     useEffect(() => {
        if (show) {
            document.addEventListener('keydown', handleKeyDown);
             const chatInput = document.getElementById('chat-input');
             chatInput?.focus();
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [show, handleKeyDown]);


    if (!show) {
        return null;
    }

    return (
        <dialog id="chat_modal" className="modal modal-open">
            {/* Removed outer div click - use backdrop */}
            <div className="modal-box flex flex-col w-11/12 max-w-lg h-[70vh] max-h-[600px] p-0"> {/* Control padding manually */}
                 <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10">✕</button>
                <h3 id="chat-modal-title" className="font-bold text-lg p-4 border-b border-base-300">AI Shopping Assistant</h3>

                {/* Chat History */}
                <div ref={chatHistoryRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && !isLoading && (
                         <div className="text-center text-base-content/70 text-sm">
                            <p>Start chatting to manage your list!</p>
                            <p className="text-xs mt-1">e.g., "Add milk, eggs, and bread"</p>
                         </div>
                    )}
                    {messages.map((message, i) => (
                        <div key={i} className={`chat ${message.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                            <div
                                className={`chat-bubble ${
                                    message.role === 'user' ? 'chat-bubble-primary' : ''
                                } ${
                                    message.role === 'assistant' && message.content?.startsWith('Error:') ? 'chat-bubble-error' : ''
                                } text-sm whitespace-pre-wrap`}
                            >
                                {message.content || (message.role === 'assistant' ? '[Thinking...]' : '')}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="chat chat-start">
                            <div className="chat-bubble">
                                <span className="loading loading-dots loading-sm"></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-base-300">
                    {error && !isLoading && (
                        <p className="text-xs text-error mb-2">{error}</p>
                    )}
                    <div className="flex space-x-2">
                        <textarea
                            id="chat-input"
                            value={currentInput}
                            onChange={(e) => setCurrentInput(e.target.value)}
                            onKeyDown={handleKeyDown} // Local handler for Enter/Shift+Enter
                            placeholder="Type your message..."
                            rows="2"
                            disabled={isLoading}
                            className="textarea textarea-bordered flex-1 text-sm" // DaisyUI textarea
                        ></textarea>
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !currentInput.trim()}
                            className="btn btn-primary self-end" // Align button to bottom of textarea
                        >
                            Send <SendIcon/>
                        </button>
                    </div>
                </div>
            </div>
            {/* Click outside to close */}
             <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
             </form>
        </dialog>
    );
}

export default ChatModal;
