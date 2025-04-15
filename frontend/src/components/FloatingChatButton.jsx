import React from 'react';

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-3.694 8.25-8.25 8.25a9.065 9.065 0 0 1-3.483-.655l-4.076 1.296a.75.75 0 0 1-.976-.976l1.296-4.076A9.065 9.065 0 0 1 3 12c0-4.556 3.694-8.25 8.25-8.25S21 7.444 21 12Z" />
    </svg>
);

function FloatingChatButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            className="btn btn-primary btn-circle btn-lg fixed bottom-6 right-6 z-40 shadow-lg transition-transform transform hover:scale-105"
            aria-label="Open AI Chat"
            title="Open AI Chat"
        >
           <ChatIcon />
        </button>
    );
}

export default FloatingChatButton;
