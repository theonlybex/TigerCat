# 📚 Canvas API Setup Guide for TigerCat

## 🎯 Overview
TigerCat needs access to your Canvas courses to analyze course materials and provide intelligent assistance. This requires two pieces of information:

1. **Canvas API Key** - Your personal access token
2. **Canvas Base URL** - Your institution's Canvas website

## 🔑 Getting Your Canvas API Key

### **Step 1: Log into Canvas**
1. Go to your Canvas website (e.g., `https://canvas.university.edu`)
2. Log in with your student/faculty credentials

### **Step 2: Go to Account Settings**
1. Click your **profile picture** (top-right corner)
2. Select **"Settings"** from the dropdown menu

### **Step 3: Create Access Token**
1. Scroll down to **"Approved Integrations"** section
2. Click **"+ New Access Token"** button
3. Fill out the form:
   - **Purpose**: `TigerCat Extension`
   - **Expires**: Leave blank (or set far future date)
4. Click **"Generate Token"**

### **Step 4: Copy Your Token**
1. **Important**: Copy the generated token immediately
2. It will look like: `1234~aBcDeFgHiJkLmNoPqRsTuVwXyZ...`
3. You **cannot** see this token again after closing the dialog

### **Step 5: Add to TigerCat**
1. Click TigerCat extension icon
2. Click **"Settings"** button
3. Choose **"2 - Canvas API Key"**
4. Paste your token
5. Click OK

## 🌐 Setting Your Canvas Base URL

### **Common Canvas URL Formats:**
- `https://[school].instructure.com` (most common)
- `https://canvas.[school].edu`
- `https://[school].canvas.edu`
- `https://lms.[school].edu`

### **Examples:**
- Pacific University: `https://pacific.instructure.com`
- Generic University: `https://university.instructure.com`
- State College: `https://canvas.statecollege.edu`

### **How to Add:**
1. Click TigerCat Settings
2. Choose **"3 - Canvas Base URL"**
3. Enter your complete Canvas URL
4. Click OK

## ✅ Verification

### **Check Your Settings:**
1. TigerCat Settings → **"4 - View current settings"**
2. You should see:
   - ✅ Canvas API Key: Set
   - ✅ Canvas URL: [your URL]
   - ✅ Course Analysis: Ready

### **Test Canvas Access:**
1. Go to any Canvas page
2. TigerCat should show "Connected to Canvas"
3. Try asking: "What courses am I enrolled in?"

## 🔒 Security & Privacy

### **Your API Key:**
- ✅ Stored securely in Chrome's encrypted storage
- ✅ Only used to access YOUR courses
- ✅ Never shared or logged
- ✅ Can be removed anytime

### **Canvas Permissions:**
Your API key can only access:
- ✅ Courses you're enrolled in
- ✅ Files you have permission to view
- ✅ Assignments visible to you
- ❌ Other students' data
- ❌ Grades of other students
- ❌ Administrative functions

## 🛠️ Troubleshooting

### **"Canvas API authentication failed"**
- ❌ **Problem**: Invalid API key
- ✅ **Solution**: Generate a new API key and update TigerCat

### **"Canvas API access denied"**
- ❌ **Problem**: Insufficient permissions
- ✅ **Solution**: Make sure you're enrolled in the course

### **"Canvas API error: 404"**
- ❌ **Problem**: Wrong Canvas URL
- ✅ **Solution**: Check your Canvas base URL setting

### **"Course not found"**
- ❌ **Problem**: Course access restricted
- ✅ **Solution**: Contact your instructor about course availability

## 🎓 What TigerCat Can Do With Canvas Access

### **Course Analysis:**
- 📚 List all your courses
- 📁 Analyze course files and documents
- 📝 Review assignments and due dates
- 📖 Access course pages and content

### **AI-Powered Help:**
- 💬 Answer questions about specific course materials
- 📋 Help with assignment requirements
- 🔍 Search through course content
- 📊 Summarize readings and lectures

### **Smart Features:**
- ⏰ Assignment deadline reminders
- 📈 Study progress tracking
- 🎯 Personalized learning suggestions
- 🔗 Quick access to course resources

## 📞 Need Help?

### **Canvas API Issues:**
- Contact your institution's IT support
- Check Canvas status page
- Verify your account permissions

### **TigerCat Issues:**
- Check browser console for errors
- Try regenerating your Canvas API key
- Reset TigerCat settings and reconfigure

## 🚀 Ready to Go!

Once you've set up both your Canvas API key and base URL, TigerCat will be able to:

1. **Access your courses** directly from Canvas
2. **Analyze course materials** automatically
3. **Provide intelligent responses** based on your specific course content
4. **Help with assignments** using actual course materials

Your Canvas-powered TigerCat is ready to help you succeed! 🐅📚
