// TigerCat Background Service Worker
// Handles AI chat requests

console.log('🐅 TigerCat service worker loaded!');

// Import config from config.js
// Service workers need to use importScripts() to load external scripts
let TIGERCAT_CONFIG = null;

try {
    importScripts('/config.js');
    // Now CONFIG should be available from config.js
    TIGERCAT_CONFIG = CONFIG;
    console.log('🔑 Config loaded from config.js with API key:', 
        TIGERCAT_CONFIG?.OPENAI_API_KEY ? 'Yes ✅' : 'No ❌');
} catch (error) {
    console.error('🐅 Error loading config.js:', error);
    throw new Error('Failed to load config.js - make sure the file exists and contains your API key');
}

// Extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
    console.log('🐅 TigerCat installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        console.log('🐅 Welcome to TigerCat!');
        
        // Set default settings
        chrome.storage.local.set({
            firstTime: true,
            settings: {
                aiModel: 'gpt-4o-mini',
                theme: 'auto'
            }
        });
    }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('🐅 Background received message:', request);
    
    switch (request.action) {
        case 'ai_chat_request':
            handleAIChatRequest(request, sendResponse);
            return true;
            
        case 'canvas_detected':
            handleCanvasDetected(request, sender, sendResponse);
            return true; // Keep message channel open for async response
            
        case 'get_canvas_config':
            handleGetCanvasConfig(request, sendResponse);
            return true;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});



/**
 * Handle AI chat request
 */
async function handleAIChatRequest(request, sendResponse) {
    try {
        console.log('🐅 Processing AI chat request:', request.query);
        
        // Get API key from storage or config
        const { openaiApiKey } = await chrome.storage.local.get(['openaiApiKey']);
        const config = getConfig();
        
        console.log('🔍 API Key Debug:', {
            userKey: openaiApiKey ? 'Set' : 'Not set',
            configKey: config.OPENAI_API_KEY ? 'Set' : 'Not set',
            configKeyStart: config.OPENAI_API_KEY ? config.OPENAI_API_KEY.substring(0, 10) + '...' : 'None'
        });
        
        // Priority: User's stored key > Developer config key
        const apiKey = openaiApiKey || config.OPENAI_API_KEY;
        
        if (!apiKey) {
            sendResponse({
                success: false,
                error: 'OpenAI API key not configured. Please set it in extension settings or config.js'
            });
            return;
        }
        
        console.log('✅ Using API key:', apiKey.substring(0, 10) + '...');
        
        // Make actual GPT API call
        const gptResponse = await callOpenAIAPI(request.query, apiKey);
        
        sendResponse({
            success: true,
            response: gptResponse.response
        });
        
    } catch (error) {
        console.error('🐅 Error processing AI request:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get configuration
 */
function getConfig() {
    // Use directly loaded config
    if (TIGERCAT_CONFIG) {
        return TIGERCAT_CONFIG;
    }
    
    // Default configuration
    return {
        OPENAI_MODEL: 'gpt-4o-mini',
        OPENAI_MAX_TOKENS: 1000,
        OPENAI_TEMPERATURE: 0.7
    };
}

/**
 * Call OpenAI GPT API
 */
async function callOpenAIAPI(query, apiKey) {
    const config = getConfig();
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    // Simple system prompt for general AI assistance
    const systemPrompt = `You are TigerCat, a helpful AI assistant. 

You help users by:
- Answering questions on various topics
- Providing explanations and information
- Assisting with learning and problem-solving
- Having friendly conversations

Be helpful, accurate, and engaging in your responses.`;

    const requestBody = {
        model: config.OPENAI_MODEL,
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user", 
                content: query
            }
        ],
        max_tokens: config.OPENAI_MAX_TOKENS,
        temperature: config.OPENAI_TEMPERATURE
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 OpenAI API Error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            apiKey: apiKey.substring(0, 10) + '...'
        });
        
        if (response.status === 401) {
            throw new Error('OpenAI API authentication failed. Please check your API key format and validity.');
        } else if (response.status === 403) {
            throw new Error('OpenAI API access denied. Check your permissions.');
        } else if (response.status === 429) {
            throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        } else {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }
    }

    const data = await response.json();
    
    return {
        response: data.choices[0].message.content
    };
}

