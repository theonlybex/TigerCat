// TigerCat Canvas Page Detector
// This script runs on Canvas pages to detect Canvas environment

console.log('🐅 TigerCat Canvas detector loaded on:', window.location.href);

// Global state
let isCanvasDetected = false;
let canvasInfo = null;

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
    redetect: initializeCanvasDetection
};
