// TigerCat Popup Script
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🐅 TigerCat popup loaded!');
    
    // Get references to DOM elements
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    // Set up event listeners
    chatInput.addEventListener('input', handleChatInput);
    chatInput.addEventListener('keypress', handleChatKeypress);
    sendBtn.addEventListener('click', handleSendMessage);
    
    // Focus on input for immediate typing
    chatInput.focus();
    
    /**
     * Handle chat input changes
     */
    function handleChatInput() {
        const hasText = chatInput.value.trim().length > 0;
        sendBtn.disabled = !hasText;
    }
    
    /**
     * Handle enter key in chat input
     */
    function handleChatKeypress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }
    
    /**
     * Handle sending a chat message
     */
    async function handleSendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Clear input and disable send button
        chatInput.value = '';
        sendBtn.disabled = true;
        
        // Show typing indicator
        const typingMessage = addMessageToChat('ai', 'Thinking...');
        
        try {
            // Send to background script for AI processing
            const response = await chrome.runtime.sendMessage({
                action: 'ai_chat_request',
                query: message
            });
            
            // Remove typing indicator
            chatMessages.removeChild(typingMessage);
            
            if (response.success) {
                addMessageToChat('ai', response.response);
            } else {
                addMessageToChat('ai', `Sorry, I encountered an error: ${response.error}`);
            }
        } catch (error) {
            // Remove typing indicator
            chatMessages.removeChild(typingMessage);
            addMessageToChat('ai', 'Sorry, I\'m having trouble connecting right now. Please try again.');
        }
        
        // Focus back on input
        chatInput.focus();
    }
    
    /**
     * Add message to chat
     */
    function addMessageToChat(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.innerHTML = `
            <span class="message-icon">${type === 'ai' ? '🐅' : '👤'}</span>
            <div class="message-content">
                <p>${content}</p>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }
    
    // Show a welcome message on first install
    chrome.storage.local.get(['firstTime'], (result) => {
        if (result.firstTime !== false) {
            console.log('🐅 Welcome to TigerCat!');
            chrome.storage.local.set({ firstTime: false });
        }
    });
});