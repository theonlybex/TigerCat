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
                theme: 'auto',
                autoOpenOnCanvas: true  // Enable auto-open by default
            }
        });
    }
});

// Handle action button click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
    console.log('🐅 Extension icon clicked, opening side panel');
    try {
        await chrome.sidePanel.open({ tabId: tab.id });
        console.log('✅ Side panel opened via icon click');
    } catch (error) {
        console.error('❌ Error opening side panel:', error);
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
            
        case 'get_canvas_file_content':
            handleGetCanvasFileContent(request, sendResponse);
            return true;
            
        case 'ai_chat_with_context':
            handleAIChatWithContext(request, sendResponse);
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
                
                // Check if we should auto-open the extension
                await handleAutoOpenExtension(sender.tab);
            } else {
                console.log('🐅 Canvas URL already configured, not overriding');
                
                // Still check for auto-open even if URL wasn't updated
                await handleAutoOpenExtension(sender.tab);
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
                apiKey: stored.canvasApiKey ? 'configured' : null, // Don't expose actual key
                apiKeySet: Boolean(stored.canvasApiKey), // Just indicate if set
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
 * Handle Canvas file content retrieval
 */
async function handleGetCanvasFileContent(request, sendResponse) {
    try {
        console.log('🔍 Getting Canvas file content:', request);
        
        const { fileId, courseId } = request;
        if (!fileId) {
            sendResponse({
                success: false,
                error: 'File ID is required'
            });
            return;
        }
        
        // Get Canvas configuration
        const stored = await chrome.storage.local.get(['canvasBaseUrl', 'canvasApiKey']);
        
        if (!stored.canvasBaseUrl || !stored.canvasApiKey) {
            sendResponse({
                success: false,
                error: 'Canvas API configuration missing. Please set Canvas API key in settings.'
            });
            return;
        }
        
        // Get file information first
        const fileInfo = await callCanvasAPI(`/files/${fileId}`, stored.canvasApiKey, stored.canvasBaseUrl);
        
        console.log('📄 File info retrieved:', fileInfo);
        
        // Check if file is text-based and readable
        if (!isReadableFileType(fileInfo)) {
            sendResponse({
                success: false,
                error: `File type "${fileInfo.content_type}" is not supported for content reading`,
                fileInfo: fileInfo
            });
            return;
        }
        
        // Get file content
        const fileContent = await getCanvasFileContent(fileInfo, stored.canvasApiKey, stored.canvasBaseUrl);
        
        sendResponse({
            success: true,
            fileInfo: fileInfo,
            content: fileContent,
            contentLength: fileContent.length,
            readableType: getReadableFileType(fileInfo)
        });
        
    } catch (error) {
        console.error('🚨 Error getting Canvas file content:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Handle AI chat with Canvas file context
 */
async function handleAIChatWithContext(request, sendResponse) {
    try {
        console.log('🤖 Processing AI chat with Canvas context:', request);
        
        const { query, fileIds, courseId } = request;
        
        if (!query) {
            sendResponse({
                success: false,
                error: 'Query is required'
            });
            return;
        }
        
        let contextData = '';
        let fileContexts = [];
        
        // Get file content if file IDs provided
        if (fileIds && fileIds.length > 0) {
            console.log('📁 Retrieving content for files:', fileIds);
            
            for (const fileId of fileIds) {
                try {
                    const fileResponse = await handleGetCanvasFileContentInternal(fileId, courseId);
                    if (fileResponse.success) {
                        fileContexts.push({
                            filename: fileResponse.fileInfo.filename,
                            content: fileResponse.content,
                            type: fileResponse.readableType
                        });
                        
                        contextData += `\n\n--- File: ${fileResponse.fileInfo.filename} ---\n${fileResponse.content}`;
                    }
                } catch (error) {
                    console.error(`🚨 Error reading file ${fileId}:`, error);
                }
            }
        }
        
        // Build enhanced prompt with context
        let enhancedQuery = query;
        if (contextData) {
            enhancedQuery = `Context from Canvas files:${contextData}\n\n---\n\nUser Question: ${query}\n\nPlease answer the question using the provided file context when relevant.`;
        }
        
        // Get API key for OpenAI
        const { openaiApiKey } = await chrome.storage.local.get(['openaiApiKey']);
        const config = getConfig();
        const apiKey = openaiApiKey || config.OPENAI_API_KEY;
        
        if (!apiKey) {
            sendResponse({
                success: false,
                error: 'OpenAI API key not configured'
            });
            return;
        }
        
        // Make AI API call with context
        const gptResponse = await callOpenAIAPI(enhancedQuery, apiKey);
        
        sendResponse({
            success: true,
            response: gptResponse.response,
            filesProcessed: fileContexts.length,
            fileContexts: fileContexts.map(f => ({ filename: f.filename, type: f.type }))
        });
        
    } catch (error) {
        console.error('🚨 Error in AI chat with context:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Internal function to get Canvas file content (for reuse)
 */
async function handleGetCanvasFileContentInternal(fileId, courseId) {
    const stored = await chrome.storage.local.get(['canvasBaseUrl', 'canvasApiKey']);
    
    if (!stored.canvasBaseUrl || !stored.canvasApiKey) {
        throw new Error('Canvas API configuration missing');
    }
    
    const fileInfo = await callCanvasAPI(`/files/${fileId}`, stored.canvasApiKey, stored.canvasBaseUrl);
    
    if (!isReadableFileType(fileInfo)) {
        throw new Error(`File type "${fileInfo.content_type}" is not supported`);
    }
    
    const fileContent = await getCanvasFileContent(fileInfo, stored.canvasApiKey, stored.canvasBaseUrl);
    
    return {
        success: true,
        fileInfo: fileInfo,
        content: fileContent,
        readableType: getReadableFileType(fileInfo)
    };
}

/**
 * Get actual file content from Canvas
 */
async function getCanvasFileContent(fileInfo, apiKey, baseUrl) {
    console.log('📥 Downloading file content:', fileInfo.filename);
    
    // Canvas files can be accessed via direct URL or API
    let downloadUrl = fileInfo.url;
    
    // If the URL requires authentication, we need to use the API
    const response = await fetch(downloadUrl, {
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const content = await response.text();
    return content;
}

/**
 * Check if file type is readable as text
 */
function isReadableFileType(fileInfo) {
    const readableTypes = [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'text/markdown',
        'application/json',
        'application/xml',
        'text/xml',
        'application/javascript',
        'application/x-javascript',
        'text/x-python',
        'text/x-java-source',
        'text/x-c',
        'text/x-c++',
        'application/pdf', // We can try to read PDF
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const textExtensions = [
        '.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.xml', '.csv',
        '.java', '.c', '.cpp', '.h', '.php', '.rb', '.go', '.rs', '.sql',
        '.yml', '.yaml', '.ini', '.cfg', '.conf', '.log'
    ];
    
    // Check content type
    if (readableTypes.includes(fileInfo.content_type)) {
        return true;
    }
    
    // Check file extension
    const filename = fileInfo.filename.toLowerCase();
    return textExtensions.some(ext => filename.endsWith(ext));
}

/**
 * Get readable file type description
 */
function getReadableFileType(fileInfo) {
    const filename = fileInfo.filename.toLowerCase();
    
    if (filename.endsWith('.py')) return 'Python';
    if (filename.endsWith('.js')) return 'JavaScript';
    if (filename.endsWith('.html')) return 'HTML';
    if (filename.endsWith('.css')) return 'CSS';
    if (filename.endsWith('.json')) return 'JSON';
    if (filename.endsWith('.md')) return 'Markdown';
    if (filename.endsWith('.txt')) return 'Text';
    if (filename.endsWith('.java')) return 'Java';
    if (filename.endsWith('.c')) return 'C';
    if (filename.endsWith('.cpp')) return 'C++';
    if (filename.endsWith('.sql')) return 'SQL';
    
    return fileInfo.content_type || 'Unknown';
}

/**
 * Handle auto-opening extension when Canvas is detected
 */
async function handleAutoOpenExtension(tab) {
    if (!tab || !tab.id) return;
    
    try {
        // Check user preferences for auto-open
        const settings = await chrome.storage.local.get([
            'settings', 
            'lastAutoOpenTab', 
            'lastAutoOpenTime'
        ]);
        
        const autoOpenEnabled = settings.settings?.autoOpenOnCanvas !== false; // Default to true
        
        if (!autoOpenEnabled) {
            console.log('🐅 Auto-open disabled by user');
            return;
        }
        
        // Prevent opening too frequently (cooldown of 30 seconds per tab)
        const now = Date.now();
        const lastOpenTime = settings.lastAutoOpenTime || 0;
        const lastOpenTab = settings.lastAutoOpenTab;
        const cooldownMs = 30 * 1000; // 30 seconds
        
        if (tab.id === lastOpenTab && (now - lastOpenTime) < cooldownMs) {
            console.log('🐅 Auto-open cooldown active for this tab');
            return;
        }
        
        // Record this auto-open attempt
        await chrome.storage.local.set({
            lastAutoOpenTab: tab.id,
            lastAutoOpenTime: now
        });
        
        console.log('🐅 Auto-opening TigerCat for Canvas detection');
        
        // Try to open the side panel programmatically
        try {
            await chrome.sidePanel.open({ tabId: tab.id });
            console.log('✅ TigerCat side panel opened automatically');
        } catch (error) {
            // Fallback: Show a notification or badge
            console.log('🐅 Could not auto-open side panel:', error.message);
            
            // Set badge to indicate Canvas detection
            chrome.action.setBadgeText({
                tabId: tab.id,
                text: '🎓'
            });
            
            chrome.action.setBadgeBackgroundColor({
                tabId: tab.id,
                color: '#FF671D' // Pacific orange
            });
            
            // Update title to indicate Canvas detection
            chrome.action.setTitle({
                tabId: tab.id,
                title: 'TigerCat - Canvas Detected! Click to open AI assistant'
            });
        }
        
    } catch (error) {
        console.error('🐅 Error in auto-open logic:', error);
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

// Keep service worker alive
chrome.runtime.onSuspend.addListener(() => {
    console.log('🐅 TigerCat service worker suspending...');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('🐅 TigerCat service worker starting up...');
});

// Handle tab activation (when user switches to a tab)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        
        // Check if this is a Canvas tab
        if (tab.url && isCanvasURL(tab.url)) {
            console.log('🐅 Switched to Canvas tab:', tab.url);
            
            // Check if user has auto-open enabled
            const settings = await chrome.storage.local.get(['settings']);
            const autoOpenEnabled = settings.settings?.autoOpenOnCanvas !== false; // Default to true
            
            if (autoOpenEnabled) {
                // Small delay to ensure tab is fully loaded
                setTimeout(async () => {
                    try {
                        await chrome.sidePanel.open({ tabId: tab.id });
                        console.log('✅ TigerCat side panel opened on tab switch');
                    } catch (error) {
                        console.log('🐅 Could not auto-open side panel on tab switch:', error.message);
                    }
                }, 500);
            }
        }
    } catch (error) {
        console.log('🐅 Error handling tab activation:', error);
    }
});

// Helper function to check if URL is Canvas
function isCanvasURL(url) {
    if (!url) return false;
    return url.includes('instructure.com');
}
