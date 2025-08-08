# 🤖 GPT API Integration Guide for TigerCat

## 🎯 How GPT API is Connected

### **Architecture Overview**
```
User Input → Content Script → Background Worker → OpenAI API → Response → User
```

### **Integration Points:**

1. **Background Service Worker** (`background/service-worker.js`)
   - ✅ **Primary API handler** - Makes actual GPT API calls
   - ✅ **API key management** - Securely stores and uses API keys
   - ✅ **Context building** - Prepares course context for AI
   - ✅ **Error handling** - Manages API errors gracefully

2. **Popup Settings** (`popup/popup.js`)
   - ✅ **API key input** - Users enter their OpenAI API key
   - ✅ **Key validation** - Checks API key format
   - ✅ **Storage management** - Saves keys securely

3. **Content Script Chat** (`content/canvas-detector.js`)
   - ✅ **Chat interface** - Users interact with AI
   - ✅ **Message handling** - Sends queries to background
   - ✅ **Response display** - Shows AI responses

## 🔑 Getting Your OpenAI API Key

### **Step 1: Create OpenAI Account**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to "API Keys" section

### **Step 2: Generate API Key**
1. Click "Create new secret key"
2. Name it "TigerCat Extension"
3. Copy the key (starts with `sk-`)
4. **Important**: Save it somewhere safe - you can't see it again!

### **Step 3: Add to TigerCat**
1. Click TigerCat extension icon
2. Click "Settings" button
3. Paste your API key
4. Click OK

## 💰 API Costs

### **GPT-3.5-Turbo Pricing** (Most cost-effective)
- **Input**: $0.0015 per 1K tokens (~750 words)
- **Output**: $0.002 per 1K tokens (~750 words)
- **Typical chat**: ~$0.01-0.05 per conversation

### **GPT-4 Pricing** (More advanced)
- **Input**: $0.03 per 1K tokens
- **Output**: $0.06 per 1K tokens
- **Typical chat**: ~$0.20-1.00 per conversation

### **Cost Control Features Built-in:**
- ✅ Max 1000 tokens per response
- ✅ Temperature 0.7 for focused responses
- ✅ Efficient system prompts
- ✅ Context length limits

## 🛠️ Configuration Options

### **Model Selection** (in `background/service-worker.js`)
```javascript
// Change this line to use different models:
model: "gpt-3.5-turbo", // Cheapest, fastest
// model: "gpt-4",      // More advanced, expensive
// model: "gpt-4-turbo", // Latest, balanced
```

### **Response Length**
```javascript
max_tokens: 1000, // Adjust response length (500-2000)
```

### **Response Style**
```javascript
temperature: 0.7, // 0.1-1.0 (0.1=focused, 1.0=creative)
```

## 🔒 Security Features

### **API Key Protection**
- ✅ Stored in Chrome's secure storage
- ✅ Never logged or exposed
- ✅ Only used for API calls
- ✅ Can be removed anytime

### **Data Privacy**
- ✅ No course content stored externally
- ✅ API calls go directly to OpenAI
- ✅ No third-party data sharing
- ✅ Users control their own API keys

## 🚀 Testing the Integration

### **Step 1: Load Extension**
1. Load TigerCat in Chrome
2. Set your API key in settings

### **Step 2: Test Chat**
1. Go to any Canvas page
2. Click "Start Chat" on TigerCat box
3. Ask: "Hello, can you help me with my studies?"
4. Watch for AI response!

### **Step 3: Verify API Calls**
1. Check browser console for logs
2. Look for "🐅 Processing AI chat request"
3. Monitor OpenAI usage dashboard

## 🐛 Troubleshooting

### **"API key not configured"**
- ✅ Set API key in extension settings
- ✅ Make sure it starts with "sk-"

### **"OpenAI API error: 401"**
- ❌ Invalid API key
- ✅ Generate new key from OpenAI

### **"OpenAI API error: 429"**
- ❌ Rate limit exceeded
- ✅ Wait a minute and try again

### **No response from AI**
- ✅ Check internet connection
- ✅ Verify API key has credits
- ✅ Look at browser console for errors

## 🎓 Advanced Features (Coming Soon)

### **Course Context Integration**
- 📚 Canvas file analysis
- 🔍 Document search before AI response
- 📝 Assignment-specific help

### **Smart Features**
- 💾 Conversation memory
- 📊 Study progress tracking
- 🎯 Personalized learning suggestions

## 💡 Cost Optimization Tips

1. **Use GPT-3.5-turbo** for most queries
2. **Keep conversations focused** - shorter = cheaper
3. **Clear chat regularly** to avoid long context
4. **Monitor usage** in OpenAI dashboard
5. **Set spending limits** in OpenAI account

Your TigerCat extension now has real AI power! 🐅🤖
