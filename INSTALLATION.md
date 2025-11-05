# IICS Conversational Agent - Chrome Extension Installation Guide

This guide will help you install and set up the IICS Conversational Agent as a Chrome extension, similar to the Informatica Assistant shown in your screenshot.

## 📋 Prerequisites

1. **Backend Server Running**: Make sure your Flask backend is running on `http://localhost:5000`
2. **Chrome Browser**: Version 88 or higher
3. **IICS Account**: Valid Informatica IICS credentials with API access

## 🚀 Installation Steps

### Step 1: Prepare the Extension

1. **Navigate to the extension folder**:
   ```
   cd iics-chatbot/extension
   ```

2. **Create icon files** (you can use any 16x16, 32x32, 48x48, and 128x128 PNG images):
   - Place icon files in the `icons/` folder
   - Name them: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
   - Or use the provided placeholder icons

### Step 2: Load Extension in Chrome

1. **Open Chrome** and navigate to `chrome://extensions/`

2. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load Unpacked Extension**:
   - Click "Load unpacked" button
   - Select the `iics-chatbot/extension` folder
   - Click "Select Folder"

4. **Verify Installation**:
   - You should see "IICS Conversational Agent" in your extensions list
   - The extension icon should appear in your Chrome toolbar

### Step 3: Configure Backend URL

1. **Click the extension icon** in the Chrome toolbar

2. **Open Settings**:
   - Click the ⚙️ settings button in the popup
   - Update the "Backend URL" if your Flask server is running on a different port
   - Default: `http://localhost:5000`

3. **Save Settings**:
   - Click "Save" to apply changes

### Step 4: Test the Extension

1. **Navigate to an IICS page**:
   - Go to `https://dm-us.informaticacloud.com` (or your IICS region)
   - Log into your IICS account

2. **Look for the Assistant**:
   - You should see a purple "Informatica Assistant" button on the right side of the page
   - This is similar to the assistant shown in your screenshot

3. **Click the Assistant Button**:
   - The assistant panel will open
   - Enter your IICS credentials to connect

## 🎯 Usage

### Using the Extension Popup

1. **Click the extension icon** in Chrome toolbar
2. **Enter IICS credentials**:
   - Username (email)
   - Password
   - Client ID (from IICS OAuth settings)
   - Client Secret (from IICS OAuth settings)
3. **Start chatting** with the assistant

### Using the In-Page Assistant

1. **Visit any IICS page** (Data Integration, Monitor, etc.)
2. **Click the "Informatica Assistant" button** on the right side
3. **The assistant panel will open** embedded in the page
4. **Enter credentials and start using** the assistant

### Quick Actions

The assistant provides quick action buttons for common tasks:
- 🚀 **Run Task** - Execute mapping tasks or workflows
- 📊 **Check Status** - Monitor task execution status
- ❌ **Failed Jobs** - View failed job reports
- 🔗 **Connections** - Manage IICS connections

## 🔧 Configuration Options

### Backend Settings
- **Backend URL**: URL of your Flask server (default: `http://localhost:5000`)
- **Auto-connect**: Remember credentials for automatic login
- **Theme**: Light, Dark, or Auto theme selection

### Extension Permissions
The extension requires these permissions:
- **Active Tab**: To interact with IICS pages
- **Storage**: To save settings and credentials
- **Host Permissions**: To communicate with IICS and backend servers

## 🐛 Troubleshooting

### Extension Not Loading
- Check that all files are in the correct folders
- Ensure manifest.json is valid
- Look for errors in Chrome's extension developer tools

### Assistant Not Appearing on IICS Pages
- Verify you're on a valid IICS domain (*.informaticacloud.com)
- Check the browser console for JavaScript errors
- Try refreshing the page

### Connection Issues
- Verify your Flask backend is running on the correct port
- Check the backend URL in extension settings
- Ensure CORS is properly configured in your Flask app
- Verify IICS credentials are correct

### Backend Communication Errors
- Check if the backend server is accessible
- Verify the `/health` endpoint returns 200 OK
- Check browser network tab for failed requests
- Ensure proper CORS headers are set

## 📁 File Structure

```
extension/
├── manifest.json              # Extension configuration
├── popup/                     # Extension popup interface
│   ├── popup.html            # Popup HTML
│   ├── popup.css             # Popup styles
│   └── popup.js              # Popup JavaScript
├── content/                   # Page integration scripts
│   ├── content.js            # Content script for IICS pages
│   └── content.css           # Content script styles
├── background/                # Background service worker
│   └── background.js         # Background script
├── icons/                     # Extension icons
│   ├── icon16.png            # 16x16 icon
│   ├── icon32.png            # 32x32 icon
│   ├── icon48.png            # 48x48 icon
│   └── icon128.png           # 128x128 icon
└── INSTALLATION.md           # This file
```

## 🔒 Security Notes

- **Credentials Storage**: Credentials are stored locally in Chrome's secure storage
- **HTTPS Only**: The extension only works on HTTPS IICS pages
- **Content Security Policy**: Strict CSP prevents unauthorized script execution
- **Permissions**: Minimal required permissions for functionality

## 🚀 Publishing to Chrome Web Store (Optional)

If you want to publish this extension:

1. **Create a Chrome Web Store Developer Account**
2. **Package the extension**:
   ```bash
   # Create a ZIP file of the extension folder
   zip -r iics-assistant-extension.zip extension/
   ```
3. **Upload to Chrome Web Store**
4. **Fill in store listing details**
5. **Submit for review**

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all prerequisites are met
3. Test the backend API endpoints directly
4. Check Chrome extension developer tools
5. Review the troubleshooting section above

## 🔄 Updates

To update the extension:
1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension
4. Test the updated functionality

The extension will automatically reload when you make changes during development.
