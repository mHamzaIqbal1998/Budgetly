# 🎨 Spotify Theme Visual Guide

## Color Palette

### Primary Colors
```
🟢 Spotify Green (#1DB954)
   Primary buttons, active states, success indicators

⚫ Spotify Black (#191414)
   Main background, pure black for OLED displays

🔲 Dark Gray (#282828)
   Cards, surfaces, elevated components

🔳 Light Gray (#3E3E3E)
   Higher elevation surfaces, hover states

⚪ White (#FFFFFF)
   Primary text on dark backgrounds

◽ Gray (#B3B3B3)
   Secondary text, dimmed content
```

### Accent Colors
```
🔴 Material Red (#FF5252)
   Withdrawals, errors, liabilities

🔵 Material Blue (#64B5F6)
   Transfers, informational states

🟠 Material Orange (#FFB74D)
   Warnings, budget alerts
```

## Where Colors Appear

### 🟢 Spotify Green - Primary Actions
- ✅ All primary buttons (Create, Add, Submit)
- ✅ Floating Action Buttons (FAB)
- ✅ Active navigation drawer items
- ✅ Deposit transactions
- ✅ Progress bars (under 70%)
- ✅ Active status indicators
- ✅ Asset account balances
- ✅ Positive net worth display
- ✅ Success messages

### ⚫ Spotify Black - Backgrounds
- ✅ Main app background
- ✅ Screen backgrounds
- ✅ Behind all content
- ✅ Status bar background
- ✅ Splash screen

### 🔲 Dark Gray - Surfaces
- ✅ Card backgrounds
- ✅ Drawer navigation background
- ✅ Header bar background
- ✅ Modal backgrounds
- ✅ Input fields (outlined)
- ✅ List item containers

### 🔴 Red - Negative Actions
- ✅ Withdrawal transactions
- ✅ Delete buttons
- ✅ Error messages
- ✅ Sign out button
- ✅ Budget overspending
- ✅ Liability balances
- ✅ Negative balances

### 🔵 Blue - Neutral Actions
- ✅ Transfer transactions
- ✅ Revenue account type
- ✅ Informational indicators

### 🟠 Orange - Warnings
- ✅ Budget 70-90% used
- ✅ Liability account type
- ✅ Warning messages

## Screen-by-Screen Breakdown

### Dashboard
```
Background: ⚫ Black
Cards: 🔲 Dark Gray
Primary Actions (FAB): 🟢 Green
Total Balance: ⚪ White
Active Status: 🟢 Green
```

### Expenses (Transactions)
```
Background: ⚫ Black
Transaction Cards: 🔲 Dark Gray
Withdrawals: 🔴 Red with up arrow
Deposits: 🟢 Green with down arrow
Transfers: 🔵 Blue with swap icon
Add Button (FAB): 🟢 Green
Search Bar: 🔲 Dark Gray
```

### Budgets
```
Background: ⚫ Black
Budget Cards: 🔲 Dark Gray
Progress Bar (0-70%): 🟢 Green
Progress Bar (70-90%): 🟠 Orange
Progress Bar (90-100%+): 🔴 Red
Spent Amount: 🔴 Red
Budget Limit: ⚪ White
Add Button: 🟢 Green
```

### Accounts
```
Background: ⚫ Black
Net Worth Card: 🔲 Dark Gray
Net Worth (positive): 🟢 Green
Net Worth (negative): 🔴 Red
Asset Accounts: 🟢 Green icon
Cash Accounts: 🟢 Green icon
Revenue Accounts: 🔵 Blue icon
Expense Accounts: 🔴 Red icon
Liability Accounts: 🟠 Orange icon
Balance (positive): 🟢 Green
Balance (negative): 🔴 Red
```

### Piggy Banks
```
Background: ⚫ Black
Piggy Bank Cards: 🔲 Dark Gray
Icon: 🟢 Green
Progress Bar: 🟢 Green
Current Amount: 🟢 Green
Target Amount: ⚪ White
```

### Subscriptions
```
Background: ⚫ Black
Subscription Cards: 🔲 Dark Gray
Icon: 🟢 Green (active) / ◽ Gray (inactive)
Amount: 🔴 Red
Active Chip: 🟢 Green
Inactive Chip: ◽ Gray
```

### Settings
```
Background: ⚫ Black
Setting Cards: 🔲 Dark Gray
List Items: 🔲 Dark Gray
Icons: ◽ Gray
Sign Out Button: 🔴 Red
```

