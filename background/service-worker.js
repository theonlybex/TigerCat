// TigerCat Background Service Worker
// Handles background tasks, API calls, and cross-tab communication

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
        // First time installation
        console.log('🐅 Welcome to TigerCat!');
        
        // Set default settings
        chrome.storage.local.set({
            firstTime: true,
            settings: {
                autoActivate: true,
                aiModel: 'gpt-3.5-turbo',
                theme: 'auto'
            }
        });
        
        // Open welcome tab (optional)
        // chrome.tabs.create({ url: 'popup/popup.html' });
    }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('🐅 Background received message:', request);
    
    switch (request.action) {
        case 'get_canvas_courses':
            handleGetCanvasCourses(request, sendResponse);
            return true; // Keep message channel open for async response
            
        case 'analyze_course_content':
            handleAnalyzeCourseContent(request, sendResponse);
            return true;
            
        case 'ai_chat_request':
            handleAIChatRequest(request, sendResponse);
            return true;
            
        case 'store_course_data':
            handleStoreCourseData(request, sendResponse);
            break;
            
        case 'get_stored_data':
            handleGetStoredData(request, sendResponse);
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Tab change detection for Canvas pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (isCanvasURL(tab.url)) {
            console.log('🐅 Canvas page detected:', tab.url);
            
            // Notify content script that Canvas page is ready
            chrome.tabs.sendMessage(tabId, {
                action: 'canvas_page_ready',
                url: tab.url
            }).catch(() => {
                // Content script might not be ready yet, that's okay
            });
        }
    }
});

/**
 * Check if URL is a Canvas LMS page
 */
function isCanvasURL(url) {
    const canvasPatterns = [
        /.*\.instructure\.com.*/,
        /.*\.canvas\..*/,
        /.*canvas.*/i
    ];
    
    return canvasPatterns.some(pattern => pattern.test(url));
}

/**
 * Handle Canvas courses request
 */
async function handleGetCanvasCourses(request, sendResponse) {
    try {
        console.log('🐅 Getting Canvas courses...');
        
        // Get Canvas API credentials
        const { canvasApiKey, canvasBaseUrl } = await chrome.storage.local.get(['canvasApiKey', 'canvasBaseUrl']);
        
        if (!canvasApiKey || !canvasBaseUrl) {
            sendResponse({
                success: false,
                error: 'Canvas API key or URL not configured. Please set them in extension settings.',
                needsSetup: true
            });
            return;
        }
        
        // Make actual Canvas API call
        const courses = await callCanvasAPI('/courses', canvasApiKey, canvasBaseUrl);
        
        sendResponse({
            success: true,
            courses: courses,
            message: 'Canvas courses loaded successfully!'
        });
        
    } catch (error) {
        console.error('🐅 Error getting Canvas courses:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Call Canvas API
 */
async function callCanvasAPI(endpoint, apiKey, baseUrl) {
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
        console.error('🚨 OpenAI API Error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
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
    return data;
}

/**
 * Handle course content analysis request
 */
async function handleAnalyzeCourseContent(request, sendResponse) {
    try {
        console.log('🐅 Analyzing course content for course:', request.courseId);
        
        // Get Canvas API credentials
        const { canvasApiKey, canvasBaseUrl } = await chrome.storage.local.get(['canvasApiKey', 'canvasBaseUrl']);
        
        if (!canvasApiKey || !canvasBaseUrl) {
            sendResponse({
                success: false,
                error: 'Canvas API not configured. Please set your Canvas API key and URL in settings.',
                needsSetup: true
            });
            return;
        }
        
        // Get course files and modules
        const [files, modules, assignments, pages] = await Promise.all([
            callCanvasAPI(`/courses/${request.courseId}/files`, canvasApiKey, canvasBaseUrl),
            callCanvasAPI(`/courses/${request.courseId}/modules`, canvasApiKey, canvasBaseUrl),
            callCanvasAPI(`/courses/${request.courseId}/assignments`, canvasApiKey, canvasBaseUrl),
            callCanvasAPI(`/courses/${request.courseId}/pages`, canvasApiKey, canvasBaseUrl)
        ]);
        
        // Analyze the content
        const analysis = {
            totalFiles: files.length,
            totalModules: modules.length,
            totalAssignments: assignments.length,
            totalPages: pages.length,
            fileTypes: [...new Set(files.map(f => f.content_type || 'unknown'))],
            topics: modules.map(m => m.name).slice(0, 10), // First 10 module names
            lastUpdated: new Date().toISOString(),
            files: files.slice(0, 20), // First 20 files for processing
            recentAssignments: assignments.filter(a => new Date(a.due_at) > new Date()).slice(0, 5)
        };
        
        sendResponse({
            success: true,
            analysis: analysis,
            message: 'Course content analyzed successfully!'
        });
        
    } catch (error) {
        console.error('🐅 Error analyzing course content:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

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
        const gptResponse = await callOpenAIAPI(request.query, request.context, apiKey);
        
        sendResponse({
            success: true,
            response: gptResponse.response,
            sources: gptResponse.sources || [],
            confidence: gptResponse.confidence || 0.8
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
        OPENAI_TEMPERATURE: 0.7,
        UNIVERSITY_NAME: 'University of the Pacific'
    };
}

/**
 * Call OpenAI GPT API
 */
async function callOpenAIAPI(query, context, apiKey) {
    const config = getConfig();
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    // Build system prompt with course context
    const systemPrompt = `You are TigerCat, an AI assistant for ${config.UNIVERSITY_NAME} students using Canvas LMS. 

You help students by:
- Analyzing course materials and documents
- Answering questions about course content
- Helping with assignments and studying
- Providing explanations and summaries

Context from course materials:
${context ? context.join('\n\n') : 'No course context available yet.'}

Be helpful, accurate, and reference specific course materials when possible.`;

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
        response: data.choices[0].message.content,
        sources: [], // We'll add this when we implement document analysis
        confidence: 0.8
    };
}

/**
 * Handle storing course data
 */
async function handleStoreCourseData(request, sendResponse) {
    try {
        const { courseId, data } = request;
        
        // Store in chrome.storage.local
        const storageKey = `course_${courseId}`;
        await chrome.storage.local.set({
            [storageKey]: {
                ...data,
                lastUpdated: new Date().toISOString()
            }
        });
        
        console.log(`🐅 Stored data for course ${courseId}`);
        
        sendResponse({
            success: true,
            message: 'Course data stored successfully'
        });
        
    } catch (error) {
        console.error('🐅 Error storing course data:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Handle getting stored data
 */
async function handleGetStoredData(request, sendResponse) {
    try {
        const { keys } = request;
        const data = await chrome.storage.local.get(keys);
        
        sendResponse({
            success: true,
            data
        });
        
    } catch (error) {
        console.error('🐅 Error getting stored data:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// Keep service worker alive
chrome.runtime.onSuspend.addListener(() => {
    console.log('🐅 TigerCat service worker suspending...');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('🐅 TigerCat service worker starting up...');
});
