// TigerCat Canvas Page Detector
// This script runs on Canvas pages to detect Canvas environment

console.log('🐅 TigerCat Canvas detector loaded on:', window.location.href);

// Global state
let isCanvasDetected = false;
let canvasInfo = null;
let smartSearchStatus = null;

// Initialize Canvas detection when page loads
document.addEventListener('DOMContentLoaded', initializeCanvasDetection);

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCanvasDetection);
} else {
    initializeCanvasDetection();
}

/**
 * Initialize Canvas page detection
 */
function initializeCanvasDetection() {
    console.log('🐅 Initializing Canvas detection...');
    
    // Detect if this is actually a Canvas page
    const detection = detectCanvasPage();
    
    if (detection.isCanvas) {
        isCanvasDetected = true;
        canvasInfo = detection;
        console.log('🐅 Canvas page detected!', canvasInfo);
        
        // Detect Smart Search features after Canvas detection
        detectSmartSearch().then(() => {
            console.log('🔍 Smart Search detection completed');
        }).catch(error => {
            console.error('🐅 Error detecting Smart Search:', error);
        });
        
        // Notify background script about Canvas detection
        notifyCanvasDetection(canvasInfo);
    } else {
        console.log('🐅 Not a Canvas page or Canvas not fully loaded');
    }
}

/**
 * Detect if current page is a Canvas LMS page
 */
function detectCanvasPage() {
    const url = window.location.href;
    const domain = window.location.hostname;
    
    // Check URL patterns (focus on instructure.com which is most common)
    const urlIndicators = [
        url.includes('instructure.com'),
        domain.includes('instructure.com')
    ];
    
    // Check DOM elements that indicate Canvas
    const domIndicators = [
        document.querySelector('#application'), // Main Canvas app container
        document.querySelector('.ic-app-header'), // Canvas header
        document.querySelector('[data-testid="dashboard"]'), // Dashboard
        document.querySelector('#main'), // Canvas main content
        document.querySelector('.ic-Layout-contentMain'), // Canvas layout
        document.querySelector('meta[name="generator"][content*="Canvas"]') // Canvas meta tag
    ];
    
    // Check for Canvas-specific JavaScript objects
    const jsIndicators = [
        typeof window.ENV !== 'undefined' && window.ENV, // Canvas environment object
        typeof window.INST !== 'undefined' && window.INST // Canvas instance object
    ];
    
    // Check page title
    const titleIndicators = [
        document.title.includes('Canvas'),
        document.title.includes('Instructure')
    ];
    
    // Combine all indicators
    const urlMatch = urlIndicators.some(indicator => indicator);
    const domMatch = domIndicators.some(element => element !== null);
    const jsMatch = jsIndicators.some(obj => obj);
    const titleMatch = titleIndicators.some(indicator => indicator);
    
    const isCanvas = urlMatch || (domMatch && (jsMatch || titleMatch));
    
    // Extract Canvas information if detected
    let canvasData = null;
    if (isCanvas) {
        canvasData = extractCanvasInfo(url, domain);
    }
    
    return {
        isCanvas: isCanvas,
        url: url,
        domain: domain,
        detection: {
            urlMatch: urlMatch,
            domMatch: domMatch,
            jsMatch: jsMatch,
            titleMatch: titleMatch
        },
        ...canvasData
    };
}

/**
 * Detect Smart Search features in Canvas
 */
