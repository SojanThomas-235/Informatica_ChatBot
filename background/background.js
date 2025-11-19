/**
 * IICS Assistant Chrome Extension - Background Service Worker
 * Handles extension lifecycle, notifications, and background tasks
 */

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    handleInstallation(details);
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    handleStartup();
});



// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep message channel open for async responses
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    handleTabUpdate(tabId, changeInfo, tab);
});


// Function implementations
async function toggleAssistant(tab) {
    // Check if this is an IICS page
    if (!isIICSPage(tab.url)) {
        // Show notification that assistant only works on IICS pages
        chrome.notifications.create({
            type: 'basic',
            title: 'IICS Assistant',
            message: 'Assistant only works on Informatica IICS pages. Please navigate to an IICS page first.'
        });
        return;
    }

    try {
        // Send message to content script to toggle assistant
        await chrome.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_ASSISTANT'
        });
    } catch (error) {
        console.log('Content script not ready or page not supported');
        // Content script should auto-inject on IICS pages via manifest
    }
}

function handleInstallation(details) {
    console.log('IICS Assistant installed:', details);

    if (details.reason === 'install') {
        // First time installation
        setDefaultSettings();
        showWelcomeNotification();
    } else if (details.reason === 'update') {
        // Extension updated
        console.log('Extension updated to version:', chrome.runtime.getManifest().version);
    }
}

function handleStartup() {
    console.log('IICS Assistant started');
}

function handleMessage(message, sender, sendResponse) {
    switch (message.type) {
        case 'GET_AUTH_STATUS':
            // Handle authentication status requests
            sendResponse({ authenticated: false }); // Placeholder
            break;

        case 'API_REQUEST':
            handleApiRequest(message.payload, sendResponse);
            return true; // Keep channel open

        default:
            console.log('Unknown message type:', message.type);
            sendResponse({ error: 'Unknown message type' });
    }
}

async function handleApiRequest(payload, sendResponse) {
    try {
        const { url, method, headers, body } = payload;

        const options = {
            method: method || 'GET',
            headers: headers || {},
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, options);

        // Handle non-JSON responses or errors gracefully
        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (response.ok) {
            sendResponse({ success: true, data });
        } else {
            sendResponse({
                success: false,
                error: typeof data === 'object' ? (data.message || data.error?.message || JSON.stringify(data)) : data || `HTTP ${response.status}`,
                status: response.status
            });
        }
    } catch (error) {
        console.error('API Request failed:', error);
        sendResponse({ success: false, error: error.message });
    }
}

function handleTabUpdate(tabId, changeInfo, tab) {
    // Handle tab navigation changes
    if (changeInfo.status === 'complete' && isIICSPage(tab.url)) {
        // IICS page loaded, could inject content script if needed
        console.log('IICS page loaded:', tab.url);
    }
}



function isIICSPage(url) {
    if (!url) return false;

    const iicsPatterns = [
        'informaticacloud.com',
        'dm-us.informaticacloud.com',
        'dm-eu.informaticacloud.com',
        'dm-ap.informaticacloud.com'
    ];

    return iicsPatterns.some(pattern => url.includes(pattern));
}

function setDefaultSettings() {
    chrome.storage.sync.set({
        backendUrl: 'http://localhost:5000',
        theme: 'light',
        autoConnect: false
    });
}

function showWelcomeNotification() {
    chrome.notifications.create({
        type: 'basic',
        title: 'IICS Assistant Installed!',
        message: 'Click the extension icon when on IICS pages to start using the assistant.'
    });
}

function showNotification(title, message, type = 'basic') {
    chrome.notifications.create({
        type: 'basic',
        title: title,
        message: message
    });
}
