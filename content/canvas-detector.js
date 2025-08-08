// TigerCat Canvas Content Script
// This script runs on Canvas pages and handles the TigerCat UI injection

console.log('🐅 TigerCat content script loaded on:', window.location.href);

// Global TigerCat state
let tigerCatActive = false;
let tigerCatBox = null;

// Initialize TigerCat when page loads
document.addEventListener('DOMContentLoaded', initializeTigerCat);

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTigerCat);
} else {
    initializeTigerCat();
}

/**
 * Initialize TigerCat on Canvas pages
 */
function initializeTigerCat() {
    console.log('🐅 Initializing TigerCat on Canvas...');
    
    // Check if we're actually on a Canvas page
    if (!isCanvasPage()) {
        console.log('🐅 Not a Canvas page, TigerCat will not activate');
        return;
    }
    
    console.log('🐅 Canvas page detected! TigerCat ready to activate.');
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Auto-show TigerCat box after a short delay (for demo purposes)
    setTimeout(() => {
        showTigerCatBox('🐅 TigerCat is ready! Welcome to your Canvas AI Assistant!');
    }, 2000);
}

/**
 * Check if current page is a Canvas LMS page
 */
function isCanvasPage() {
    const url = window.location.href;
    const canvasIndicators = [
        document.querySelector('#application'),
        document.querySelector('.ic-app-header'),
        document.querySelector('[data-testid="dashboard"]'),
        url.includes('instructure.com'),
        url.includes('canvas'),
        document.title.includes('Canvas')
    ];
    
    return canvasIndicators.some(indicator => indicator);
}

/**
 * Handle messages from popup or background script
 */
function handleMessage(request, sender, sendResponse) {
    console.log('🐅 Received message:', request);
    
    switch (request.action) {
        case 'activate_tigercat':
            showTigerCatBox(request.message);
            sendResponse({ success: true, message: 'TigerCat activated!' });
            break;
            
        case 'deactivate_tigercat':
            hideTigerCatBox();
            sendResponse({ success: true, message: 'TigerCat deactivated!' });
            break;
            
        case 'check_canvas_status':
            sendResponse({ 
                isCanvas: isCanvasPage(),
                url: window.location.href,
                title: document.title
            });
            break;
            
        default:
            sendResponse({ success: false, message: 'Unknown action' });
    }
}

/**
 * Show the TigerCat box on the page
 */
function showTigerCatBox(message = '🐅 TigerCat AI Assistant') {
    // Remove existing box if present
    hideTigerCatBox();
    
    // Create the TigerCat box
    tigerCatBox = createTigerCatBox(message);
    
    // Add to page
    document.body.appendChild(tigerCatBox);
    
    // Set active state
    tigerCatActive = true;
    
    console.log('🐅 TigerCat box displayed!');
}

/**
 * Hide the TigerCat box
 */
function hideTigerCatBox() {
    if (tigerCatBox && tigerCatBox.parentNode) {
        tigerCatBox.parentNode.removeChild(tigerCatBox);
    }
    tigerCatBox = null;
    tigerCatActive = false;
}

/**
 * Create the TigerCat UI box
 */