/**
 * Handle Canvas page detection notification
 */
async function handleCanvasDetected(request, sender, sendResponse) {
    console.log('🐅 Canvas detected on tab:', sender.tab?.id, request.data);
    
    const canvasData = request.data;
    
    // Store Canvas detection info for this tab
    if (sender.tab?.id) {
        await chrome.storage.local.set({
            [`canvas_${sender.tab.id}`]: {
                detected: true,
                info: canvasData,
                timestamp: new Date().toISOString()
            }
        });
    }
    
    // Auto-save Canvas Base URL for API calls if we have a valid one
    if (canvasData.canvasBaseUrl && canvasData.canvasBaseUrl.startsWith('https://')) {
        try {
            // Get current stored Canvas URL
            const stored = await chrome.storage.local.get(['canvasBaseUrl', 'canvasAutoDetected']);
            
            // Only update if:
            // 1. No URL is currently stored, OR
            // 2. The stored URL is different from detected URL, OR  
            // 3. The stored URL was not auto-detected (user preference should override)
            const shouldUpdate = !stored.canvasBaseUrl || 
                                stored.canvasBaseUrl !== canvasData.canvasBaseUrl ||
                                !stored.canvasAutoDetected;
            
            if (shouldUpdate) {
                await chrome.storage.local.set({
                    canvasBaseUrl: canvasData.canvasBaseUrl,
                    canvasAutoDetected: true,
                    canvasInstitutionName: canvasData.institutionName || 'Unknown',
                    canvasAutoDetectedTime: new Date().toISOString()
                });
                
                console.log('🐅 Auto-saved Canvas Base URL:', canvasData.canvasBaseUrl);
            } else {
                console.log('🐅 Canvas URL already configured, not overriding');
            }
            
        } catch (error) {
            console.error('🐅 Error saving Canvas URL:', error);
        }
    }
    
    sendResponse({ success: true });
}

/**
 * Handle getting Canvas configuration
 */
async function handleGetCanvasConfig(request, sendResponse) {
    try {
        const stored = await chrome.storage.local.get([
            'canvasBaseUrl', 
            'canvasApiKey',
            'canvasAutoDetected',
            'canvasInstitutionName',
            'canvasAutoDetectedTime'
        ]);
        
        sendResponse({
            success: true,
            config: {
                baseUrl: stored.canvasBaseUrl || null,
                apiKey: stored.canvasApiKey || null,
                autoDetected: stored.canvasAutoDetected || false,
                institutionName: stored.canvasInstitutionName || null,
                lastDetected: stored.canvasAutoDetectedTime || null
            }
        });
        
    } catch (error) {
        console.error('🐅 Error getting Canvas config:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Basic Canvas API function for testing auto-detected URL
 */
async function callCanvasAPI(endpoint, apiKey, baseUrl) {
    if (!baseUrl || !apiKey) {
        throw new Error('Canvas Base URL and API Key are required');
    }
    
    // Clean up the base URL and endpoint
    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const fullUrl = `${cleanBaseUrl}/api/v1${cleanEndpoint}`;
    
    console.log('🔗 Canvas API call:', fullUrl);
    
    const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 Canvas API Error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            url: fullUrl
        });
        
        if (response.status === 401) {
            throw new Error('Canvas API authentication failed. Please check your API key.');
        } else if (response.status === 403) {
            throw new Error('Canvas API access denied. Check your permissions.');
        } else if (response.status === 404) {
            throw new Error('Canvas API endpoint not found. Check your Canvas URL.');
        } else {
            throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
        }
    }
    
    const data = await response.json();
    return data;
}

/**
 * Get configuration
 */
function getConfig() {
    // Use directly loaded config
    if (TIGERCAT_CONFIG) {
        return TIGERCAT_CONFIG;
    }
    
    // Default configuration
    return {
        OPENAI_MODEL: 'gpt-4o-mini',
        OPENAI_MAX_TOKENS: 1000,
        OPENAI_TEMPERATURE: 0.7
    };
}

// Keep service worker alive
chrome.runtime.onSuspend.addListener(() => {
    console.log('🐅 TigerCat service worker suspending...');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('🐅 TigerCat service worker starting up...');
});
