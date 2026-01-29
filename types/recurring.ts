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
    paid_dates: {
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
    }[];
    pay_dates: string[];
    next_expected_match: string;
    next_expected_match_diff: string;
  };
}
