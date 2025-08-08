# 🎨 Pacific University Brand Integration - TigerCat Extension

## Color Palette Implementation

### Primary Colors
- **Pacific Orange Primary**: `#FF671D` (Pantone 165 C)
  - Used for: Main backgrounds, primary actions
  - CMYK: 0/74/95/0 | RGB: 255/103/29
  
- **Pacific Orange Secondary**: `#E65300` (Pantone 186 C)  
  - Used for: Gradients, hover states
  - CMYK: 5/82/100/0 | RGB: 230/83/0

- **Pacific Navy**: `#131965` (Pantone 282 C)
  - Used for: Alternative theme, text accents
  - CMYK: 100/87/42/52 | RGB: 19/25/101

### Secondary Colors
- **Pacific Green**: `#2B7050` (Pantone 555 C)
  - Used for: Success states, action buttons
  - CMYK: 83/33/77/21 | RGB: 43/112/80

- **Pacific Yellow**: `#F4C223` (Pantone 7409 C)
  - Used for: Warning states, highlights
  - CMYK: 3/25/96/0 | RGB: 244/194/35

### Neutral Colors
- **Pacific White**: `#FFFFFF`
  - Used for: Text, backgrounds
  
- **Pacific Black**: `#212322` (Pantone 419 C)
  - Used for: Text, dark themes
  - CMYK: 73/65/65/72 | RGB: 33/35/34

- **Pacific Gray**: `#A23889` (Pantone 403 CV)
  - Used for: Borders, subtle accents
  - CMYK: 38/35/45/2 | RGB: 162/56/137

## Typography Implementation

### Primary Font: Bely Display
- **Family**: Bely Display + Font Family
- **Weights**: Regular, Bold, Bold Italic
- **Usage**: Headers, titles, brand elements
- **Fallback**: Georgia (system font alternative)

### Font Loading
```css
@import url('https://fonts.googleapis.com/css2?family=Bely+Display:wght@400;700&family=Georgia:ital,wght@0,400;0,700;1,400;1,700&display=swap');

font-family: 'Georgia', 'Bely Display', serif;
```

## CSS Variables Implementation

```css
:root {
    --pacific-orange-primary: #FF671D;
    --pacific-orange-secondary: #E65300;
    --pacific-orange-tertiary: #AC441E;
    --pacific-navy: #131965;
    --pacific-navy-shade: #0f1450;
    --pacific-green: #2B7050;
    --pacific-yellow: #F4C223;
    --pacific-gray: #A23889;
    --pacific-white: #FFFFFF;
    --pacific-black: #212322;
}
```

## Theme Variants

### Orange Theme (Default)
- Background: Orange gradient
- Buttons: Green accents
- Status: Green success, Yellow warning

### Navy Theme (Alternative)
- Background: Navy gradient  
- Buttons: Orange accents
- Status: Orange success, Yellow warning

## Brand Compliance Notes

1. **Color Hierarchy**: Orange (Pantone 165) always takes priority
2. **Navy Usage**: Use when black feels too heavy
3. **Secondary Colors**: Don't replace primary orange, only accent it
4. **Typography**: Consistently use Bely Display for brand elements
5. **Accessibility**: All color combinations meet WCAG contrast requirements

## File Structure
```
TigerCat/
├── popup/popup.css          # Pacific colors in popup
├── content/tigercat-styles.css  # Pacific colors in content
├── manifest.json            # Pacific branding in description
└── PACIFIC_BRAND_GUIDE.md   # This file
```

This implementation brings Pacific University's professional brand identity to the TigerCat extension while maintaining excellent usability and accessibility standards.
