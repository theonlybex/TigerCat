// TigerCat Popup Script
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🐅 TigerCat popup loaded!');
    
    // Get references to DOM elements
    const statusText = document.getElementById('status-text');
    const welcomeMessage = document.getElementById('welcome-message');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const settingsBtn = document.getElementById('settings-btn');
    
    // Check Canvas status first
    await checkCanvasStatus();
    
    // Set up event listeners
    chatInput.addEventListener('input', handleChatInput);
    chatInput.addEventListener('keypress', handleChatKeypress);
    sendBtn.addEventListener('click', handleSendMessage);
    settingsBtn.addEventListener('click', handleSettings);
    
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
            // Check for specific commands first
            const lowerMessage = message.toLowerCase();
            
            // Check if user is asking to read a PDF or specific file
            if (lowerMessage.includes('read') && (lowerMessage.includes('pdf') || lowerMessage.includes('file'))) {
                if (detectedFiles.length > 0) {
                    // Force reading with context even if it's a PDF
                    const response = await chrome.runtime.sendMessage({
                        action: 'ai_chat_with_context',
                        query: message,
                        fileIds: detectedFiles
                    });
                    
                    // Remove typing indicator
                    chatMessages.removeChild(typingMessage);
                    
                    if (response.success) {
                        let responseText = response.response;
                        
                        // Add context indicator
                        if (response.filesProcessed && response.filesProcessed > 0) {
                            const fileContextNote = `\n\n📁 *Processed ${response.filesProcessed} Canvas file${response.filesProcessed > 1 ? 's' : ''}*`;
                            if (response.fileContexts && response.fileContexts.length > 0) {
                                const fileList = response.fileContexts.map(f => `• ${f.filename} (${f.type})`).join('\n');
                                responseText += `${fileContextNote}:\n${fileList}`;
                            } else {
                                responseText += fileContextNote;
                            }
                        }
                        
                        addMessageToChat('ai', responseText);
                    } else {
                        addMessageToChat('ai', `Sorry, I encountered an error reading the files: ${response.error}`);
                    }
                    
                    // Re-enable send button and focus input
                    sendBtn.disabled = false;
                    chatInput.focus();
                    return;
                } else {
                    addMessageToChat('ai', 'I don\'t see any files on this Canvas page to read. Make sure you\'re on a page with PDF files or documents, and that you have your Canvas API key configured in settings.');
                    // Remove typing indicator
                    chatMessages.removeChild(typingMessage);
                    sendBtn.disabled = false;
                    chatInput.focus();
                    return;
                }
            }
            
            // Check if we should use Canvas file context
            let response;
            if (detectedFiles.length > 0) {
                // Use context-enhanced chat with Canvas files
                response = await chrome.runtime.sendMessage({
                    action: 'ai_chat_with_context',
                    query: message,
                    fileIds: detectedFiles
                });
            } else {
                // Use regular AI chat
                response = await chrome.runtime.sendMessage({
                    action: 'ai_chat_request',
                    query: message
                });
            }
            
            // Remove typing indicator
            chatMessages.removeChild(typingMessage);
            
            if (response.success) {
                let responseText = response.response;
                
                // Add context indicator if files were processed
                if (response.filesProcessed && response.filesProcessed > 0) {
                    const fileContextNote = `\n\n📁 *Analyzed ${response.filesProcessed} Canvas file${response.filesProcessed > 1 ? 's' : ''}*`;
                    if (response.fileContexts && response.fileContexts.length > 0) {
                        const fileList = response.fileContexts.map(f => `• ${f.filename} (${f.type})`).join('\n');
                        responseText += `${fileContextNote}:\n${fileList}`;
                    } else {
                        responseText += fileContextNote;
                    }
                }
                
                addMessageToChat('ai', responseText);
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
                        // Also check Smart Search status
                        checkSmartSearchStatus(tab.id);
                        // Check for Canvas files on current page
                        detectCanvasFiles(tab.id, response.canvasInfo);
                    } else {
                        updateStatus('Canvas URL but not loaded', 'partial');
                    }
                } catch (error) {
                    // Content script might not be loaded yet
                    updateStatus('Canvas URL detected', 'partial');
                }
            } else {
                updateStatus('Not on Canvas', 'not-detected');
                hideSmartSearchStatus();
            }
            
        } catch (error) {
            console.error('Error checking Canvas status:', error);
            updateStatus('Status check failed', 'error');
        }
    }
    
    /**
     * Check Smart Search status on the current Canvas page
     */
    async function checkSmartSearchStatus(tabId) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, {
                action: 'get_smart_search_status'
            });
            
            if (response && response.success) {
                updateSmartSearchStatus(response.smartSearchEnabled, response.detectionResults);
            } else {
                // Hide Smart Search indicator if not available
                hideSmartSearchStatus();
            }
        } catch (error) {
            console.error('Error checking Smart Search status:', error);
            hideSmartSearchStatus();
        }
    }
    
    /**
     * Update Smart Search status indicator
     */
    function updateSmartSearchStatus(enabled, detectionResults) {
        const smartSearchElement = document.getElementById('smart-search-status');
        const smartSearchText = document.getElementById('smart-search-text');
        
        if (enabled) {
            smartSearchElement.style.display = 'block';
            
            // Update text based on detection type
            if (detectionResults?.smartSearchApiAvailable) {
                smartSearchText.textContent = 'Smart Search API Detected!';
            } else if (detectionResults?.globalSearch) {
                smartSearchText.textContent = 'Global Search Detected!';
            } else if (detectionResults?.courseSearch) {
                smartSearchText.textContent = 'Course Search Detected!';
            } else {
                smartSearchText.textContent = 'Smart Search Detected!';
            }
            
            console.log('🔍 Smart Search status updated:', detectionResults);
        } else {
            hideSmartSearchStatus();
        }
    }
    
    /**
     * Hide Smart Search status indicator
     */
    function hideSmartSearchStatus() {
        const smartSearchElement = document.getElementById('smart-search-status');
        smartSearchElement.style.display = 'none';
    }
    
    /**
     * Detect Canvas files on current page
     */
    let detectedFiles = [];
    async function detectCanvasFiles(tabId, canvasInfo) {
        try {
            // Extract file IDs from current page URL and DOM
            const fileIds = await extractFileIdsFromPage(tabId);
            
            if (fileIds.length > 0) {
                console.log('📁 Detected Canvas files on page:', fileIds);
                detectedFiles = fileIds;
                
                // Update welcome message to indicate file context is available
                const currentWelcome = welcomeMessage.textContent;
                if (!currentWelcome.includes('files')) {
                    welcomeMessage.textContent = `${currentWelcome} I can read ${fileIds.length} file${fileIds.length > 1 ? 's' : ''} on this page!`;
                }
            } else {
                detectedFiles = [];
            }
        } catch (error) {
            console.error('Error detecting Canvas files:', error);
            detectedFiles = [];
        }
    }
    
    /**
     * Extract file IDs from current Canvas page
     */
    async function extractFileIdsFromPage(tabId) {
        try {
            // Inject a content script to extract file information
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: extractCanvasFileIds
            });
            
            if (results && results[0] && results[0].result) {
                return results[0].result;
            }
            
            return [];
        } catch (error) {
            console.error('Error extracting file IDs:', error);
            return [];
        }
    }
    
    /**
     * Function to run in content script context to extract file IDs
     */
    function extractCanvasFileIds() {
        const fileIds = [];
        
        // Look for file links in various formats
        const fileSelectors = [
            'a[href*="/files/"]',
            'a[href*="/courses/"][href*="/files/"]',
            '[data-file-id]',
            '.file-link',
            '.attachment-link'
        ];
        
        fileSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                let fileId = null;
                
                // Extract from data attribute
                if (element.dataset.fileId) {
                    fileId = element.dataset.fileId;
                }
                // Extract from href
                else if (element.href) {
                    const fileMatch = element.href.match(/\/files\/(\d+)/);
                    if (fileMatch) {
                        fileId = fileMatch[1];
                    }
                }
                
                if (fileId && !fileIds.includes(fileId)) {
                    fileIds.push(fileId);
                }
            });
        });
        
        // Also check for file download links
        const downloadLinks = document.querySelectorAll('a[href*="download"]');
        downloadLinks.forEach(link => {
            const fileMatch = link.href.match(/\/files\/(\d+)/);
            if (fileMatch) {
                const fileId = fileMatch[1];
                if (!fileIds.includes(fileId)) {
                    fileIds.push(fileId);
                }
            }
        });
        
        console.log('🔍 Found file IDs on page:', fileIds);
        return fileIds;
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
     * Handle settings button click
     */
    async function handleSettings() {
        try {
            // Get current Canvas API key
            const { canvasApiKey } = await chrome.storage.local.get(['canvasApiKey']);
            
            const apiKey = prompt(
                '🐅 Canvas API Key Setup\n\n' +
                'To enable Canvas features:\n\n' +
                '1. Go to Canvas → Account → Settings\n' +
                '2. Scroll to "Approved Integrations"\n' +
                '3. Click "+ New Access Token"\n' +
                '4. Purpose: "TigerCat Extension"\n' +
                '5. Copy and paste the token below\n\n' +
                'Canvas API Token:',
                canvasApiKey || ''
            );
            
            if (apiKey !== null) { // User didn't cancel
                if (apiKey.trim()) {
                    // Basic validation for Canvas tokens
                    if (apiKey.length > 30) {
                        await chrome.storage.local.set({ canvasApiKey: apiKey.trim() });
                        addMessageToChat('ai', '✅ Canvas API key saved! Canvas features are now active.');
                        
                        // Update welcome message to show API key is configured
                        const currentConfig = await chrome.runtime.sendMessage({
                            action: 'get_canvas_config'
                        });
                        
                        if (currentConfig.success) {
                            addMessageToChat('ai', `🛡️ Ready for Canvas API calls to ${currentConfig.config.baseUrl}`);
                        }
                    } else {
                        addMessageToChat('ai', '❌ Token seems too short. Please copy the complete token.');
                    }
                } else {
                    // Remove API key
                    await chrome.storage.local.remove(['canvasApiKey']);
                    addMessageToChat('ai', '🗑️ Canvas API key removed.');
                }
            }
        } catch (error) {
            console.error('Error in settings:', error);
            addMessageToChat('ai', 'Error accessing settings. Please try again.');
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
                    let configMessage = `🔗 Canvas URL auto-detected: ${config.baseUrl}`;
                    if (config.institutionName) {
                        configMessage += ` (${config.institutionName})`;
                    }
                    addMessageToChat('ai', configMessage);
                    
                    // Show API key status
                    if (config.apiKeySet) {
                        addMessageToChat('ai', '✅ Canvas API key configured - ready for Canvas features!');
                    } else {
                        addMessageToChat('ai', '⚠️ Canvas URL detected but no API key set. Click ⚙️ to add your Canvas API key.');
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