# Budgetly Setup Guide

This guide will help you set up and run Budgetly on your device.

## Prerequisites

### 1. Firefly III Instance

You need a running Firefly III instance. You can:
- Self-host it on your server
- Use a hosting provider
- Run it locally with Docker

**Docker Quick Start:**
```bash
docker run -d \
  --name=firefly \
  -p 8080:8080 \
  -e APP_KEY=<generate-random-key> \
  -e DB_CONNECTION=sqlite \
  fireflyiii/core:latest
```

### 2. Personal Access Token (PAT)

1. Log in to your Firefly III instance
2. Go to **Profile** (top right menu)
3. Click on **OAuth**
4. Scroll to **Personal Access Tokens**
5. Click **Create New Token**
6. Give it a name (e.g., "Budgetly Mobile")
7. Click **Create**
8. **Copy the token** - you won't see it again!

### 3. Development Environment

**Install Node.js:**
- Download from https://nodejs.org/ (LTS version recommended)
- Verify installation: `node --version`

**Install Expo CLI:**
```bash
npm install -g expo-cli
```

## Installation Steps

### Step 1: Clone and Install

```bash
# Navigate to your projects directory
cd ~/Projects

# Clone the repository (or navigate to existing directory)
cd budgetly

# Install dependencies
npm install
```

### Step 2: Start Development Server

```bash
npm start
```

This will open Expo DevTools in your browser.

### Step 3: Run on Device

#### Option A: Physical Device (Recommended)

1. **Install Expo Go app:**
   - iOS: Download from App Store
   - Android: Download from Google Play

2. **Connect to same WiFi** as your development computer

3. **Scan QR code:**
   - iOS: Use Camera app to scan QR code from terminal/browser
   - Android: Use Expo Go app to scan QR code

#### Option B: Emulator/Simulator

**iOS Simulator (Mac only):**
```bash
npm run ios
```

**Android Emulator:**
```bash
npm run android
```

## First Launch Configuration

### 1. Open the App

When you first launch Budgetly, you'll see the setup screen.

### 2. Enter Instance URL

Enter your Firefly III instance URL. Examples:
- `https://firefly.example.com`
- `http://192.168.1.100:8080` (local network)
- `https://my-firefly.herokuapp.com`

**Tips:**
- Include `https://` or `http://`
- No trailing slash
- Make sure it's accessible from your device

### 3. Enter Personal Access Token

Paste the Personal Access Token you created earlier.

### 4. Connect

Tap the "Connect" button. The app will:
- Validate your URL
- Test the connection
- Verify your token
- Save credentials securely

If successful, you'll be taken to the Dashboard!

## Troubleshooting

### Connection Failed

**"Cannot connect to Firefly III"**
- Check your instance URL is correct
- Verify the instance is running
- Ensure your device can reach the URL
- If using localhost, try your computer's IP address instead

**"Invalid credentials"**
- Verify your Personal Access Token is correct
- Make sure the token hasn't expired
- Try creating a new token

**"Network Error"**
- Check WiFi connection
- Verify firewall settings
- Try accessing the URL in your device's browser first

### Local Development Issues

**"Unable to resolve module"**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

**Metro bundler issues**
```bash
# Kill all node processes
killall node
# Restart
npm start
```

### iOS/Android Specific

**iOS: "Unable to verify app"**
- Go to Settings > General > Device Management
- Trust the developer certificate

**Android: "Installation failed"**
- Enable "Install from Unknown Sources" in settings
- Try: `adb uninstall com.yourcompany.budgetly` then reinstall

## Network Configuration

### Same Network Access

For local development, ensure:
1. Computer and device on same WiFi
2. No VPN active on either device
3. Router allows device-to-device communication

### Remote Access

To access a remote Firefly III instance:
1. Instance must have valid SSL certificate (HTTPS)
2. Port forwarding configured if self-hosted
3. Domain name recommended over IP address

### Local Firefly III

If running Firefly III locally:
1. Find your computer's local IP:
   - Mac/Linux: `ifconfig | grep inet`
   - Windows: `ipconfig`
2. Use IP instead of localhost: `http://192.168.1.X:8080`

## Building for Production

### Create Expo Account

```bash
npx expo login
```

### Configure app.json

Update `app.json` with your details:
```json
{
  "expo": {
    "name": "Budgetly",
    "slug": "budgetly",
    "owner": "your-username",
    "ios": {
      "bundleIdentifier": "com.yourcompany.budgetly"
    },
    "android": {
      "package": "com.yourcompany.budgetly"
    }
  }
}
```

### Build

**iOS:**
```bash
eas build --platform ios
```

**Android:**
```bash
eas build --platform android
```

## Security Best Practices

1. **Never share your Personal Access Token**
2. **Use HTTPS for production instances**
3. **Rotate tokens periodically**
4. **Don't commit tokens to version control**
5. **Use strong passwords for Firefly III**

## Getting Help

1. **App Issues**: Check this repository's Issues
2. **Firefly III Questions**: https://github.com/firefly-iii/firefly-iii
3. **Expo Problems**: https://expo.dev/

## Next Steps

After successful setup:
1. Explore the Dashboard to see your financial overview
2. Add a transaction in the Expenses screen
3. Create budgets to track spending
4. Check out all the features in the drawer menu

Enjoy using Budgetly! 🎉

