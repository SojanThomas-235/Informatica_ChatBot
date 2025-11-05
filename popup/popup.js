/**
 * IICS Assistant Chrome Extension - Popup Script
 * Handles the extension popup interface and communication with backend
 */

class IICSAssistantPopup {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000';
        this.isAuthenticated = false;
        this.isConnecting = false;
        
        // DOM elements
        this.elements = {
            // Sections
            loginSection: document.getElementById('loginSection'),
            chatSection: document.getElementById('chatSection'),
            settingsSection: document.getElementById('settingsSection'),
            
            // Header
            settingsBtn: document.getElementById('settingsBtn'),
            minimizeBtn: document.getElementById('minimizeBtn'),
            closeBtn: document.getElementById('closeBtn'),
            
            // Status
            connectionStatus: document.getElementById('connectionStatus'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            
            // Login
            loginForm: document.getElementById('loginForm'),
            connectBtn: document.getElementById('connectBtn'),
            connectSpinner: document.getElementById('connectSpinner'),
            loginError: document.getElementById('loginError'),
            
            // Chat
            chatMessages: document.getElementById('chatMessages'),
            chatInput: document.getElementById('chatInput'),
            sendBtn: document.getElementById('sendBtn'),
            suggestions: document.getElementById('suggestions'),
            
            // Settings
            backendUrl: document.getElementById('backendUrl'),
            themeSelect: document.getElementById('themeSelect'),
            saveSettings: document.getElementById('saveSettings'),
            cancelSettings: document.getElementById('cancelSettings'),
            
            // Loading
            loadingOverlay: document.getElementById('loadingOverlay')
        };
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.bindEvents();
        this.checkAuthStatus();
        this.updateConnectionStatus('disconnected');
    }
    