async function detectSmartSearch() {
    console.log('🔍 Detecting Smart Search features...');
    
    const smartSearch = {
        enabled: false,
        apiAvailable: false,
        globalSearch: false,
        courseSearch: false,
        searchElements: [],
        features: {},
        detection: {
            envFlags: false,
            domElements: false,
            apiEndpoints: false
        }
    };
    
    // Check Canvas ENV for Smart Search features
    if (typeof window.ENV !== 'undefined' && window.ENV) {
        console.log('🔍 Checking Canvas ENV for Smart Search...');
        
        // Check for Smart Search feature flags
        if (window.ENV.FEATURES) {
            const features = window.ENV.FEATURES;
            if (features.smart_search || features.smartsearch || features.ai_search || features.enhanced_search) {
                smartSearch.enabled = true;
                smartSearch.detection.envFlags = true;
                smartSearch.features = {
                    smart_search: !!features.smart_search,
                    smartsearch: !!features.smartsearch,
                    ai_search: !!features.ai_search,
                    enhanced_search: !!features.enhanced_search
                };
                console.log('✅ Smart Search feature flags found in ENV.FEATURES');
            }
        }
        
        // Check for search-related configuration
        if (window.ENV.SEARCH_SERVICE_URL || window.ENV.SMART_SEARCH_URL) {
            smartSearch.enabled = true;
            smartSearch.apiAvailable = true;
            smartSearch.detection.envFlags = true;
            console.log('✅ Smart Search service URLs found in ENV');
        }
    }
    
    // Check DOM for Smart Search elements
    const searchSelectors = [
        // Smart Search specific
        '[data-feature="smart-search"]',
        '[data-search-type="smart"]',
        '.smart-search',
        '.enhanced-search',
        
        // Global search elements
        '[data-testid="global-search"]',
        '.ic-app-header__search',
        '#global_nav_search',
        
        // Course search elements
        '.course-search',
        '[data-testid="course-search"]',
        
        // General search inputs
        'input[placeholder*="earch"]',
        '.search-input',
        '.search-form'
    ];
    
    searchSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            smartSearch.searchElements.push({
                selector: selector,
                tagName: element.tagName,
                className: element.className,
                id: element.id || null,
                placeholder: element.placeholder || null,
                hasSmartFeatures: selector.includes('smart') || element.className.includes('smart')
            });
            
            smartSearch.detection.domElements = true;
            
            // Check if this is a smart search element
            if (selector.includes('smart') || element.className.includes('smart')) {
                smartSearch.enabled = true;
                console.log('✅ Smart Search DOM element found:', selector);
            }
            
            // Check for global vs course search
            if (selector.includes('global') || element.id.includes('global')) {
                smartSearch.globalSearch = true;
            }
            if (selector.includes('course')) {
                smartSearch.courseSearch = true;
            }
        }
    });
    
    // Test Smart Search API endpoints
    await testSmartSearchAPI(smartSearch);
    
    // Check page source for Smart Search indicators
    const pageContent = document.body.innerHTML.toLowerCase();
    if (pageContent.includes('smartsearch') || 
        pageContent.includes('smart-search') || 
        pageContent.includes('enhanced search') ||
        pageContent.includes('ai search')) {
        smartSearch.enabled = true;
        console.log('✅ Smart Search indicators found in page content');
    }
    
    // Store detection results
    smartSearchStatus = smartSearch;
    
    console.log('🔍 Smart Search detection results:', smartSearch);
    
    return smartSearch;
}

/**
 * Test Smart Search API endpoints
 */
