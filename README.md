# Budgetly - Firefly III Mobile Companion

A beautiful, modern React Native app for managing your personal finances with Firefly III.

## 🚀 Features

- **Secure Connection**: Connect to your self-hosted Firefly III instance using Personal Access Token
- **Dashboard**: Overview of your accounts, budgets, and financial insights
- **Expenses Management**: Create, view, and delete transactions
- **Budgets**: Track your spending against budgets
- **Accounts**: View all your financial accounts and balances
- **Piggy Banks**: Monitor your savings goals
- **Subscriptions**: Manage recurring transactions
- **Spotify-Inspired Theme**: Beautiful black and green design with Material Design 3
- **Offline Support**: Cached data with automatic background refresh
- **Secure Storage**: Credentials stored securely on device

## 🛠️ Tech Stack

- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **UI Library**: React Native Paper (Material Design 3)
- **Theme**: Spotify-inspired black and green color scheme
- **Navigation**: Expo Router with Drawer Navigation
- **State Management**: Zustand (for app state) + TanStack Query (for server state)
- **API Client**: Axios
- **Secure Storage**: Expo Secure Store
- **Charts**: Victory Native

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- A running Firefly III instance
- Personal Access Token from your Firefly III instance

## 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd budgetly
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your device:
   - **iOS**: Press `i` or run `npm run ios`
   - **Android**: Press `a` or run `npm run android`
   - **Web**: Press `w` or run `npm run web`

## 🔐 First Launch Setup

1. Launch the app
2. Enter your Firefly III instance URL (e.g., `https://firefly.example.com`)
3. Enter your Personal Access Token
4. Tap "Connect"

The app will validate your credentials and connect to your instance.

## 📱 Screens

### Dashboard
- Financial overview with summary cards
- Recent accounts and budgets
- Quick action buttons for common tasks

### Expenses
- List all transactions
- Search and filter capabilities
- Create new expenses, income, or transfers
- Delete transactions

### Budgets
- View all budgets with progress bars
- See spending vs. limits
- Create new budgets

### Accounts
- View all connected accounts
- See balances and account types
- Net worth calculation

### Piggy Banks
- Track savings goals
- View progress towards targets
- See remaining amounts

### Subscriptions
- Manage recurring transactions
- View frequency and amounts
- Track active/inactive subscriptions

### Settings
- Update Firefly III credentials
- View app information
- Sign out

## 🔒 Security

- Personal Access Tokens are stored using Expo Secure Store (encrypted native storage)
- No credentials are ever logged or transmitted to third parties
- All API calls go directly to your Firefly III instance
- No telemetry or tracking

## 🏗️ Project Structure

```
budgetly/
├── app/                      # App screens and navigation
│   ├── (auth)/              # Authentication screens
│   │   └── setup.tsx        # First-launch setup
│   ├── (drawer)/            # Main app screens (drawer navigation)
│   │   ├── dashboard.tsx
│   │   ├── expenses.tsx
│   │   ├── budgets.tsx
│   │   ├── accounts.tsx
│   │   ├── piggy-banks.tsx
│   │   ├── subscriptions.tsx
│   │   ├── reports.tsx
│   │   └── settings.tsx
│   └── _layout.tsx          # Root layout with providers
├── components/              # Reusable UI components
├── lib/                     # Core functionality
│   ├── api-client.ts       # Firefly III API client
│   ├── store.ts            # Zustand global state
│   └── query-client.ts     # React Query configuration
├── types/                   # TypeScript type definitions
│   └── firefly.ts          # Firefly III API types
├── constants/              # App constants and themes
├── hooks/                  # Custom React hooks
└── assets/                 # Images and static assets
```

## 🔌 API Integration

The app uses the Firefly III REST API v1. All endpoints are documented at:
https://api-docs.firefly-iii.org/

Key API features used:
- `/api/v1/about` - Version and validation
- `/api/v1/accounts` - Account management
- `/api/v1/transactions` - Transaction CRUD
- `/api/v1/budgets` - Budget management
- `/api/v1/piggy-banks` - Piggy bank data
- `/api/v1/recurring` - Recurring transactions

## 🧪 Testing

```bash
# Run tests
npm test

# Run linter
npm run lint
```

## 📦 Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Firefly III](https://www.firefly-iii.org/) - The amazing personal finance manager
- [React Native Paper](https://reactnativepaper.com/) - Material Design components
- [Expo](https://expo.dev/) - React Native development platform

## 📞 Support

For issues related to:
- **This app**: Open an issue in this repository
- **Firefly III**: Visit https://github.com/firefly-iii/firefly-iii

## 🗺️ Roadmap

- [ ] Advanced charts and analytics
- [ ] Budget categories and tags
- [ ] Export functionality
- [ ] Multiple currency support
- [ ] Biometric authentication
- [ ] Theme customization options
- [ ] Push notifications for recurring transactions
- [ ] Offline transaction creation with sync
- [ ] And a lot of new features requested by community
---

Made with ❤️ for Firefly III users
