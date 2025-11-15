/**
 * IICS Assistant Chrome Extension - Content Script
 * Unified in-page assistant with complete functionality
 */

class IICSAssistant {
  constructor() {
    this.assistantVisible = false;
    this.assistantPanel = null;
    this.apiBaseUrl = "http://localhost:5000";
    this.isAuthenticated = false;
    this.isConnecting = false;

    this.init();
  }

  async init() {
    // Wait for page to load
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.setupIntegration()
      );
    } else {
      this.setupIntegration();
    }

    // Load settings
    await this.loadSettings();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(["backendUrl"]);
      if (result.backendUrl) {
        this.apiBaseUrl = result.backendUrl;
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  setupIntegration() {
    // Check if we're on an IICS page
    if (!this.isIICSPage()) {
      return;
    }

    // Create the assistant toggle button
    this.createAssistantToggle();

    // Create the assistant panel
    this.createAssistantPanel();

    // Listen for page navigation (SPA)
    this.observePageChanges();

    // Check authentication status immediately
    this.checkAuthStatus();

    // Listen for messages from extension
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleExtensionMessage(message, sender, sendResponse);
    });

    // Assistant initialized
  }

  isIICSPage() {
    const hostname = window.location.hostname;
    return (
      hostname.includes("informaticacloud.com") ||
      hostname.includes("dm-us.informaticacloud.com") ||
      hostname.includes("dm-eu.informaticacloud.com") ||
      hostname.includes("dm-ap.informaticacloud.com")
    );
  }

  createAssistantToggle() {
    // Remove existing toggle if present
    const existing = document.getElementById("iics-assistant-toggle");
    if (existing) existing.remove();

    const toggleButton = document.createElement("div");
    toggleButton.id = "iics-assistant-toggle";
    toggleButton.className = "iics-assistant-toggle-positioned";
    toggleButton.innerHTML = `
            <div class="assistant-toggle-btn">
                <span class="assistant-icon">🤖</span>
                <span class="assistant-text">Informatica Assistants</span>
                <span class="toggle-arrow">▼</span>
            </div>
        `;

    // Add click handler
    toggleButton.addEventListener("click", () => this.toggleAssistant());

    // Add to page
    document.body.appendChild(toggleButton);
  }

  createAssistantPanel() {
    // Remove existing panel if present
    const existing = document.getElementById("iics-assistant-panel");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.id = "iics-assistant-panel";
    panel.className = "assistant-panel-hidden";

    panel.innerHTML = `
            <div class="assistant-panel-header">
                <div class="panel-title">
                    <span class="panel-icon">🤖</span>
                    <span>Informatica Assistant</span>
                </div>
                <div class="panel-controls">
                    <button class="chatbot-action-btn" id="settings-btn" title="Settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.79a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <button class="chatbot-action-btn" id="minimize-btn" title="Minimize">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14"></path>
                        </svg>
                    </button>
                    <button class="chatbot-action-btn" id="close-btn" title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="assistant-panel-content">
                <!-- Toast Notification -->
                <div class="toast-notification" id="toastNotification"></div>
                
                <!-- Connection Status (Always Visible) -->
                <div class="connection-status-header">
                    <div class="status-indicator">
                        <span class="status-dot" id="statusDot"></span>
                        <span class="status-text" id="statusText">Disconnected</span>
                    </div>
                </div>

                <!-- Login Section -->
                <div  id="loginSection" style="display: block;">
                    <div class="login-section" >
                        <div class="login-content">
                            <h3>Connect to IICS</h3>
                            <p>Enter your credentials to start</p>
                            <form id="loginForm" class="login-form">
                                <div class="form-group">
                                    <input type="text" id="username" name="username"  class="iics-text-box"
                                        placeholder="Username (Email)" required>
                                </div>
                                <div class="form-group">
                                    <input type="password" id="password" name="password" class="iics-text-box"
                                        placeholder="Password" required>
                                </div>
                                
                                <button type="submit" class="connect-btn" id="connectBtn">
                                    <span class="btn-text">Connect</spa
                                    n>
                                    <span class="btn-spinner" id="connectSpinner"></span>
                                </button>
                            </form>                          
                            <div class="login-error" id="loginError"></div>
                        </div>
                    </div>
                </div>

                <!-- Actions Section (Hidden until connected) -->
                <div id="actionsSection" style="display: none;">
                    <div class="actions-container">
                        <div class="action-buttons">
                            <button class="action-btn" data-action="create-assets">
                                <span class="action-icon">📦</span>
                                <span class="action-text">Create Assets</span>
                            </button>
                            <button class="action-btn" data-action="check-status">
                                <span class="action-icon">📊</span>
                                <span class="action-text">Check Status</span>
                            </button>
                            <button class="action-btn" data-action="run-task">
                                <span class="action-icon">🚀</span>
                                <span class="action-text">Run Task</span>
                            </button>
                            <button class="action-btn" data-action="knowledge-article">
                                <span class="action-icon">📚</span>
                                <span class="action-text">Knowledge Article</span>
                            </button>
                            <button class="action-btn" data-action="running-jobs">
                                <span class="action-icon">⚡</span>
                                <span class="action-text">Running Jobs</span>
                            </button>
                            <button class="action-btn logout-btn" data-action="logout">
                                <span class="action-icon">🚪</span>
                                <span class="action-text">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Create Assets Submenu -->
                <div id="createAssetsSubmenu"  style="display: none;">
                    <div class="submenu-section">
                        <div class="submenu-header">
                            <h3>Create Assets</h3>
                            <button class="back-btn" id="backToActions">
                                <span class="back-icon">◀</span>
                                <span>Back</span>
                            </button>
                        </div>
                        <div class="submenu-content">
                            <button class="submenu-item" data-submenu-action="clone-mapping">
                                <span class="submenu-icon">📋</span>
                                <div class="submenu-text">
                                    <div class="submenu-title">Clone Mapping</div>
                                    <div class="submenu-desc">Create a copy of existing mapping</div>
                                </div>
                            </button>
                            <button class="submenu-item" data-submenu-action="create-mapping">
                                <span class="submenu-icon">🗺️</span>
                                <div class="submenu-text">
                                    <div class="submenu-title">Create Mapping</div>
                                    <div class="submenu-desc">Create a new mapping from scratch</div>
                                </div>
                            </button>
                            <button class="submenu-item" data-submenu-action="create-task">
                                <span class="submenu-icon">📝</span>
                                <div class="submenu-text">
                                    <div class="submenu-title">Create Task</div>
                                    <div class="submenu-desc">Create a new mapping task</div>
                                </div>
                            </button>
                            <button class="submenu-item" data-submenu-action="clone-task">
                                <span class="submenu-icon">📋</span>
                                <div class="submenu-text">
                                    <div class="submenu-title">Clone Task</div>
                                    <div class="submenu-desc">Create a copy of an existing task</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Clone Mapping Section -->
                <div id="cloneMappingSection" style="display: none;">
                    <div class="submenu-section">
                        <div class="submenu-header">
                            <h3>Clone Mapping</h3>
                            <button class="back-btn" id="backToCreateAssets">
                                <span class="back-icon">◀</span>
                                <span>Back</span>
                            </button>
                        </div>
                        <div class="submenu-content">
                            <div class="form-group">
                                <label for="mappingSelect">Select Mapping:</label>
                                <select id="mappingSelect" class="iics-select-box" >
                                    <option value="">Loading mappings...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="folderSelect">Select Folder:</label>
                                <select id="folderSelect" class="iics-select-box" >
                                    <option value="">Loading folders...</option>
                                </select>
                            </div>
                            <div id="mappingDetails" style="display: none; margin-top: 15px;">
                                <div class="mapping-detail-item">
                                    <strong>Description:</strong>
                                    <span id="mappingDescription"></span>
                                </div>
                                <div class="mapping-detail-item">
                                    <strong>Created:</strong>
                                    <span id="mappingCreateTime"></span>
                                </div>
                                <div class="mapping-detail-item">
                                    <strong>Updated:</strong>
                                    <span id="mappingUpdateTime"></span>
                                </div>
                            </div>
                            <button class="action-btn" id="cloneMappingBtn" style="margin-top: 15px; width: 100%;" disabled>
                                <span class="action-text">Clone Selected Mapping</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Clone Task Section -->
                <div id="cloneTaskSection" style="display: none;">
                    <div class="submenu-section">
                        <div class="submenu-header">
                            <h3>Clone Task</h3>
                            <button class="back-btn" id="backToCreateAssetsTask">
                                <span class="back-icon">◀</span>
                                <span>Back</span>
                            </button>
                        </div>
                        <div class="submenu-content">
                            <div class="form-group">
                                <label for="taskSelect">Select Task:</label>
                                <select id="taskSelect" class="iics-select-box">
                                    <option value="">Loading tasks...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="taskFolderSelect">Target Folder:</label>
                                <select id="taskFolderSelect" class="iics-select-box">
                                    <option value="">Loading folders...</option>
                                </select>
                            </div>
                            <div id="taskDetails" style="display: none; margin-top: 15px;">
                                <div class="mapping-detail-item">
                                    <strong>Type:</strong>
                                    <span id="taskType"></span>
                                </div>
                                <div class="mapping-detail-item">
                                    <strong>Created:</strong>
                                    <span id="taskCreateTime"></span>
                                </div>
                                <div class="mapping-detail-item">
                                    <strong>Updated:</strong>
                                    <span id="taskUpdateTime"></span>
                                </div>
                            </div>
                            <button class="action-btn" id="cloneTaskBtn" style="margin-top: 15px; width: 100%;" disabled>
                                <span class="action-text">Clone Selected Task</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Run Task Section -->
                <div id="runTaskSection" style="display: none;">
                    <div class="submenu-section">
                        <div class="submenu-header">
                            <h3>Run Task</h3>
                            <button class="back-btn" id="backToActionsFromRunTask">
                                <span class="back-icon">◀</span>
                                <span>Back</span>
                            </button>
                        </div>
                        <div class="submenu-content">
                            <div class="form-group" style="margin-top: 15px;">
                                <label for="taskFlowSelect">Select Task Flow:</label>
                                <select id="taskFlowSelect" class="iics-select-box" disabled>
                                    <option value="">Select a task flow...</option>
                                </select>
                            </div>
                            <button class="action-btn" data-action="run-selected-task" id="runSelectedTaskBtn" style="margin-top: 15px; width: 100%;" disabled>
                                <span class="action-text">Run Selected Task</span>
                            </button>
                        </div>
                    </div>
                </div>


                <!-- Settings Section -->
                <div class="settings-section" id="settingsSection" style="display: none;">
                    <div class="settings-content">
                        <h3>Settings</h3>
                        
                        <div class="setting-group">
                            <label>Backend URL:</label>
                            <input type="text" id="backendUrl" value="http://localhost:5000" 
                                   placeholder="Backend server URL">
                        </div>
                        
                        <div class="setting-group">
                            <label>Theme:</label>
                            <select id="themeSelect">
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="auto">Auto</option>
                            </select>
                        </div>
                        
                        <div class="settings-actions">
                            <button class="settings-btn save-btn" id="saveSettings">Save</button>
                            <button class="settings-btn cancel-btn" id="cancelSettings">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // Add event listeners
    this.bindPanelEvents(panel);

    document.body.appendChild(panel);
    this.assistantPanel = panel;
  }

  bindPanelEvents(panel) {
    // Header controls - only bind to existing elements
    const settingsBtn = panel.querySelector("#settings-btn");
    const minimizeBtn = panel.querySelector("#minimize-btn");
    const closeBtn = panel.querySelector("#close-btn");

    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => this.showSettings());
    }
    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", () => this.hideAssistant());
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.hideAssistant());
    }

    // Login form
    const loginForm = panel.querySelector("#loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    // Settings
    const saveSettings = panel.querySelector("#saveSettings");
    const cancelSettings = panel.querySelector("#cancelSettings");

    if (saveSettings) {
      saveSettings.addEventListener("click", () => this.saveSettings());
    }
    if (cancelSettings) {
      cancelSettings.addEventListener("click", () => this.hideSettings());
    }

    // Action buttons
    panel.querySelectorAll(".action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.getAttribute("data-action");
        this.handleAction(action);
      });
    });

    // Submenu back button
    const backBtn = panel.querySelector("#backToActions");
    if (backBtn) {
      backBtn.addEventListener("click", () => this.hideCreateAssetsSubmenu());
    }

    // Clone mapping back button
    const backToCreateAssetsBtn = panel.querySelector("#backToCreateAssets");
    if (backToCreateAssetsBtn) {
      backToCreateAssetsBtn.addEventListener("click", () =>
        this.hideCloneMappingSection()
      );
    }
    
    // Clone task back button
    const backToCreateAssetsBtn2 = panel.querySelector("#backToCreateAssetsTask");
    if (backToCreateAssetsBtn2) {
      backToCreateAssetsBtn2.addEventListener("click", () =>
        this.hideCloneTaskSection()
      );
    }

    // Run task back button
    const backToActionsFromRunTaskBtn = panel.querySelector(
      "#backToActionsFromRunTask"
    );
    if (backToActionsFromRunTaskBtn) {
      backToActionsFromRunTaskBtn.addEventListener("click", () =>
        this.hideRunTaskSection()
      );
    }

    // Task flow select change
    const taskFlowSelect = panel.querySelector("#taskFlowSelect");
    if (taskFlowSelect) {
      taskFlowSelect.addEventListener("change", (e) =>
        this.handleTaskFlowSelection(e)
      );
    }

    // Run selected task button
    const runSelectedTaskBtn = panel.querySelector("#runSelectedTaskBtn");
    if (runSelectedTaskBtn) {
      runSelectedTaskBtn.addEventListener("click", () =>
        this.handleRunSelectedTask()
      );
    }

    // Mapping select change handler
    const mappingSelect = panel.querySelector("#mappingSelect");
    if (mappingSelect) {
      mappingSelect.addEventListener("change", (e) =>
        this.handleMappingSelection(e)
      );
    }

    // Clone mapping button
    const cloneMappingBtn = panel.querySelector("#cloneMappingBtn");
    if (cloneMappingBtn) {
      cloneMappingBtn.addEventListener("click", () =>
        this.handleCloneMapping()
      );
    }
    
    // Clone task button
    const cloneTaskBtn = panel.querySelector("#cloneTaskBtn");
    if (cloneTaskBtn) {
      cloneTaskBtn.addEventListener("click", () =>
        this.handleCloneTask()
      );
    }
    
    // Task select change handler
    const taskSelect = panel.querySelector("#taskSelect");
    if (taskSelect) {
      taskSelect.addEventListener("change", (e) =>
        this.handleTaskSelection(e)
      );
    }
    
    // Task folder select change handler
    const taskFolderSelect = panel.querySelector("#taskFolderSelect");
    if (taskFolderSelect) {
      taskFolderSelect.addEventListener("change", () => {
        const taskSelect = panel.querySelector("#taskSelect");
        const cloneTaskBtn = panel.querySelector("#cloneTaskBtn");
        if (cloneTaskBtn) {
          cloneTaskBtn.disabled = !(taskSelect && taskSelect.value && taskFolderSelect.value);
        }
      });
    }

    // Submenu action buttons
    panel.querySelectorAll(".submenu-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.getAttribute("data-submenu-action");
        this.handleSubmenuAction(action);
      });
    });
  }

  // Update the checkAuthStatus method to handle UI state properly
  async checkAuthStatus() {
    const loginSection = this.assistantPanel.querySelector("#loginSection");
    const actionsSection = this.assistantPanel.querySelector("#actionsSection");
    const createAssetsSubmenu = this.assistantPanel.querySelector("#createAssetsSubmenu");
    const cloneMappingSection = this.assistantPanel.querySelector("#cloneMappingSection");
    const cloneTaskSection = this.assistantPanel.querySelector("#cloneTaskSection") || { style: { display: 'none'} };
    const runTaskSection = this.assistantPanel.querySelector("#runTaskSection");
    const settingsSection = this.assistantPanel.querySelector("#settingsSection");
    // Hide both sections initially
    loginSection.style.display = "none";
    actionsSection.style.display = "none";
    createAssetsSubmenu.style.display = "none";
    cloneMappingSection.style.display = "none";
    cloneTaskSection.style.display = "none";
    runTaskSection.style.display = "none";
    settingsSection.style.display = "none";
    // Check if we have saved session token
    const savedToken = localStorage.getItem("iics_session_token");
    const savedServerUrl = localStorage.getItem("iics_server_url");

    if (savedToken && savedServerUrl) {
      try {
        // Validate the session token is still active
        const response = await fetch(
          "https://dm-us.informaticacloud.com/saas/public/core/v3/session",
          {
            method: "GET",
            headers: {
              "INFA-SESSION-ID": savedToken,
            },
          }
        );

        if (response.ok) {
          this.sessionToken = savedToken;
          this.serverUrl = savedServerUrl;
          this.isAuthenticated = true;
          this.updateConnectionStatus("connected");
          actionsSection.style.display = "block";
        } else {
          // Session expired - show login
          localStorage.removeItem("iics_session_token");
          localStorage.removeItem("iics_server_url");
          this.isAuthenticated = false;
          this.showLoginInterface();
        }
      } catch (error) {
        console.error("Session validation error:", error);
        this.isAuthenticated = false;
        this.showLoginInterface();
      }
    } else {
      this.isAuthenticated = false;
      this.showLoginInterface();
    }
  }
  // Update showLoginInterface to ensure proper section visibility
  showLoginInterface() {
    const loginSection = this.assistantPanel.querySelector("#loginSection");
    const actionsSection = this.assistantPanel.querySelector("#actionsSection");
    const settingsSection =
      this.assistantPanel.querySelector("#settingsSection");

    loginSection.style.display = "block";
    actionsSection.style.display = "none";
    settingsSection.style.display = "none";
    this.updateConnectionStatus("disconnected");
  }
  toggleAssistant() {
    if (this.assistantVisible) {
      this.hideAssistant();
    } else {
      this.showAssistant();
    }
  }

  showAssistant() {
    this.assistantPanel.className = "assistant-panel-visible";
    this.assistantVisible = true;

    // Update toggle arrow
    const arrow = document.querySelector(".toggle-arrow");
    if (arrow) arrow.textContent = "▲";

    // Check authentication status
    this.checkAuthStatus();
  }

  hideAssistant() {
    this.assistantPanel.className = "assistant-panel-hidden";
    this.assistantVisible = false;

    // Update toggle arrow
    const arrow = document.querySelector(".toggle-arrow");
    if (arrow) arrow.textContent = "▼";
  }

  showSettings() {
    this.assistantPanel.querySelector("#loginSection").style.display = "none";
    this.assistantPanel.querySelector("#actionsSection").style.display = "none";
    this.assistantPanel.querySelector("#settingsSection").style.display =
      "block";
  }

  hideSettings() {
    this.assistantPanel.querySelector("#settingsSection").style.display =
      "none";
    if (this.isAuthenticated) {
      this.assistantPanel.querySelector("#actionsSection").style.display =
        "block";
    } else {
      this.showLoginInterface();
    }
  }

  showLoginInterface() {
    this.assistantPanel.querySelector("#loginSection").style.display = "block";
    this.assistantPanel.querySelector("#actionsSection").style.display = "none";
    this.assistantPanel.querySelector("#settingsSection").style.display =
      "none";
    this.updateConnectionStatus("disconnected");
  }

  showActionsSection() {
    const actionsSection = this.assistantPanel.querySelector("#actionsSection");
    if (actionsSection) {
      actionsSection.style.display = "block";
    }
  }

  async checkAuthStatus() {
    // Check if we have saved session token
    const savedToken = localStorage.getItem("iics_session_token");
    const savedServerUrl = localStorage.getItem("iics_server_url");

    if (savedToken && savedServerUrl) {
      this.sessionToken = savedToken;
      this.serverUrl = savedServerUrl;
      this.isAuthenticated = true;
      this.updateConnectionStatus("connected");
      this.assistantPanel.querySelector("#loginSection").style.display = "none";
      this.assistantPanel.querySelector("#actionsSection").style.display =
        "block";
    } else if (this.isAuthenticated && this.sessionToken) {
      this.updateConnectionStatus("connected");
      this.assistantPanel.querySelector("#loginSection").style.display = "none";
      this.assistantPanel.querySelector("#actionsSection").style.display =
        "block";
    } else {
      this.isAuthenticated = false;
      this.showLoginInterface();
    }
  }

  async handleLogin(event) {
    event.preventDefault();

    if (this.isConnecting) return;

    const formData = new FormData(event.target);
    const credentials = {
      username: formData.get("username"),
      password: formData.get("password"),
    };

    // Validate inputs
    if (!credentials.username || !credentials.password) {
      this.showLoginError("Please enter username and password");
      return;
    }

    await this.performLogin(credentials);
  }

  async performLogin(credentials) {
    this.isConnecting = true;
    this.setLoginLoading(true);
    this.hideLoginError();
    this.updateConnectionStatus("connecting");

    try {
      // Call IICS API directly
      const response = await fetch(
        "https://dm-us.informaticacloud.com/saas/public/core/v3/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
        }
      );

      const data = await response.json();
      console.log(data);
      // Check for session token (icSessionId or sessionId)
      const sessionId = data.userInfo.icSessionId || data.userInfo.sessionId;

      if (response.ok && sessionId) {
        this.isAuthenticated = true;
        this.updateConnectionStatus("connected");

        // Store session info
        this.sessionToken = sessionId;
        this.serverUrl = data.serverUrl;

        // Save ONLY session token and server URL (NOT password)
        try {
          localStorage.setItem("iics_session_token", sessionId);
          localStorage.setItem("iics_server_url", data.serverUrl);
        } catch (error) {
          console.error("Failed to save session:", error);
        }

        // Show success toast
        this.showToast("✅ Login successful!", "success");

        // Hide login form and show actions
        this.assistantPanel.querySelector("#loginSection").style.display =
          "none";
        this.showActionsSection();

        // Clear form
        this.assistantPanel.querySelector("#loginForm").reset();
      } else {
        const errorMsg = data.error?.message || data.message || "Login failed";
        this.showLoginError(errorMsg);
        this.showToast("❌ Login failed. Please try again.", "error");
        this.updateConnectionStatus("disconnected");
      }
    } catch (error) {
      console.error("Login error:", error);
      this.showLoginError(
        "Connection failed. Please check your credentials and try again."
      );
      this.showToast("❌ Connection failed. Please try again.", "error");
      this.updateConnectionStatus("disconnected");
    } finally {
      this.isConnecting = false;
      this.setLoginLoading(false);
    }
  }

  updateConnectionStatus(status) {
    const statusDot = this.assistantPanel.querySelector("#statusDot");
    const statusText = this.assistantPanel.querySelector("#statusText");

    if (statusDot && statusText) {
      if (status === "connected") {
        statusDot.className = "status-dot connected";
        statusText.textContent = "Connected";
      } else if (status === "connecting") {
        statusDot.className = "status-dot connecting";
        statusText.textContent = "Connecting...";
      } else {
        statusDot.className = "status-dot disconnected";
        statusText.textContent = "Disconnected";
      }
    }
  }

  setLoginLoading(loading) {
    const connectBtn = this.assistantPanel.querySelector("#connectBtn");
    const spinner = this.assistantPanel.querySelector("#connectSpinner");

    if (connectBtn && spinner) {
      connectBtn.disabled = loading;
      spinner.style.display = loading ? "inline-block" : "none";
    }
  }

  showLoginError(message) {
    const errorDiv = this.assistantPanel.querySelector("#loginError");
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = "block";
    }
  }

  hideLoginError() {
    const errorDiv = this.assistantPanel.querySelector("#loginError");
    if (errorDiv) {
      errorDiv.style.display = "none";
    }
  }

  showToast(message, type = "success") {
    const toast = this.assistantPanel.querySelector("#toastNotification");
    if (!toast) return;

    // Set message and type
    toast.textContent = message;
    toast.className = `toast-notification toast-${type} toast-show`;

    // Auto hide after 3 seconds
    setTimeout(() => {
      toast.className = "toast-notification";
    }, 3000);
  }

  handleAction(action) {
    switch (action) {
        case "logout":
            this.logout();
            break;
            
        case "create-assets":
            this.showCreateAssetsSubmenu();
            break;
            
        case "run-task":
            this.showRunTaskSection();
            //this.fetchTaskFlows()
            break;
           
        case "check-status":
            this.showToast("Checking system status...", "info");
            // Future implementation for check-status
            this.showToast("Status check feature coming soon!", "info");
            break;
            
        case "knowledge-article":
            this.showToast("Opening knowledge base...", "info");
            // Future implementation for knowledge-article
            this.showToast("Knowledge base feature coming soon!", "info");
            break;
         case "load-mapping-tasks":
            this.showToast("Loading Mapping Task...", "info");
           
            break;  
          case "run-selected-task":
            this.showToast("Loading Mapping Task...", "info");
           
            break;   
        case "running-jobs":
            this.showToast("Fetching running jobs...", "info");
            // Future implementation for running-jobs
            this.showToast("Running jobs feature coming soon!", "info");
            break;
            
        default:
            console.warn(`Unhandled action: ${action}`);
            this.showToast(`Action '${action}' is not implemented yet`, "warning");
    }
  }

  showCreateAssetsSubmenu() {
    this.assistantPanel.querySelector("#actionsSection").style.display = "none";
    this.assistantPanel.querySelector("#createAssetsSubmenu").style.display =
      "block";
  }

  hideCreateAssetsSubmenu() {
    this.assistantPanel.querySelector("#createAssetsSubmenu").style.display =
      "none";
    this.assistantPanel.querySelector("#actionsSection").style.display =
      "block";
  }

  async handleSubmenuAction(action) {
    if (action === "clone-mapping") {
      await this.showCloneMappingSection();
      return;
    }
    
    if (action === "clone-task") {
      await this.showCloneTaskSection();
      return;
    }

    // For other actions, show coming soon messages
    const actionMessages = {
      "create-mapping": "Create Mapping feature - Coming soon!",
      "create-task": "Create Task feature - Coming soon!",
    };

    const message = actionMessages[action] || "Unknown submenu action";
    this.showToast(message, "info");
  }

  async showCloneMappingSection() {
    // Hide create assets submenu and show clone mapping section
    this.assistantPanel.querySelector("#createAssetsSubmenu").style.display =
      "none";
    this.assistantPanel.querySelector("#cloneMappingSection").style.display =
      "block";

    // Fetch mappings
    await this.fetchMappings();
    await this.fetchFolders();
  }

  async showCloneTaskSection() {
    // Hide create assets submenu and show clone task section
    this.assistantPanel.querySelector("#createAssetsSubmenu").style.display =
      "none";
    this.assistantPanel.querySelector("#cloneTaskSection").style.display =
      "block";
    this.assistantPanel.querySelector("#actionsSection").style.display =
      "none";
    // Fetch tasks
    await this.fetchTasks();
    await this.fetchFolders();
  }

  hideCloneMappingSection() {
    this.assistantPanel.querySelector("#cloneMappingSection").style.display =
      "none";
    this.assistantPanel.querySelector("#createAssetsSubmenu").style.display =
      "block";
  }

  hideCloneTaskSection() {
    this.assistantPanel.querySelector("#cloneTaskSection").style.display =
      "none";
    this.assistantPanel.querySelector("#createAssetsSubmenu").style.display =
      "block";
  }
async fetchFolders() {
  const folderSelect = this.assistantPanel.querySelector("#folderSelect");
  const taskFolderSelect = this.assistantPanel.querySelector("#taskFolderSelect");

  // -----------------------------------------------------------------
  // 1. Need a valid session token – server URL is hard‑coded later
  // -----------------------------------------------------------------
  if (!this.sessionToken) {
    folderSelect.innerHTML = '<option value="">Please login first</option>';
    if (taskFolderSelect) {
      taskFolderSelect.innerHTML = '<option value="">Please login first</option>';
    }
    this.showToast("Please login to fetch folders", "error");
    return;
  }

  try {
    folderSelect.innerHTML = '<option value="">Loading folders...</option>';
    if (taskFolderSelect) {
      taskFolderSelect.innerHTML = '<option value="">Loading folders...</option>';
    }
    console.log("Session Token:", this.sessionToken);

    // --------------------------------------------------------------
    // 2. ENDPOINT – core/v3/objects, type==PROJECT (IICS “folder”)
    // --------------------------------------------------------------
    const apiUrl = `https://use4.dm-us.informaticacloud.com/saas/public/core/v3/objects?q=type=='PROJECT'&limit=200`;
    console.log("Fetching folders from:", apiUrl);

    // --------------------------------------------------------------
    // 3. Headers – same as the curl you posted (both header forms)
    // --------------------------------------------------------------
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("INFA-SESSION-ID", this.sessionToken);
    // The curl also sent a cookie – keep it if your session relies on it
    // myHeaders.append("Cookie", "JSESSIONID=...; ...");   // optional

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
      credentials: "include",   // keep any cookie-based session alive
      mode: "cors",
    };

    const response = await fetch(apiUrl, requestOptions);

    // --------------------------------------------------------------
    // 4. LOGGING
    // --------------------------------------------------------------
    console.log("Response status:", response.status);
    console.log("Response URL (after redirect):", response.url);
    console.log("Response content-type:", response.headers.get("content-type"));

    // --------------------------------------------------------------
    // 5. Detect login-page redirect (HTML) even on 200
    // --------------------------------------------------------------
    const contentType = response.headers.get("content-type") || "";
    if (
      response.url.includes("/identity-service/") ||
      response.url.includes("/login") ||
      contentType.includes("text/html")
    ) {
      const html = await response.text();
      console.error("Received HTML (login page):", html.substring(0, 300));
      throw new Error("Session invalid – redirected to login page");
    }

    // --------------------------------------------------------------
    // 6. Must be JSON
    // --------------------------------------------------------------
    if (!contentType.includes("application/json")) {
      const txt = await response.text();
      console.error("Non-JSON payload:", txt.substring(0, 200));
      throw new Error("Server returned non-JSON data");
    }

    // --------------------------------------------------------------
    // 7. HTTP errors
    // --------------------------------------------------------------
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error("API error payload:", errBody);
      throw new Error(
        `HTTP ${response.status}: ${errBody.error?.message || "Unknown"}`
      );
    }

    // --------------------------------------------------------------
    // 8. Parse JSON
    // --------------------------------------------------------------
    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error("JSON parse failed:", e);
      throw new Error("Invalid JSON from server");
    }

    console.log("API Response:", result);
    const projects = Array.isArray(result.objects) ? result.objects : [];
    
    // Log the first project to check its structure
    if (projects.length > 0) {
      console.log("Sample project object:", projects[0]);
    }

    // --------------------------------------------------------------
    // 9. Populate dropdown
    // --------------------------------------------------------------
    if (projects.length === 0) {
      folderSelect.innerHTML = '<option value="">No folders found</option>';
      if (taskFolderSelect) {
        taskFolderSelect.innerHTML = '<option value="">No folders found</option>';
      }
      this.showToast("No folders found", "info");
      return;
    }

    folderSelect.innerHTML = '<option value="">Select a folder...</option>';
    if (taskFolderSelect) {
      taskFolderSelect.innerHTML = '<option value="">Select a folder...</option>';
    }
    
    projects.forEach((proj) => {
      // Try to get the folder name from different possible properties
      const folderName = proj.name || proj.displayName || proj.path || proj.id;
      
      // Add to main folder select
      const opt = document.createElement("option");
      opt.value = folderName;
      opt.textContent = folderName;
      opt.dataset.project = JSON.stringify(proj);
      folderSelect.appendChild(opt);
      
      // Also add to task folder select if it exists
      if (taskFolderSelect) {
        const taskOpt = document.createElement("option");
        taskOpt.value = folderName;
        taskOpt.textContent = folderName;
        taskOpt.dataset.folder = JSON.stringify(proj);
        taskFolderSelect.appendChild(taskOpt);
      }
      
      console.log("Added folder:", proj.name);
    });

    this.showToast(`Loaded ${projects.length} folder(s)`, "success");
  } catch (error) {
    console.error("Error fetching folders:", error);
    folderSelect.innerHTML = '<option value="">Error loading folders</option>';
    if (taskFolderSelect) {
      taskFolderSelect.innerHTML = '<option value="">Error loading folders</option>';
    }
    this.showToast("Failed to fetch folders: " + error.message, "error");
  }
}
  // Helper method to make API requests through the background script
  async makeApiRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'API_REQUEST',
        payload: {
          url,
          method: options.method || 'GET',
          headers: {
            ...options.headers,
            'INFA-SESSION-ID': this.sessionToken
          },
          body: options.body
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Request failed'));
        }
      });
    });
  }