async function testSmartSearchAPI(smartSearch) {
    console.log('🔍 Testing Smart Search API availability...');
    
    try {
        const baseUrl = canvasInfo?.baseUrl;
        const courseId = canvasInfo?.courseId;
        
        if (!baseUrl) {
            console.log('🔍 No Canvas base URL available for API testing');
            return;
        }
        
        const testEndpoints = [];
        
        // Add course-specific Smart Search endpoints
        if (courseId) {
            testEndpoints.push({
                type: 'course_smart_search',
                url: `${baseUrl}/api/v1/courses/${courseId}/search`,
                description: 'Course Smart Search API'
            });
        }
        
        // Add global search endpoints
        testEndpoints.push({
            type: 'global_search',
            url: `${baseUrl}/api/v1/search/recipients?search=test`,
            description: 'Global Search API'
        });
        
        // Test each endpoint
        for (const endpoint of testEndpoints) {
            try {
                console.log(`🔍 Testing ${endpoint.description}...`);
                
                const response = await fetch(endpoint.url, {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                if (response.ok) {
                    smartSearch.apiAvailable = true;
                    smartSearch.detection.apiEndpoints = true;
                    console.log(`✅ ${endpoint.description} is available (${response.status})`);
                    
                    if (endpoint.type === 'course_smart_search') {
                        smartSearch.enabled = true;
                        smartSearch.courseSearch = true;
                    }
                } else {
                    console.log(`❌ ${endpoint.description} not available (${response.status})`);
                }
                
            } catch (error) {
                console.log(`🔍 Error testing ${endpoint.description}:`, error.message);
            }
        }
        
    } catch (error) {
        console.error('🔍 Error in Smart Search API testing:', error);
    }
}

/**
 * Extract Canvas-specific information
 */
function extractCanvasInfo(url, domain) {
    const info = {
        institutionName: null,
        courseId: null,
        pageType: null,
        baseUrl: null
    };
    
    // Extract institution name and base URL from domain
    if (domain.includes('instructure.com')) {
        const subdomain = domain.split('.')[0];
        info.institutionName = subdomain;
        info.baseUrl = `https://${domain}`;
    } else {
        // Fallback for other Canvas installations
        // This will handle custom Canvas domains that might not match our patterns
        info.baseUrl = `https://${domain}`;
        info.institutionName = domain.split('.')[0];
    }
    
    console.log('🐅 Extracted Canvas info:', info);
    
    // Extract course ID from URL
    const courseMatch = url.match(/\/courses\/(\d+)/);
    if (courseMatch) {
        info.courseId = courseMatch[1];
    }
    
    // Determine page type
    if (url.includes('/dashboard')) {
        info.pageType = 'dashboard';
    } else if (url.includes('/courses/')) {
        if (url.includes('/assignments/')) {
            info.pageType = 'assignment';
        } else if (url.includes('/modules/')) {
            info.pageType = 'modules';
        } else if (url.includes('/files/')) {
            info.pageType = 'files';
        } else if (url.includes('/pages/')) {
            info.pageType = 'pages';
        } else if (url.includes('/grades/')) {
            info.pageType = 'grades';
        } else {
            info.pageType = 'course_home';
        }
    } else {
        info.pageType = 'other';
    }
    
    return info;
}

/**
 * Notify background script about Canvas detection
 */
function notifyCanvasDetection(canvasInfo) {
    // Prepare data with Canvas base URL for API configuration
    const detectionData = {
        ...canvasInfo,
        // Extract clean base URL for API calls
        canvasBaseUrl: canvasInfo.baseUrl,
        // Add Smart Search detection results
        smartSearchStatus: smartSearchStatus,
        // Add timestamp for tracking
        detectionTime: new Date().toISOString()
    };
    
    console.log('🐅 Sending Canvas detection data:', detectionData);
    
    chrome.runtime.sendMessage({
        action: 'canvas_detected',
        data: detectionData
    }).catch((error) => {
        console.log('🐅 Could not notify background script:', error);
    });
}

/**
 * Listen for messages from popup or background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('🐅 Canvas detector received message:', request);
    
    switch (request.action) {
        case 'check_canvas_status':
            // Re-detect Canvas in case page has changed
            const currentDetection = detectCanvasPage();
            sendResponse({
                isCanvas: currentDetection.isCanvas,
                canvasInfo: currentDetection.isCanvas ? currentDetection : null,
                url: window.location.href,
                title: document.title
            });
            break;
            
        case 'get_canvas_info':
            sendResponse({
                isCanvas: isCanvasDetected,
                canvasInfo: canvasInfo,
                canvasBaseUrl: canvasInfo?.baseUrl || null
            });
            break;
            
        case 'get_canvas_base_url':
            // Dedicated endpoint for getting just the base URL
            sendResponse({
                success: true,
                baseUrl: canvasInfo?.baseUrl || null,
                institutionName: canvasInfo?.institutionName || null
            });
            break;
            
        case 'get_smart_search_status':
            // Get Smart Search detection results
            sendResponse({
                success: true,
                smartSearchEnabled: smartSearchStatus?.enabled || false,
                smartSearchApiAvailable: smartSearchStatus?.apiAvailable || false,
                globalSearch: smartSearchStatus?.globalSearch || false,
                courseSearch: smartSearchStatus?.courseSearch || false,
                detectionResults: smartSearchStatus || null
            });
            break;
            
        case 'test_smart_search':
            // Re-test Smart Search functionality
            (async () => {
                try {
                    const results = await detectSmartSearch();
                    sendResponse({
                        success: true,
                        smartSearchEnabled: results.enabled,
                        smartSearchApiAvailable: results.apiAvailable,
                        detectionResults: results,
                        tested: true
                    });
                } catch (error) {
                    sendResponse({
                        success: false,
                        error: error.message,
                        tested: true
                    });
                }
            })();
            return true; // Keep message channel open for async response
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Monitor for URL changes (for single-page app navigation)
let lastUrl = window.location.href;
setInterval(() => {
    if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log('🐅 URL changed, re-detecting Canvas:', lastUrl);
        initializeCanvasDetection();
    }
}, 1000);

// Export for debugging
window.TigerCatCanvasDetector = {
    isDetected: () => isCanvasDetected,
    getInfo: () => canvasInfo,
    getSmartSearchStatus: () => smartSearchStatus,
    isSmartSearchEnabled: () => smartSearchStatus?.enabled || false,
    redetect: initializeCanvasDetection,
    testSmartSearch: async () => {
        const results = await detectSmartSearch();
        console.log('🔍 Smart Search test results:', results);
        return results;
    }
};
