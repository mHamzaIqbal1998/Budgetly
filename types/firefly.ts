// Firefly III Data Models and Types

export interface FireflyCredentials {
  instanceUrl: string;
  personalAccessToken: string;
}

export interface Account {
  id: string;
  type: string;
  attributes: {
    name: string;
    type: string;
    account_role?: string;
    currency_id: string;
    currency_code: string;
    currency_name: string;
    currency_symbol: string;
    currency_decimal_places: number;
    current_balance: string;
    current_balance_date?: string;
    iban?: string;
    account_number?: string;
    bic?: string;
    active: boolean;
    include_net_worth: boolean;
    opening_balance?: string;
    opening_balance_date?: string;
    virtual_balance?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
    zoom_level?: number;
    order?: number;
    created_at: string;
    updated_at: string;
  };
}

export interface AccountOverview {
  label: string;
  currency_id: string;
  currency_name: string;
  currency_code: string;
  currency_symbol: string;
  currency_decimal_places: number;
  primary_currency_id: string;
  primary_currency_name: string;
  primary_currency_code: string;
  primary_currency_symbol: string;
  primary_currency_decimal_places: number;
  date: string;
  start_date: string;
  end_date: string;
  type: string;
  period: string;
  yAxisID: number;
  entries: Record<string, any>;
  pc_entries: Record<string, any>;
}
export interface Transaction {
  id: string;
  type: string;
  attributes: {
    transactions: TransactionSplit[];
    created_at: string;
    updated_at: string;
  };
}

export interface TransactionSplit {
  user: number;
  transaction_journal_id: string;
  type: string;
  date: string;
  order: number;
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_decimal_places: number;
  amount: string;
  description: string;
  source_id: string;
  source_name: string;
  destination_id: string;
  destination_name: string;
  budget_id?: string;
  budget_name?: string;
  category_id?: string;
  category_name?: string;
  reconciled: boolean;
  notes?: string;
  tags?: string[];
}

export interface Budget {
  id: string;
  type: string;
  attributes: {
    name: string;
    active: boolean;
    auto_budget_type?: string;
    auto_budget_currency_id?: string;
    auto_budget_currency_code?: string;
    auto_budget_amount?: string;
    auto_budget_period?: string;
    spent?: BudgetSpent[];
    created_at: string;
    updated_at: string;
  };
}

export interface BudgetSpent {
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_decimal_places: number;
  amount: string;
}

export interface BudgetLimit {
  id: string;
  type: string;
  attributes: {
    budget_id: string;
    start: string;
    end: string;
    amount: string;
    currency_id: string;
    currency_code: string;
    spent?: string;
  };
}

export interface PiggyBank {
  id: string;
  type: string;
  attributes: {
    name: string;
    account_id: string;
    account_name: string;
    currency_id: string;
    currency_code: string;
    currency_symbol: string;
    target_amount: string;
    current_amount: string;
    percentage: number;
    left_to_save: string;
    save_per_month: string;
    start_date?: string;
    target_date?: string;
    order: number;
    active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
  };
}

export interface RecurringTransaction {
  id: string;
  type: string;
  attributes: {
    title: string;
    description?: string;
    first_date: string;
    latest_date?: string;
    repeat_until?: string;
    nr_of_repetitions?: number;
    apply_rules: boolean;
    active: boolean;
    type: string;
    transactions: RecurringTransactionInfo[];
    repetitions: RecurringRepetition[];
    created_at: string;
    updated_at: string;
  };
}

export interface RecurringTransactionInfo {
  description: string;
  amount: string;
  foreign_amount?: string;
  currency_id: string;
  currency_code: string;
  foreign_currency_id?: string;
  foreign_currency_code?: string;
  source_id: string;
  source_name: string;
  destination_id: string;
  destination_name: string;
  budget_id?: string;
  budget_name?: string;
  category_id?: string;
  category_name?: string;
  tags?: string[];
}

export interface RecurringRepetition {
  id: string;
  type: string;
  moment: string;
  skip: number;
  weekend: number;
  created_at: string;
  updated_at: string;
  occurrences: string[];
}

export interface FireflyApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
  };
}

export interface AllBillsResponse {
  type: string;
  id: string;
  attributes: {
    created_at: string;
    updated_at: string;
    name: string;
    object_has_currency_setting: boolean;
    currency_id: string;
    currency_name: string;
    currency_code: string;
    currency_symbol: string;
    currency_decimal_places: number;
    primary_currency_id: string;
    primary_currency_name: string;
    primary_currency_code: string;
    primary_currency_symbol: string;
    primary_currency_decimal_places: number;
    amount_min: string;
    pc_amount_min: string;
    amount_max: string;
    pc_amount_max: string;
    amount_avg: string;
    pc_amount_avg: string;
    date: string;
    end_date: string;
    extension_date: string;
    repeat_freq: string;
    skip: number;
    active: boolean;
    order: number;
    notes: string;
    object_group_id: string;
    object_group_order: number;
    object_group_title: string;
    paid_dates: Array<{
      transaction_group_id: string;
      transaction_journal_id: string;
      date: string;
      subscription_id: string;
      currency_id: string;
      currency_name: string;
      currency_code: string;
      currency_symbol: string;
      currency_decimal_places: number;
      primary_currency_id: string;
      primary_currency_name: string;
      primary_currency_code: string;
      primary_currency_symbol: string;
      primary_currency_decimal_places: number;
      amount: string;
      pc_amount: string;
      foreign_amount: string;
      pc_foreign_amount: string;
    }>;
    pay_dates: string[];
    next_expected_match: string;
    next_expected_match_diff: string;
  };
}

export interface FireflyVersion {
  data: {version: string;
  api_version: string;
  os: string;
  php_version: string;
  };
}

export interface CreateTransactionData {
  error_if_duplicate_hash?: boolean;
  apply_rules?: boolean;
  fire_webhooks?: boolean;
  group_title?: string;
  transactions: Array<{
    type: 'withdrawal' | 'deposit' | 'transfer';
    date: string;
    amount: string;
    description: string;
    source_id?: string;
    source_name?: string;
    destination_id?: string;
    destination_name?: string;
    currency_id?: string;
    currency_code?: string;
    budget_id?: string;
    budget_name?: string;
    category_id?: string;
    category_name?: string;
    tags?: string[];
    notes?: string;
  }>;
}

export interface CreateBudgetData {
  name: string;
  active?: boolean;
  auto_budget_type?: 'reset' | 'rollover' | 'none';
  auto_budget_currency_id?: string;
  auto_budget_currency_code?: string;
  auto_budget_amount?: string;
  auto_budget_period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half_year' | 'yearly';
}