    bindEvents() {
        // Header buttons
        this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
        this.elements.minimizeBtn.addEventListener('click', () => this.minimizeExtension());
        this.elements.closeBtn.addEventListener('click', () => this.closeExtension());
        
        // Login form
        this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Chat input
        this.elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.elements.chatInput.addEventListener('input', () => {
            this.elements.sendBtn.disabled = !this.elements.chatInput.value.trim();
        });
        
        // Send button
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Quick actions
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleQuickAction(action);
            });
        });
        
        // Suggestions
        this.elements.suggestions.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-item')) {
                const text = e.target.getAttribute('data-text');
                this.elements.chatInput.value = text;
                this.elements.sendBtn.disabled = false;
                this.elements.chatInput.focus();
            }
        });
        
        // Settings
        this.elements.saveSettings.addEventListener('click', () => this.saveSettings());
        this.elements.cancelSettings.addEventListener('click', () => this.hideSettings());
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'backendUrl',
                'theme'
            ]);
            
            if (result.backendUrl) {
                this.apiBaseUrl = result.backendUrl;
                this.elements.backendUrl.value = result.backendUrl;
            }
            
            if (result.theme) {
                this.elements.themeSelect.value = result.theme;
                this.applyTheme(result.theme);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    async saveSettings() {
        try {
            const settings = {
                backendUrl: this.elements.backendUrl.value,
                theme: this.elements.themeSelect.value
            };
            
            await chrome.storage.sync.set(settings);
            
            this.apiBaseUrl = settings.backendUrl;
            this.applyTheme(settings.theme);
            
            this.hideSettings();
            this.showNotification('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }
    
    applyTheme(theme) {
        // Remove existing theme classes
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        // Apply new theme
        if (theme === 'dark') {
            document.body.classList.add('theme-dark');
        } else if (theme === 'light') {
            document.body.classList.add('theme-light');
        } else {
            // Auto theme - detect system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        }
        
        document.body.setAttribute('data-theme', theme);
    }
    
    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/session-info`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                mode: 'cors',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    this.isAuthenticated = true;
                    this.showChatInterface();
                    this.updateConnectionStatus('connected');
                    return;
                }
            }
        } catch (error) {
            console.log('Auth check failed:', error);
        }
        
        this.isAuthenticated = false;
        this.showLoginInterface();
        this.updateConnectionStatus('disconnected');
    }
    
    async handleLogin(event) {
        event.preventDefault();
        
        if (this.isConnecting) return;
        
        const formData = new FormData(this.elements.loginForm);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        // Validate inputs
        if (!credentials.username || !credentials.password) {
            this.showLoginError('Please enter username and password');
            return;
        }
        
        await this.performLogin(credentials);
    }
    
    async performLogin(credentials) {
        this.isConnecting = true;
        this.setLoginLoading(true);
        this.updateConnectionStatus('connecting');
        this.hideLoginError();
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                credentials: 'include',
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.isAuthenticated = true;
                this.showChatInterface();
                this.updateConnectionStatus('connected');
                
                // Clear form
                this.elements.loginForm.reset();
            } else {
                this.showLoginError(data.message || 'Login failed');
                this.updateConnectionStatus('disconnected');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Connection failed. Please check your network and backend URL.');
            this.updateConnectionStatus('disconnected');
        } finally {
            this.isConnecting = false;
            this.setLoginLoading(false);
        }
    }
    
    showLoginInterface() {
        this.elements.loginSection.style.display = 'block';
        this.elements.chatSection.style.display = 'none';
        this.elements.settingsSection.style.display = 'none';
    }
    
    showChatInterface() {
        this.elements.loginSection.style.display = 'none';
        this.elements.chatSection.style.display = 'block';
        this.elements.settingsSection.style.display = 'none';
    }
    
    showSettings() {
        this.elements.loginSection.style.display = 'none';
        this.elements.chatSection.style.display = 'none';
        this.elements.settingsSection.style.display = 'block';
    }
    
    hideSettings() {
        if (this.isAuthenticated) {
            this.showChatInterface();
        } else {
            this.showLoginInterface();
        }
    }
    
    updateConnectionStatus(status) {
        const statusMap = {
            'connected': { text: 'Connected', class: 'connected' },
            'connecting': { text: 'Connecting...', class: 'connecting' },
            'disconnected': { text: 'Disconnected', class: 'disconnected' }
        };
        
        const statusInfo = statusMap[status] || statusMap['disconnected'];
        this.elements.statusText.textContent = statusInfo.text;
        this.elements.statusDot.className = `status-dot ${statusInfo.class}`;
    }
    
    setLoginLoading(loading) {
        if (loading) {
            this.elements.connectBtn.disabled = true;
            this.elements.connectSpinner.style.display = 'inline-block';
        } else {
            this.elements.connectBtn.disabled = false;
            this.elements.connectSpinner.style.display = 'none';
        }
    }
    
    showLoginError(message) {
        this.elements.loginError.textContent = message;
        this.elements.loginError.style.display = 'block';
    }
    
    hideLoginError() {
        this.elements.loginError.style.display = 'none';
    }
    
    minimizeExtension() {
        window.close();
    }
    
    closeExtension() {
        window.close();
    }
    
    handleQuickAction(action) {
        this.elements.chatInput.value = action;
        this.elements.sendBtn.disabled = false;
        this.sendMessage();
    }
    
    showNotification(message, type) {
        // Simple notification - could be enhanced
        console.log(`${type}: ${message}`);
    }
    
    async sendMessage() {
        const message = this.elements.chatInput.value.trim();
        if (!message || !this.isAuthenticated) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        this.elements.chatInput.value = '';
        this.elements.sendBtn.disabled = true;
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                credentials: 'include',
                body: JSON.stringify({ message })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.addMessage(data.message, 'assistant');
            } else {
                let errorMessage = data.message || 'Sorry, I encountered an error processing your request.';
                this.addMessage(errorMessage, 'assistant', true);
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.addMessage('Sorry, I\'m having trouble connecting to the server. Please check your connection and try again.', 'assistant', true);
        } finally {
            this.hideTypingIndicator();
        }
    }
    
    addMessage(text, sender, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-bubble ${isError ? 'error' : ''}">
                ${this.formatMessageText(text)}
            </div>
            <div class="message-time">${timestamp}</div>
        `;
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    formatMessageText(text) {
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }
    
    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'assistant-message typing-indicator-message';
        typingDiv.innerHTML = `
            <div class="message-bubble">
                <div class="typing-indicator">
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.elements.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingIndicator = this.elements.chatMessages.querySelector('.typing-indicator-message');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    scrollToBottom() {
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new IICSAssistantPopup();
});