async fetchTasks() {
  const taskSelect = this.assistantPanel.querySelector("#taskSelect");
  const taskFolderSelect = this.assistantPanel.querySelector("#taskFolderSelect");

  // Check authentication status first
  await this.checkAuthStatus();
  
  if (!this.isAuthenticated) {
    taskSelect.innerHTML = '<option value="">Please login first</option>';
    if (taskFolderSelect) {
      taskFolderSelect.innerHTML = '<option value="">Please login first</option>';
    }
    this.showToast("Please login to fetch tasks", "error");
    return;
  }

  try {
    taskSelect.innerHTML = '<option value="">Loading mapping tasks...</option>';
    
    // Get session token - check both session storage and local storage
    let icSessionId = this.sessionToken;
    
    if (!icSessionId) {
      // Try to get from chrome.storage.local
      const storage = await chrome.storage.local.get(['icSessionId', 'iics_session_token']);
      icSessionId = storage.icSessionId || storage.iics_session_token;
      
      // If still not found, check if we have a valid session
      if (!icSessionId) {
        // Try to get from cookies as a last resort
        const cookies = await chrome.cookies.getAll({ domain: '.informaticacloud.com' });
        const sessionCookie = cookies.find(c => c.name === 'JSESSIONID' || c.name.includes('SESSION'));
        
        if (sessionCookie) {
          icSessionId = sessionCookie.value;
        } else {
          // If we still don't have a session, show login interface
          this.showToast('Session expired. Please login again.', 'error');
          this.showLoginInterface();
          return;
        }
      }
      
      // Cache the session token for future use
      this.sessionToken = icSessionId;
    }

    // Build the API URL
    const apiUrl = 'https://use4.dm-us.informaticacloud.com/saas/api/v2/mttask';
    console.log('Fetching tasks from:', apiUrl);

    // Make the API request with multiple possible authentication methods
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    // Try with both header names that IICS might expect
    headers['icSessionId'] = icSessionId;
    headers['INFA-SESSION-ID'] = icSessionId;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
      credentials: 'include'
    });

    // Check if response is HTML (likely a login page)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const text = await response.text();
      if (text.includes('login') || text.includes('signin')) {
        throw new Error('Session expired. Please login again.');
      }
      throw new Error('Received HTML response instead of JSON');
    }

    // Parse JSON response
    let responseData;
    try {
      responseData = await response.json();
      console.log('API response:', responseData);
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error('Invalid response format from server');
    }

    if (!response.ok) {
      throw new Error(responseData.message || `HTTP ${response.status}: Failed to fetch tasks`);
    }

    // Handle different response formats
    const tasks = Array.isArray(responseData) ? responseData : 
                 (responseData.tasks ? responseData.tasks : []);
    
    console.log('Total tasks received:', tasks.length);
    
    // Filter for mapping tasks
    const mappingTasks = tasks.filter(task => {
      if (!task || !task.id) return false;
      
      // Access @type property (use bracket notation for properties starting with @)
      const taskType = task['@type'];
      
      // Log task details for debugging
      console.log('Processing task:', {
        id: task.id,
        name: task.name,
        '@type': taskType,
        type: task.type,
        taskType: task.taskType
      });
      
      // Check if it's a mapping task
      // The @type property should be "mtTask" for mapping tasks
      return taskType === 'mtTask' || 
             task.type === 'MTT_MAPPING' || 
             task.taskType === 'MTT_MAPPING' ||
             task.type === 'mtTask';
    });
    
    // Now we can safely log the count AFTER the filter completes
    console.log('Total mapping tasks found:', mappingTasks.length);

    // Update the dropdown
    taskSelect.innerHTML = mappingTasks.length > 0 
      ? '<option value="">Select a mapping task...</option>'
      : '<option value="">No mapping tasks found</option>';
    
    // Add tasks to dropdown
    mappingTasks.forEach(task => {
      const option = document.createElement("option");
      option.value = task.id;
      option.textContent = task.name || `Mapping Task (${task.id})`;
      option.dataset.task = JSON.stringify(task);
      taskSelect.appendChild(option);
      
      console.log('Added task to dropdown:', { 
        id: task.id, 
        name: task.name,
        type: task.type || task.taskType
      });
    });

    console.log('Task selection dropdown updated with', mappingTasks.length, 'mapping tasks');
    this.showToast(`Loaded ${mappingTasks.length} mapping task(s)`, "success");
    
  } catch (error) {
    console.error("Error fetching tasks:", error);
    taskSelect.innerHTML = '<option value="">Error loading tasks</option>';
    
    if (error.message.includes('Session expired') || error.message.includes('401')) {
      this.showToast("Your session has expired. Please login again.", "error");
      this.showLoginInterface();
    } else {
      this.showToast(`Failed to fetch tasks: ${error.message}`, "error");
    }
  }
}

  async fetchMappings() {
    const mappingSelect = this.assistantPanel.querySelector("#mappingSelect");

    if (!this.sessionToken) {
      mappingSelect.innerHTML = '<option value="">Please login first</option>';
      this.showToast("Please login to fetch mappings", "error");
      return;
    }

    try {
      mappingSelect.innerHTML = '<option value="">Loading mappings...</option>';
      console.log("Session Token:", this.sessionToken);

      // Use the makeApiRequest helper method which handles authentication and errors
      const response = await this.makeApiRequest("/saas/api/v2/mapping/");
      
      console.log("Mappings API Response:", response);

      // Handle different response structures
      let mappings = [];
      if (Array.isArray(response)) {
        mappings = response;
      } else if (response && response.mappings) {
        mappings = response.mappings;
      } else if (response && response.items) {
        mappings = response.items;
      } else if (response && response.data) {
        mappings = response.data;
      } else if (typeof response === 'object' && response !== null) {
        // If response is an object but not in expected format, try to extract values
        mappings = Object.values(response);
      }

      console.log("Processed mappings:", mappings);

      if (!mappings || mappings.length === 0) {
        mappingSelect.innerHTML = '<option value="">No mapping tasks found</option>';
        this.showToast("No mapping tasks found in the response", "info");
        return;
      }

      // Clear previous options
      mappingSelect.innerHTML = '<option value="">Select a mapping task...</option>';
      
      // Add each mapping as an option
      mappings.forEach((mapping) => {
        try {
          // Handle different possible property names for ID and name
          const id = mapping.id || mapping.mappingId || mapping.taskId || '';
          const name = mapping.name || mapping.mappingName || mapping.taskName || `Mapping ${id}`;
          
          if (id) {
            const opt = document.createElement("option");
            opt.value = id;
            opt.textContent = name;
            opt.dataset.mapping = JSON.stringify(mapping);
            mappingSelect.appendChild(opt);
            console.log("Added mapping:", name);
          }
        } catch (error) {
          console.error("Error processing mapping:", error, mapping);
        }
      });

      if (mappingSelect.options.length <= 1) { // Only the default option
        mappingSelect.innerHTML = '<option value="">No valid mapping tasks found</option>';
        this.showToast("No valid mapping tasks found in the response", "info");
        return;
      }

      this.showToast(
        `Loaded ${mappingSelect.options.length - 1} mapping tasks`,
        "success"
      );
    } catch (error) {
      console.error("Error fetching mappings:", error);
      mappingSelect.innerHTML = `<option value="">Error: ${error.message || 'Failed to load mappings'}</option>`;
      this.showToast("Failed to fetch mappings: " + (error.message || 'Unknown error'), "error");
    }
  }

  handleTaskSelection(event) {
    const selectedOption = event.target.selectedOptions[0];
    const taskDetails = this.assistantPanel.querySelector("#taskDetails");
    const cloneTaskBtn = this.assistantPanel.querySelector("#cloneTaskBtn");

    if (!selectedOption.value) {
      taskDetails.style.display = "none";
      cloneTaskBtn.disabled = true;
      return;
    }

    try {
      const task = JSON.parse(selectedOption.dataset.task);
      
      // Update task details
      this.assistantPanel.querySelector("#taskType").textContent = task.type || 'N/A';
      this.assistantPanel.querySelector("#taskCreateTime").textContent = 
        task.createTime ? new Date(task.createTime).toLocaleString() : 'N/A';
      this.assistantPanel.querySelector("#taskUpdateTime").textContent = 
        task.updateTime ? new Date(task.updateTime).toLocaleString() : 'N/A';
      
      taskDetails.style.display = "block";
      cloneTaskBtn.disabled = !this.assistantPanel.querySelector("#taskFolderSelect").value;
      
      // Store selected task
      this.selectedTask = task;
    } catch (error) {
      console.error("Error parsing task data:", error);
      taskDetails.style.display = "none";
      cloneTaskBtn.disabled = true;
    }
  }

  handleMappingSelection(event) {
    const selectedOption = event.target.selectedOptions[0];
    const mappingDetails = this.assistantPanel.querySelector("#mappingDetails");
    const cloneMappingBtn =
      this.assistantPanel.querySelector("#cloneMappingBtn");

    if (!selectedOption.value) {
      mappingDetails.style.display = "none";
      cloneMappingBtn.disabled = true;
      return;
    }

    try {
      const mapping = JSON.parse(selectedOption.dataset.mapping);

      // Display mapping details
      this.assistantPanel.querySelector("#mappingDescription").textContent =
        mapping.description || "No description";
      this.assistantPanel.querySelector("#mappingCreateTime").textContent =
        new Date(mapping.createTime).toLocaleString();
      this.assistantPanel.querySelector("#mappingUpdateTime").textContent =
        new Date(mapping.updateTime).toLocaleString();

      mappingDetails.style.display = "block";
      cloneMappingBtn.disabled = false;

      // Store selected mapping
      this.selectedMapping = mapping;
    } catch (error) {
      console.error("Error parsing mapping data:", error);
      mappingDetails.style.display = "none";
      cloneMappingBtn.disabled = true;
    }
  }

  async handleCloneMapping() {
    if (!this.selectedMapping) {
      this.showToast("Please select a mapping first ", "error");
      return;
    }

    // Placeholder for clone functionality
    this.showToast(`Cloning mapping: ${this.selectedMapping.name}`, "info");
    console.log("Selected mapping to clone:", this.selectedMapping);

    // Future implementation will call the clone API
    //await this.callCloneMappingAPI(this.selectedMapping);
  }

  async handleCloneTask() {
    const taskSelect = this.assistantPanel.querySelector("#taskSelect");
    const folderSelect = this.assistantPanel.querySelector("#taskFolderSelect");
    const cloneBtn = this.assistantPanel.querySelector("#cloneTaskBtn");

    if (!taskSelect.value || !folderSelect.value) {
      this.showToast("Please select both a task and a target folder", "error");
      return;
    }

    try {
      cloneBtn.disabled = true;
      cloneBtn.innerHTML = '<span class="spinner"></span> Cloning...';

      // Get the selected task data
      const selectedOption = taskSelect.selectedOptions[0];
      const task = JSON.parse(selectedOption.dataset.task);
      
      // Get the selected folder data
      const folderOption = folderSelect.selectedOptions[0];
      const folder = JSON.parse(folderOption.dataset.folder);

      // Prepare the clone request
      const apiUrl = `https://use4.dm-us.informaticacloud.com/saas/api/v2/mttask/${task.id}?expand=all`;
      
      // Use the makeApiRequest helper to handle the API call
      await this.makeApiRequest(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          name: `${task.name} (Copy)`,
          projectId: folder.id
        }
      });
      
      this.showToast("Task cloned successfully!", "success");
      
      // Reset the form
      taskSelect.value = "";
      folderSelect.value = "";
      this.assistantPanel.querySelector("#taskDetails").style.display = "none";
      
    } catch (error) {
      console.error("Error cloning task:", error);
      this.showToast(`Failed to clone task: ${error.message}`, "error");
    } finally {
      cloneBtn.disabled = false;
      cloneBtn.innerHTML = '<span class="action-text">Clone Selected Task</span>';
    }
  }

  handleTaskFlowSelection(event) {
    const selectedOption = event.target.selectedOptions[0];
    this.runSelectedTaskBtn.disabled = !selectedOption.value;

    if (selectedOption.value) {
      try {
        this.selectedTaskFlow = JSON.parse(selectedOption.dataset.taskFlow);
      } catch (error) {
        console.error("Error parsing task flow data:", error);
        this.selectedTaskFlow = null;
      }
    } else {
      this.selectedTaskFlow = null;
    }
  }

  async handleRunSelectedTask() {
    const taskFlowSelect = this.assistantPanel.querySelector("#taskFlowSelect");
    const selectedOption = taskFlowSelect.selectedOptions[0];
    
    if (!selectedOption || !selectedOption.value) {
      this.showToast("Please select a task to run", "error");
      return;
    }
    
    const runButton = this.assistantPanel.querySelector("#runSelectedTaskBtn");
    const originalButtonText = runButton.innerHTML;
    
    try {
      // Disable button and show loading state
      runButton.disabled = true;
      runButton.innerHTML = '<span class="action-text">Running...</span>';
      
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Accept", "application/json");
      myHeaders.append("icSessionId", this.sessionToken);
      myHeaders.append("Cookie", "JSESSIONID=9C6044C2B7A1D83536B735BF0AB56743; SERVERID_SAAS=IICS-saas_k8s_0; SERVERID_SAAS_K8S=\"9515b2ae6d88b56a\"");

      const raw = JSON.stringify({
        "@type": "job",
        "taskId": selectedOption.value,
        "taskType": "MTT",
        "runtime": {
          "@type": "mtTaskRuntime"
        }
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
      };

      const response = await fetch("https://use4.dm-us.informaticacloud.com/saas/api/v2/job", requestOptions);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to start task');
      }

      this.showToast("Task started successfully!", "success");
      console.log("Task execution started:", result);
      
      // You might want to store the job ID for status checking later
      if (result.jobId) {
        // Store or handle the job ID as needed
        console.log("Job ID:", result.jobId);
      }
      
    } catch (error) {
      console.error('Error running task:', error);
      this.showToast(`Failed to start task: ${error.message}`, 'error');
    } finally {
      // Re-enable button and restore text
      runButton.disabled = false;
      runButton.innerHTML = originalButtonText;
    }

  }

  // Helper method to get cookie value by name
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }

  // Show the run task section
  async showRunTaskSection() {
    // Hide actions and show run task section
    this.assistantPanel.querySelector("#actionsSection").style.display = "none";
    this.assistantPanel.querySelector("#runTaskSection").style.display = "block";

    // Get UI elements
    const taskFlowSelect = this.assistantPanel.querySelector("#taskFlowSelect");
    
    // Set initial UI state
    taskFlowSelect.innerHTML = '<option value="">Loading tasks...</option>';
    taskFlowSelect.disabled = true;

    // Store reference to the run button for later use
    this.runSelectedTaskBtn = this.assistantPanel.querySelector("#runSelectedTaskBtn");
    this.runSelectedTaskBtn.disabled = true;

    // Add event listeners if not already added
    // if (!this.taskFlowEventsBound) {
    //   taskFlowSelect.addEventListener("change", (e) => this.handleTaskFlowSelection(e));
    //   this.runSelectedTaskBtn.addEventListener("click", () => this.handleRunSelectedTask());
    //   this.taskFlowEventsBound = true;
    // }
    
    // Automatically fetch task flows
    try {
      await this.fetchTaskFlows();
    } catch (error) {
      console.error('Error loading task flows:', error);
      taskFlowSelect.innerHTML = '<option value="">Error loading tasks. Please refresh the page.</option>';
      taskFlowSelect.disabled = false;
      this.showToast('Failed to load tasks. Please refresh the page.', 'error');
    }
  }

  // Hide the run task section
  hideRunTaskSection() {
    this.assistantPanel.querySelector("#runTaskSection").style.display = "none";
    this.assistantPanel.querySelector("#actionsSection").style.display =
      "block";
  }

  // Fetch task flows from IICS
  async fetchTaskFlows() {
    const taskFlowSelect = this.assistantPanel.querySelector("#taskFlowSelect");

    if (!this.sessionToken) {
      taskFlowSelect.innerHTML = '<option value="">Please login first</option>';
      this.showToast("Please login to fetch task flows", "error");
      return;
    }

    try {
      taskFlowSelect.disabled = true;

      const myHeaders = new Headers();
      myHeaders.append("Accept", "application/json");
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("icSessionId", this.sessionToken);
      myHeaders.append(
        "Cookie",
        "JSESSIONID=9C6044C2B7A1D83536B735BF0AB56743; SERVERID_SAAS=IICS-saas_k8s_0; SERVERID_SAAS_K8S=\"9515b2ae6d88b56a\""
      );

      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
      };

      console.log('Fetching mapping tasks...');
      const response = await fetch(
        "https://use4.dm-us.informaticacloud.com/saas/api/v2/mttask/",
        requestOptions
      );
      
      console.log('Response status:', response.status);
      const result = await response.json(); // Changed to response.json() since we expect JSON
      console.log('Response data:', result);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
      }

      // Clear existing options
      taskFlowSelect.innerHTML = '<option value="">Select a mapping task...</option>';
      
      // Check if result is an array or has a different structure
      const tasks = Array.isArray(result) ? result : (result.tasks || result.items || []);
      
      if (tasks && tasks.length > 0) {
        //console.log(`Found ${tasks.length} mapping tasks`);
        
        tasks.forEach((task) => {
          try {
            const opt = document.createElement("option");
            const taskId = task.id || task.taskId || 'unknown';
            const taskName = task.name || task.taskName || 'Unnamed Task';
            
            opt.value = taskId;
            opt.textContent = `${taskName}`;
            opt.dataset.taskFlow = JSON.stringify(task);
            taskFlowSelect.appendChild(opt);
          } catch (error) {
            console.error('Error processing task:', task, error);
          }
        });
        
        taskFlowSelect.disabled = false;
        this.showToast(`Loaded ${tasks.length} mapping tasks`, "success");
      } else {
        console.log('No mapping tasks found in response');
        taskFlowSelect.innerHTML = '<option value="">No mapping tasks found</option>';
        this.showToast("No mapping tasks found", "info");
      }
    } catch (error) {
      console.error("Error fetching task flows:", error);
      taskFlowSelect.innerHTML =
        '<option value="">Error loading task flows</option>';
      this.showToast("Failed to fetch task flows: " + error.message, "error");
    }
  }

  handleTaskFlowSelection(event) {
    const selectedOption = event.target.selectedOptions[0];
    const runSelectedTaskBtn = this.assistantPanel.querySelector(
      "#runSelectedTaskBtn"
    );

    if (!selectedOption.value) {
      runSelectedTaskBtn.disabled = true;
      return;
    }

    runSelectedTaskBtn.disabled = false;
    this.selectedTaskFlow = JSON.parse(selectedOption.dataset.taskFlow);
  }

  // handleRunSelectedTask() {
  //     if (!this.selectedTaskFlow) {
  //         this.showToast('Please select a task flow first', 'error');
  //         return;
  //     }

  //     // Placeholder for run task functionality
  //     this.showToast(`Running task flow: ${this.selectedTaskFlow.path || this.selectedTaskFlow.id}`, 'info');
  //     console.log('Selected task flow to run:', this.selectedTaskFlow);

  //     // Future implementation will call the run task API
  //     // await this.callRunTaskAPI(this.selectedTaskFlow);
  // }

  logout() {
    // Clear session
    this.isAuthenticated = false;
    this.sessionToken = null;
    this.serverUrl = null;

    // Clear localStorage (only session data, no passwords stored)
    localStorage.removeItem("iics_session_token");
    localStorage.removeItem("iics_server_url");

    // Show login interface
    this.showLoginInterface();
    this.showToast("Logged out successfully", "success");
  }

  async saveSettings() {
    const backendUrl = this.assistantPanel.querySelector("#backendUrl").value;
    const theme = this.assistantPanel.querySelector("#themeSelect").value;

    try {
      await chrome.storage.sync.set({ backendUrl, theme });
      this.apiBaseUrl = backendUrl;
      this.hideSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }

  // Helper method to get cookie value by name
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }

  observePageChanges() {
    // Handle SPA navigation
    const observer = new MutationObserver(() => {
      if (!document.getElementById("iics-assistant-toggle")) {
        this.createAssistantToggle();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  handleExtensionMessage(message, sender, sendResponse) {
    switch (message.type) {
      case "TOGGLE_ASSISTANT":
        this.toggleAssistant();
        sendResponse({ success: true });
        break;

      case "GET_PAGE_CONTEXT":
        const context = this.extractPageContext();
        sendResponse({ context });
        break;

      default:
        sendResponse({ error: "Unknown message type" });
    }
  }

  extractPageContext() {
    // Extract context from current IICS page
    return {
      url: window.location.href,
      title: document.title,
      page_type: this.detectPageType(),
    };
  }

  detectPageType() {
    const url = window.location.href;
    if (url.includes("/home")) return "home";
    if (url.includes("/monitor")) return "monitor";
    if (url.includes("/explore")) return "explore";
    return "unknown";
  }
}

// Initialize the assistant when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new IICSAssistant());
} else {
  new IICSAssistant();
}
