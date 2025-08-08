# 🐅 TigerCat Chrome Extension - Pacific Branded Setup Guide

*Featuring Pacific University's official brand colors and typography*

## How to Load and Test the Extension

### Step 1: Enable Developer Mode
1. Open Chrome
2. Go to `chrome://extensions/`
3. Turn on **Developer mode** (toggle in top-right corner)

### Step 2: Load the Extension
1. Click **"Load unpacked"** button
2. Navigate to your `TigerCat` project folder
3. Select the folder and click **"Select Folder"**
4. The TigerCat extension should now appear in your extensions list

### Step 3: Test the Extension

#### Testing the Popup:
1. Look for the TigerCat icon in your Chrome toolbar (you might need to click the puzzle piece icon to see it)
2. Click the TigerCat icon to open the popup
3. You should see a beautiful popup with the TigerCat interface

#### Testing on Canvas:
1. Navigate to any Canvas LMS website (like your school's Canvas)
2. Wait 2 seconds - TigerCat should automatically appear as a floating box in the top-right
3. You can:
   - Drag the box around by clicking and holding the header
   - Minimize it with the "−" button
   - Close it with the "×" button
   - Click "Start Chat" to see the coming soon message

#### Testing the Detection:
1. When on a Canvas page, click the extension icon
2. The popup should show "Canvas Detected!" status
3. When on non-Canvas pages, it should show "Not on Canvas"

## Folder Structure

```
TigerCat/
├── manifest.json              # Extension configuration
├── popup/
│   ├── popup.html            # Extension popup interface
│   ├── popup.css             # Popup styling
│   └── popup.js              # Popup functionality
├── content/
│   ├── canvas-detector.js    # Runs on Canvas pages
│   └── tigercat-styles.css   # Injected styles
├── background/
│   └── service-worker.js     # Background processing
└── icons/                    # Extension icons (to be added)
```

## What the Extension Does Currently

1. **Detects Canvas Pages**: Automatically recognizes when you're on Canvas
2. **Shows Popup Interface**: Click extension icon for status and controls
3. **Injects TigerCat Box**: Floating AI assistant box appears on Canvas pages
4. **Basic Interactions**: Draggable, minimizable, closeable interface
5. **Mock Features**: Placeholder buttons for upcoming AI features
6. **Pacific Branding**: 
   - Orange gradient backgrounds (Pantone 165 C & 186 C)
   - Bely Display & Georgia typography
   - Green accent colors (Pantone 555 C) 
   - Navy theme variant available
   - Brand-compliant color palette

## Next Steps for Development

1. **Add Real Icons**: Create actual icon files for the extension
2. **Canvas API Integration**: Connect to real Canvas API
3. **AI Integration**: Add real AI chat functionality
4. **File Processing**: Implement document analysis
5. **Enhanced UI**: Improve the chat interface

## Troubleshooting

### Extension Won't Load:
- Check that you selected the correct folder (the one with `manifest.json`)
- Look for error messages in the Extensions page
- Make sure all files are saved

### TigerCat Box Doesn't Appear:
- Make sure you're on a real Canvas website
- Check the browser console (F12) for error messages
- Try refreshing the page

### Popup Doesn't Work:
- Check if the extension is enabled in chrome://extensions/
- Look for JavaScript errors in the popup (right-click popup → Inspect)

## Development Tips

- **Live Reloading**: After making code changes, go to chrome://extensions/ and click the refresh icon on TigerCat
- **Debugging**: Use browser developer tools to debug content scripts and popup
- **Console Logs**: Check browser console for TigerCat debug messages (they start with 🐅)

Ready to test your first Chrome extension! 🚀
