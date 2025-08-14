// TigerCat Popup Script
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🐅 TigerCat popup loaded!');
    
    // Get references to DOM elements
    const statusText = document.getElementById('status-text');
    const welcomeMessage = document.getElementById('welcome-message');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    // Check Canvas status first
    await checkCanvasStatus();
    
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
    
    /**
     * Check if user is currently on a Canvas page
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
            
            // Check if URL looks like Canvas
            if (isCanvasURL(url)) {
                // Try to get detailed info from content script
                try {
                    const response = await chrome.tabs.sendMessage(tab.id, {
                        action: 'check_canvas_status'
                    });
                    
                    if (response && response.isCanvas) {
                        updateStatus('Canvas Detected!', 'detected', response.canvasInfo);
                    } else {
                        updateStatus('Canvas URL but not loaded', 'partial');
                    }
                } catch (error) {
                    // Content script might not be loaded yet
                    updateStatus('Canvas URL detected', 'partial');
                }
            } else {
                updateStatus('Not on Canvas', 'not-detected');
            }
            
        } catch (error) {
            console.error('Error checking Canvas status:', error);
            updateStatus('Status check failed', 'error');
        }
    }
    
    /**
     * Check if a URL looks like Canvas
     */
    function isCanvasURL(url) {
        if (!url) return false;
        
        const canvasPatterns = [
            /.*\.instructure\.com.*/i
        ];
        
        return canvasPatterns.some(pattern => pattern.test(url));
    }
    
    /**
     * Update the status display
     */
    function updateStatus(text, type, canvasInfo = null) {
        statusText.textContent = text;
        statusText.className = 'status-value';
        
        // Update welcome message based on Canvas status
        if (type === 'detected' && canvasInfo) {
            let contextMessage = 'Ask me anything!';
            
            if (canvasInfo.institutionName) {
                contextMessage = `I can help with your ${canvasInfo.institutionName} courses!`;
            } else if (canvasInfo.pageType) {
                contextMessage = `I can help with this ${canvasInfo.pageType} page!`;
            } else {
                contextMessage = 'I can help with your Canvas courses!';
            }
            
            // Add Canvas URL info if available
            if (canvasInfo.canvasBaseUrl) {
                contextMessage += ` (${canvasInfo.canvasBaseUrl})`;
            }
            
            welcomeMessage.textContent = contextMessage;
            
            // Check and show Canvas configuration status
            checkCanvasConfig(canvasInfo);
        } else {
            welcomeMessage.textContent = 'Ask me anything!';
        }
        
        // Add CSS classes for styling
        switch (type) {
            case 'detected':
                statusText.classList.add('status-canvas-detected');
                break;
            case 'partial':
                statusText.classList.add('status-canvas-partial');
                break;
            case 'not-detected':
                statusText.classList.add('status-canvas-not-detected');
                break;
            case 'loading':
                statusText.classList.add('status-loading');
                break;
            case 'error':
                statusText.classList.add('status-error');
                break;
            default:
                break;
        }
    }
    
    /**
     * Check Canvas configuration status
     */
    async function checkCanvasConfig(detectedCanvasInfo) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'get_canvas_config'
            });
            
            if (response.success && response.config) {
                const config = response.config;
                console.log('🐅 Canvas config:', config);
                
                // Add config info to chat if URL was auto-detected
                if (config.autoDetected && config.baseUrl) {
                    const configMessage = `🔗 Canvas URL auto-detected: ${config.baseUrl}`;
                    if (config.institutionName) {
                        configMessage += ` (${config.institutionName})`;
                    }
                    addMessageToChat('ai', configMessage);
                    
                    // Show API key status
                    if (config.apiKey) {
                        addMessageToChat('ai', '✅ Canvas API key configured - ready for Canvas features!');
                    } else {
                        addMessageToChat('ai', '⚠️ Canvas URL detected but no API key set. Canvas features limited.');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking Canvas config:', error);
        }
    }
    
    // Show a welcome message on first install
    chrome.storage.local.get(['firstTime'], (result) => {
        if (result.firstTime !== false) {
            console.log('🐅 Welcome to TigerCat!');
            chrome.storage.local.set({ firstTime: false });
        }
    });
});