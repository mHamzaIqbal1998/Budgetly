# budegtly — Requirements / Developer Brief

> **App name:** budegtly

## 1. Project overview

**budegtly** is a React Native app (Expo managed) built with modern Material Design. It connects to a self-hosted Firefly III instance using Firefly III's REST API to surface budgets, expenses, accounts, piggy-banks and subscriptions. The mobile app's primary audience is personal finance users who already run Firefly III and want a beautiful, mobile-first companion app.

---

## 2. Goals & success criteria

* Let users connect their Firefly III instance (URL + Personal Access Token) on first launch.
* Provide a modern material-design dashboard with charts (expenses, budgets, trends, insights).
* Expose core flows: view/create/update/delete for expenses (transactions), budgets, subscriptions (recurring transactions), piggy banks, and accounts.
* Keep credentials secure and allow users to change/remove them via Settings.
* Smooth offline behavior with cached data and optimistic UI for mutations.

---

## 3. High-level tech stack

* Expo (managed workflow) — single binary for iOS & Android
* React Native with TypeScript (recommended)
* UI: React Native Paper or Material UI for React Native (Material Design components)
* Navigation: React Navigation (Drawer + Stack)
* Networking: `react-query` (TanStack Query) or `swr` for caching + mutations
* State: local UI state via Zustand or Redux Toolkit (minimal global state; rely on react-query for server state)
* Secure storage: `expo-secure-store` for storing the instance URL and PAT
* Charts: `victory-native` or `react-native-chart-kit` (pick one that fits designers)
* HTTP client: `fetch` or `axios` with an auth wrapper
* Linting/formatting: ESLint + Prettier
* Testing: Jest + React Native Testing Library

---

## 4. First-launch flow (auth & storage)

**Flow**

1. On first app launch show a lightweight setup screen asking for:

   * **Instance URL** (e.g. `https://my-firefly.instance`)
   * **Personal Access Token (PAT)**
2. Validate basic connectivity (optional but recommended): call a small API (GET /api/v1/version or a lightweight endpoint). If validation fails, show helpful error.
3. Store credentials securely with `expo-secure-store` (or equivalent native secure storage). Do NOT store the token in plain AsyncStorage.
4. After successful save redirect to the Dashboard.
5. On subsequent launches, bypass setup and go straight to Dashboard.
6. Provide Settings -> Account to update/remove credentials and re-run validation.

**Security notes**

* Never log the PAT.
* Use secure storage and platform-native protection.
* Allow the user to clear stored credentials.

---

## 5. Navigation & screens

**Top-level layout**: Drawer (sidebar) + main content area.

**Drawer (sidebar) items**

* Dashboard
* Expenses (list + create)
* Budgets
* Subscriptions (recurring transactions)
* Piggy Banks
* Accounts
* Reports / Insights
* Settings
* About / Help

**Screens & responsibilities**

* **Dashboard**

  * Charts: expenses (time series), budgets usage (donut / progress), top categories, cashflow trend
  * Quick actions: add expense, quick transfer, create budget
  * Insights / cards: overspent budgets, upcoming bills, largest expense categories

* **Expenses**

  * List with filters (date range, account, category, budget)
  * Search and pagination
  * Create / Edit / Delete expense (transaction)

* **Budgets**

  * List budgets and status (spent, limit, period)
  * Create / Edit / Delete budgets — map to Firefly budget endpoints (storeBudget etc.)

* **Subscriptions**

  * Show recurring transactions, allow toggle/skip/edit next occurrence

* **Piggy Banks**

  * View piggy banks, progress, deposit/withdraw actions

* **Accounts**

  * List linked accounts, balances, quick account actions

* **Reports / Insights**

  * Custom charts and breakdowns (category, merchant, account)

* **Settings**

  * Change Firefly instance URL / PAT
  * App theme (light/dark)
  * Data export / import
  * Clear cached data / sign out

---

## 6. API integration (how the app uses Firefly III)

**General**

* All API calls must include the `Authorization: Bearer <PAT>` header.
* Base URL = user-provided Instance URL + Firefly API path (make base path configurable).
* Use a thin API client wrapper that injects auth header, handles retries and maps API errors to user-friendly messages.

**Example: creating a budget (pseudocode)**

```ts
// endpoint referenced in the provided API docs:
// POST {baseUrl}/api/v1/budgets  (see Firefly III API docs for exact path and payload)

const createBudget = async (budgetData) => {
  const resp = await fetch(`${baseUrl}/api/v1/budgets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(budgetData),
  });
  if (!resp.ok) throw new Error('Failed to create budget');
  return resp.json();
};
```

> NOTE: Use the Firefly III API docs (developer will provide the doc URL) to map each screen's operations to the correct endpoints and payload formats.

---

## 7. Data models (local)

Keep local models minimal and map to Firefly fields.

* `Account` — id, name, balance, type
* `Transaction` — id, date, amount, description, category, accountId, budgetId
* `Budget` — id, title, limit, period, spent
* `PiggyBank` — id, name, target_amount, saved_amount
* `Subscription` — id, name, amount, frequency, next_date

---

## 8. UI & Design guidelines

* Follow Material Design language with clean spacing, elevation, and accessible colors.
* Dashboard should be scrollable with responsive cards.
* Use large readable numbers for balances and percentage indicators for budgets.
* Provide skeleton loaders or placeholders while network requests are pending.
* Accessibility: ensure sufficient contrast and support screen readers for key data.

Design assets: team should provide Figma/Sketch files; if unavailable, create simple components using React Native Paper.

---

## 9. Offline behavior & caching

* Use react-query cache for server state; set sensible stale/expiry times.
* Show cached data immediately and refresh in background.
* For mutations (create/edit/delete), use optimistic updates and rollback on failure.

---

## 10. Error handling & edge cases

* Handle invalid base URL or CORS/network errors gracefully.
* If PAT is unauthorized (401), prompt user to update credentials.
* Rate limiting: surface friendly message and back off.
* Empty states: show helpful copy and actions (e.g., "Create your first budget").

---

## 11. Testing & QA

* Unit tests for API wrapper and critical components
* Integration tests for key flows (first-launch setup, create transaction)
* Manual QA on both iOS and Android physical devices

---

## 12. Milestones & deliverables (suggested)

1. Project setup & core infra (Expo TS app, navigation, auth storage) — deliver: scaffolding repo
2. Firefly API client + validate-credentials flow — deliver: setup screen + settings
3. Dashboard (charts + quick actions) — deliver: dashboard screen
4. Expenses list + create/edit/delete — deliver: expenses CRUD
5. Budgets screen + create/edit — deliver: budgets CRUD
6. Piggy banks / Subscriptions / Accounts — deliver: respective screens
7. Polishing: themes, accessibility, tests
8. Release build & store-ready checks

---

## 13. Developer notes / implementation tips

* Use `expo-secure-store` for token storage (fall back to AsyncStorage only for non-sensitive flags).
* Centralize API base URL + token in one client module.
* Keep UI components small and reusable (Card, StatNumber, PercentBar, ChartCard).
* Prefer TypeScript for safer data mapping with API responses.
* Consider background sync for fetching latest data periodically.

---

## 14. Acceptance Criteria

* On first launch user is prompted for Instance URL + PAT and cannot proceed without valid data.
* Dashboard displays meaningful charts and updates after adding transactions.
* CRUD operations for expenses and budgets succeed and change is reflected in UI.
* Credentials are stored securely and can be changed/removed from Settings.

---

## 15. References

* Firefly III API docs https://api-docs.firefly-iii.org/#/budgets/storeBudget (use to map exact endpoints and payloads). Please provide the canonical API docs URL during development. 

---
