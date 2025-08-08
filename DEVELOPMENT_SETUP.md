# 🛠️ TigerCat Development Setup

## 🔑 API Key Management Approaches

### **1. User-Controlled (Production) - Current Default**
Users enter their own API keys via extension settings:
```javascript
// Users click "Settings" in popup and enter their key
// Stored in Chrome's secure storage
const { openaiApiKey } = await chrome.storage.local.get(['openaiApiKey']);
```

**Benefits:**
- ✅ Users control their own costs
- ✅ No shared API limits
- ✅ Secure, encrypted storage
- ✅ No keys in source code

### **2. Developer Config (Development)**
For development/testing, use a config file:

#### **Step 1: Create config.js**
```bash
# Copy the example file
cp config.example.js config.js
```

#### **Step 2: Add your keys**
```javascript
// config.js (DO NOT commit this file!)
const CONFIG = {
    OPENAI_API_KEY: 'sk-your-actual-api-key-here',
    OPENAI_MODEL: 'gpt-4o-mini',
    OPENAI_MAX_TOKENS: 1000,
    OPENAI_TEMPERATURE: 0.7,
    // ... other settings
};

window.TIGERCAT_CONFIG = CONFIG;
```

#### **Step 3: Load config in manifest**
```json
{
  "content_scripts": [
    {
      "matches": ["*://*.instructure.com/*"],
      "js": [
        "config.js",
        "content/canvas-detector.js"
      ]
    }
  ]
}
```

### **3. Environment Variables (Build Process)**
For advanced setups with build tools:

#### **Package.json setup**
```json
{
  "scripts": {
    "build": "webpack --mode=production",
    "dev": "webpack --mode=development",
    "build:config": "node scripts/build-config.js"
  },
  "devDependencies": {
    "webpack": "^5.0.0",
    "dotenv": "^16.0.0"
  }
}
```

#### **.env file**
```env
# .env (DO NOT commit!)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
UNIVERSITY_NAME=Pacific University
```

#### **Build script (scripts/build-config.js)**
```javascript
require('dotenv').config();
const fs = require('fs');

const config = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    UNIVERSITY_NAME: process.env.UNIVERSITY_NAME || 'Pacific University'
};

fs.writeFileSync('config.js', `window.TIGERCAT_CONFIG = ${JSON.stringify(config, null, 2)};`);
```

## 🔄 API Key Priority System

The extension checks for API keys in this order:

1. **User's stored key** (chrome.storage.local)
2. **Developer config key** (config.js)
3. **Environment variable** (if using build process)
4. **Error if none found**

```javascript
// Priority system in background/service-worker.js
const { openaiApiKey } = await chrome.storage.local.get(['openaiApiKey']);
const config = getConfig();
const apiKey = openaiApiKey || config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
```

## 🛡️ Security Best Practices

### **DO:**
- ✅ Use `config.js` for development only
- ✅ Add `config.js` to `.gitignore`
- ✅ Use Chrome storage for production
- ✅ Validate API keys before using
- ✅ Handle API errors gracefully

### **DON'T:**
- ❌ Commit API keys to Git
- ❌ Hardcode keys in source files
- ❌ Share config.js files
- ❌ Log API keys to console
- ❌ Store keys in localStorage

## 🎯 Recommended Development Workflow

### **For Quick Testing:**
1. Copy `config.example.js` to `config.js`
2. Add your OpenAI API key
3. Test extension with your key

### **For Production:**
1. Remove/comment out config.js
2. Users enter their own keys via Settings
3. Extension uses Chrome storage

### **For Team Development:**
1. Each developer has their own `config.js`
2. Use environment variables in CI/CD
3. Never commit secrets to repo

## 📋 Setup Checklist

- [ ] Copy `config.example.js` to `config.js`
- [ ] Add your OpenAI API key to `config.js`
- [ ] Verify `config.js` is in `.gitignore`
- [ ] Test extension with config key
- [ ] Test extension with user-entered key
- [ ] Remove config key before production

## 🔍 Debugging API Keys

```javascript
// Add to background/service-worker.js for debugging
console.log('🔑 API Key source:', {
    userKey: !!openaiApiKey,
    configKey: !!config.OPENAI_API_KEY,
    usingKey: apiKey ? apiKey.slice(0, 7) + '...' : 'none'
});
```

This setup gives you the flexibility of `.env` files for development while maintaining security for production users! 🔐
