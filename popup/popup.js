// TigerCat Popup Script
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🐅 TigerCat popup loaded!');
    
    // Get references to DOM elements
    const statusText = document.getElementById('status-text');
    const activateBtn = document.getElementById('activate-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    // Check if user is currently on a Canvas page
    await checkCanvasStatus();
    
    // Set up event listeners
    activateBtn.addEventListener('click', handleActivate);
    settingsBtn.addEventListener('click', handleSettings);
    chatInput.addEventListener('input', handleChatInput);
    chatInput.addEventListener('keypress', handleChatKeypress);
    sendBtn.addEventListener('click', handleSendMessage);
    
    /**
     * Check if the current active tab is a Canvas page
     */
    async function checkCanvasStatus() {
        try {
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                updateStatus('No active tab', 'not-detected');
                return;
            }
            
            const url = tab.url;
            const isCanvas = isCanvasURL(url);
            
            if (isCanvas) {
                updateStatus('Canvas Detected!', 'detected');
                activateBtn.textContent = 'Open TigerCat on Canvas';
                activateBtn.disabled = false;
            } else {
                updateStatus('Not on Canvas', 'not-detected');
                activateBtn.textContent = 'Navigate to Canvas first';
                activateBtn.disabled = true;
            }
            
        } catch (error) {
            console.error('Error checking Canvas status:', error);
            updateStatus('Error checking status', 'error');
        }
    }
    
    /**
     * Check if a URL is a Canvas LMS URL
     */
    function isCanvasURL(url) {
        if (!url) return false;
        
        const canvasPatterns = [
            /.*\.instructure\.com.*/,
            /.*\.canvas\..*/,
            /.*canvas.*/i
        ];
        
        return canvasPatterns.some(pattern => pattern.test(url));
    }
    
    /**
     * Update the status display
     */
    function updateStatus(text, type) {
        statusText.textContent = text;
        statusText.className = 'status-value';
        
        switch (type) {
            case 'detected':
                statusText.classList.add('status-canvas-detected');
                break;
            case 'not-detected':
                statusText.classList.add('status-canvas-not-detected');
                break;
            case 'loading':
                statusText.classList.add('status-loading');
                break;
            default:
                break;
        }
    }
    
    /**
     * Handle activate button click
     */
    async function handleActivate() {
        try {
            updateStatus('Activating...', 'loading');
            
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                updateStatus('No active tab', 'error');
                return;
            }
            
            // Send message to content script to activate TigerCat
            await chrome.tabs.sendMessage(tab.id, {
                action: 'activate_tigercat',
                message: 'Hello from TigerCat! 🐅'
            });
            
            updateStatus('TigerCat Activated!', 'detected');
            
            // Close popup after activation
            setTimeout(() => {
                window.close();
            }, 1000);
            
        } catch (error) {
            console.error('Error activating TigerCat:', error);
            updateStatus('Activation failed', 'error');
        }
    }
    
    /**
     * Handle settings button click
     */
    async function handleSettings() {
        // Get current Canvas API key
        const { canvasApiKey } = await chrome.storage.local.get(['canvasApiKey']);
        
        // Direct Canvas API key configuration
        await configureCanvasKey(canvasApiKey);
    }
    
    /**
     * Configure Canvas API Key
     */
    async function configureCanvasKey(currentKey) {
        const apiKey = prompt(
            '🐅 Canvas API Key Setup\n\n' +
            'To enable course analysis:\n\n' +
            '1. Go to Canvas → Account → Settings\n' +
            '2. Scroll to "Approved Integrations"\n' +
            '3. Click "+ New Access Token"\n' +
            '4. Purpose: "TigerCat Extension"\n' +
            '5. Copy and paste the token below\n\n' +
            'Canvas API Token:',
            currentKey || ''
        );
        
        if (apiKey !== null) { // User didn't cancel
            if (apiKey.trim()) {
                // Basic validation for Canvas tokens
                if (apiKey.length > 30) {
                    await chrome.storage.local.set({ canvasApiKey: apiKey.trim() });
                    alert('✅ Canvas API key saved!\n\nCourse features are now active.');
                } else {
                    alert('❌ Token seems too short. Please copy the complete token.');
                }
            } else {
                // Remove API key
                await chrome.storage.local.remove(['canvasApiKey']);
                alert('Canvas API key removed.');
            }
        }
    }
    
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
                query: message,
                context: [] // We'll add course context later
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
