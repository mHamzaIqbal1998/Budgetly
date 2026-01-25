# Budgetly - Quick Start Guide

Get up and running with Budgetly in 5 minutes!

## Prerequisites

Before you begin, ensure you have:
- ✅ Node.js 18+ installed
- ✅ A Firefly III instance (URL)
- ✅ A Personal Access Token from Firefly III

## Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages including React Native Paper, TanStack Query, and more.

## Step 2: Start Development Server

```bash
npm start
```

This starts the Expo development server. You'll see a QR code in your terminal.

## Step 3: Run on Device

### Option A: Physical Device (Recommended)

1. Install **Expo Go** from:
   - iOS: App Store
   - Android: Google Play Store

2. Scan the QR code:
   - iOS: Open Camera app → scan QR code
   - Android: Open Expo Go → scan QR code

### Option B: Simulator/Emulator

**iOS (Mac only):**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

## Step 4: Configure Firefly III Connection

When the app opens:

1. **Enter Instance URL**
   - Example: `https://firefly.yourcompany.com`
   - Or local: `http://192.168.1.100:8080`

2. **Enter Personal Access Token**
   - Get it from: Firefly III → Profile → OAuth → Personal Access Tokens
   - Click "Create New Token"
   - Copy and paste into the app

3. **Tap "Connect"**
   - The app validates your credentials
   - If successful, you'll see your Dashboard!

## Step 5: Explore Features

### Dashboard
- View account balances and budget summaries
- See quick insights
- Use the **+** button for quick actions

### Add Your First Transaction
1. Go to **Expenses** (from drawer menu)
2. Tap the **+** button
3. Select type (Expense/Income/Transfer)
4. Fill in details
5. Tap **Add**

### Create a Budget
1. Go to **Budgets** (from drawer menu)
2. Tap the **+** button
3. Enter budget name
4. Set as active
5. Tap **Create**

### Check Other Screens
- **Accounts**: View all connected accounts
- **Piggy Banks**: Track savings goals
- **Subscriptions**: View recurring transactions
- **Settings**: Update credentials or sign out

## Common Commands

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run linter
npm run lint

# Clear cache
npx expo start --clear
```

## Troubleshooting

### Can't Connect to Firefly III?

**Check URL format:**
- ✅ `https://firefly.example.com`
- ❌ `firefly.example.com/` (missing protocol, has trailing slash)

**For local instances:**
- Use your computer's IP instead of `localhost`
- Example: `http://192.168.1.50:8080`
- Find IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)

**Network issues:**
- Ensure device and computer on same WiFi
- Check firewall settings
- Verify Firefly III is accessible in device browser

### Invalid Credentials?

1. Verify your Personal Access Token is correct
2. Check token hasn't expired
3. Try creating a new token in Firefly III
4. Ensure you copied the entire token (no spaces)

### App Won't Start?

```bash
# Clear everything and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

### Module Not Found?

```bash
# Reinstall dependencies
npm install
# Restart Metro bundler
npx expo start --clear
```

## Project Structure Quick Reference

```
budgetly/
├── app/
│   ├── (auth)/setup.tsx          # Login screen
│   ├── (drawer)/                  # Main app screens
│   │   ├── dashboard.tsx
│   │   ├── expenses.tsx
│   │   ├── budgets.tsx
│   │   ├── accounts.tsx
│   │   ├── piggy-banks.tsx
│   │   ├── subscriptions.tsx
│   │   ├── reports.tsx
│   │   └── settings.tsx
│   └── _layout.tsx                # Root layout
├── lib/
│   ├── api-client.ts             # Firefly III API
│   ├── store.ts                  # App state
│   └── query-client.ts           # React Query config
├── types/firefly.ts              # TypeScript types
└── hooks/use-api.ts              # API hooks
```

## Next Steps

1. ✅ Connect to your Firefly III instance
2. ✅ Explore the dashboard
3. ✅ Add your first transaction
4. ✅ Create a budget
5. ✅ Check out all the features

## Need Help?

- **Setup Issues**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Full Documentation**: See [README.md](./README.md)
- **Firefly III Help**: https://docs.firefly-iii.org/

## Tips

💡 **Use Pull to Refresh**: Pull down on any screen to refresh data

💡 **Quick Actions**: Use the floating + button on Dashboard

💡 **Search**: Use the search bar in Expenses to find transactions

💡 **Secure**: Your credentials are stored securely on device only

---

**Ready to manage your finances!** 🎉

Start the development server and begin exploring Budgetly!