function createTigerCatBox(message) {
    const box = document.createElement('div');
    box.id = 'tigercat-box';
    box.className = 'tigercat-container';
    
    box.innerHTML = `
        <div class="tigercat-header">
            <div class="tigercat-logo">🐅</div>
            <div class="tigercat-title">TigerCat AI</div>
            <div class="tigercat-controls">
                <button class="tigercat-minimize" title="Minimize">−</button>
                <button class="tigercat-close" title="Close">×</button>
            </div>
        </div>
        <div class="tigercat-content">
            <div class="tigercat-message">
                <p>${message}</p>
                <div class="tigercat-status">
                    <span class="status-dot"></span>
                    <span>Connected to Canvas</span>
                </div>
            </div>
            <div class="tigercat-features">
                <h4>🚀 Features Coming Soon:</h4>
                <ul>
                    <li>📚 Analyze course documents</li>
                    <li>💬 AI chat about course content</li>
                    <li>📝 Assignment help</li>
                    <li>🔍 Smart course search</li>
                </ul>
            </div>
            <div class="tigercat-actions">
                <button class="tigercat-btn primary">Start Chat</button>
                <button class="tigercat-btn secondary">Settings</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    setupTigerCatEvents(box);
    
    return box;
}

/**
 * Set up event listeners for TigerCat box
 */
function setupTigerCatEvents(box) {
    // Close button
    const closeBtn = box.querySelector('.tigercat-close');
    closeBtn.addEventListener('click', hideTigerCatBox);
    
    // Minimize button
    const minimizeBtn = box.querySelector('.tigercat-minimize');
    minimizeBtn.addEventListener('click', () => {
        box.classList.toggle('minimized');
    });
    
    // Action buttons
    const startChatBtn = box.querySelector('.tigercat-btn.primary');
    startChatBtn.addEventListener('click', () => {
        openChatInterface(box);
    });
    
    const settingsBtn = box.querySelector('.tigercat-btn.secondary');
    settingsBtn.addEventListener('click', () => {
        alert('🐅 Settings panel coming soon!\n\nYou\'ll be able to configure:\n• AI model preferences\n• Canvas API settings\n• Chat behavior');
    });
    
    // Make box draggable
    makeDraggable(box);
}

/**
 * Make the TigerCat box draggable
 */
function makeDraggable(element) {
    const header = element.querySelector('.tigercat-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    function dragStart(e) {
        if (e.target.tagName === 'BUTTON') return; // Don't drag when clicking buttons
        
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        
        if (e.target === header || header.contains(e.target)) {
            isDragging = true;
            header.style.cursor = 'grabbing';
        }
    }
    
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            xOffset = currentX;
            yOffset = currentY;
            
            element.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }
    
    function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        header.style.cursor = 'grab';
    }
}

/**
 * Open chat interface
 */
function openChatInterface(box) {
    // Replace the content with a chat interface
    const content = box.querySelector('.tigercat-content');
    content.innerHTML = `
        <div class="tigercat-chat">
            <div class="chat-messages" id="chat-messages">
                <div class="message ai-message">
                    <span class="message-icon">🐅</span>
                    <div class="message-content">
                        <p>Hello! I'm TigerCat, your Canvas AI assistant.</p>
                        <p>Ask me anything about your course materials, assignments, or need help studying!</p>
                    </div>
                </div>
            </div>
            <div class="chat-input-container">
                <input type="text" id="chat-input" placeholder="Ask about your course content..." maxlength="500">
                <button id="send-btn" class="chat-send-btn">Send</button>
            </div>
            <div class="chat-actions">
                <button class="tigercat-btn secondary" id="back-btn">← Back</button>
                <button class="tigercat-btn secondary" id="clear-btn">Clear Chat</button>
            </div>
        </div>
    `;
    
    // Add chat functionality
    setupChatInterface(box);
}

/**
 * Set up chat interface functionality
 */
function setupChatInterface(box) {
    const chatInput = box.querySelector('#chat-input');
    const sendBtn = box.querySelector('#send-btn');
    const chatMessages = box.querySelector('#chat-messages');
    const backBtn = box.querySelector('#back-btn');
    const clearBtn = box.querySelector('#clear-btn');
    
    // Send message function
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessageToChat('user', message);
        chatInput.value = '';
        sendBtn.disabled = true;
        sendBtn.textContent = 'Thinking...';
        
        try {
            // Send to background script for AI processing
            const response = await chrome.runtime.sendMessage({
                action: 'ai_chat_request',
                query: message,
                context: [] // We'll add course context later
            });
            
            if (response.success) {
                addMessageToChat('ai', response.response);
            } else {
                addMessageToChat('ai', `Sorry, I encountered an error: ${response.error}`);
            }
        } catch (error) {
            addMessageToChat('ai', 'Sorry, I\'m having trouble connecting right now. Please try again.');
        }
        
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
    
    // Add message to chat
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
    }
    
    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    backBtn.addEventListener('click', () => {
        // Go back to main interface
        showTigerCatBox('🐅 TigerCat AI Assistant ready!');
    });
    
    clearBtn.addEventListener('click', () => {
        chatMessages.innerHTML = `
            <div class="message ai-message">
                <span class="message-icon">🐅</span>
                <div class="message-content">
                    <p>Chat cleared! How can I help you?</p>
                </div>
            </div>
        `;
    });
    
    // Focus input
    chatInput.focus();
}

// Export functions for use in other scripts
window.TigerCat = {
    show: showTigerCatBox,
    hide: hideTigerCatBox,
    isActive: () => tigerCatActive
};