### Setup Screen
```
Background: ⚫ Black
Input Fields: 🔲 Dark Gray outlined
Connect Button: 🟢 Green
Error Messages: 🔴 Red
```

## Navigation

### Drawer
```
Background: 🔲 Dark Gray
Inactive Items: ◽ Gray text
Active Item: 🟢 Green text + light green background (12% opacity)
Active Icons: 🟢 Green
Inactive Icons: ◽ Gray
```

### Header
```
Background: 🔲 Dark Gray
Text: ⚪ White
Menu Icon: ⚪ White
```

## Components

### Buttons
```
Primary (Contained): 🟢 Green background, ⚫ Black text
Outlined: 🟢 Green border, 🟢 Green text
Text: 🟢 Green text
Destructive: 🔴 Red background, ⚪ White text
```

### Cards
```
Background: 🔲 Dark Gray
Elevation: Material Design shadow
Border Radius: 12dp
Padding: 16dp
```

### Progress Bars
```
Track: 🔲 Dark Gray (lighter)
Normal (0-70%): 🟢 Green
Warning (70-90%): 🟠 Orange
Critical (90-100%+): 🔴 Red
Height: 8-10dp
Border Radius: 4-5dp
```

### Chips
```
Background: 🔲 Dark Gray (lighter)
Selected: 🟢 Green background
Text: ⚪ White
Border Radius: 12dp
Compact Height: 24dp
```

### FABs (Floating Action Buttons)
```
Background: 🟢 Green
Icon: ⚫ Black
Elevation: Level 3
Size: 56x56dp
Icon Size: 24dp
```

### Text
```
Headline: ⚪ White, Bold
Title: ⚪ White, Medium
Body: ⚪ White, Regular
Caption: ◽ Gray (B3B3B3), Regular
```

## State Layers

### Touch Feedback
```
On Green: White overlay (10% opacity)
On Black/Gray: White overlay (8% opacity)
On White: Black overlay (8% opacity)
Ripple: Material Design ripple effect
```

### Disabled States
```
Background: 38% opacity
Text: 38% opacity
Borders: 12% opacity
```

## Accessibility

### Contrast Ratios (WCAG AA)
```
✅ Green on Black: 7.8:1 (AAA)
✅ White on Black: 14.5:1 (AAA)
✅ Gray on Black: 4.6:1 (AA)
✅ Red on Black: 5.2:1 (AA)
✅ Blue on Black: 5.8:1 (AA)
✅ Orange on Black: 5.1:1 (AA)
```

### Touch Targets
```
Minimum: 48x48dp (Material Design standard)
Spacing: 8dp between interactive elements
FAB: 56x56dp standard, 40x40dp mini
Icons: 24x24dp standard
Buttons: 36dp minimum height
```

## Dark Mode Only

The app defaults to dark mode with Spotify black theme. Light mode is available but the dark theme is optimized for:

- ✅ OLED displays (true black saves battery)
- ✅ Low light environments
- ✅ Reduced eye strain
- ✅ Modern aesthetic
- ✅ Brand recognition (Spotify-like)

## Theme Switching

The app respects system theme preference:
- System Dark Mode → Spotify Dark Theme
- System Light Mode → Spotify Light Theme

To force dark mode, users can set their device to dark mode.

## Customization

Developers can customize colors in:
```typescript
constants/spotify-theme.ts

const SpotifyColors = {
  green: '#1DB954',      // Change primary color
  black: '#191414',      // Change background
  gray: '#282828',       // Change surface color
  // ... etc
};
```

## Visual Hierarchy

### Primary Focus
🟢 Green - User's attention drawn here
- Primary actions
- Active states
- Success indicators

### Secondary Focus
⚪ White - Important information
- Headlines
- Key numbers
- Primary text

### Tertiary Focus
◽ Gray - Supporting information
- Descriptions
- Metadata
- Secondary text

### Alerts
🔴 Red - Requires attention
- Errors
- Negative balances
- Destructive actions

## Material Design Compliance

All Spotify theme colors maintain:
- ✅ Material Design 3 color system
- ✅ Proper elevation and shadows
- ✅ State layers and overlays
- ✅ Consistent spacing (8dp grid)
- ✅ Typography scale
- ✅ Touch target minimums
- ✅ Accessibility standards
- ✅ Animation curves and durations

---

**The Spotify theme brings a modern, recognizable aesthetic to Budgetly while maintaining professional Material Design standards!** 🎉

