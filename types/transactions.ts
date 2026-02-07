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

export interface Transaction {
  id: string;
  type: string;
  attributes: {
    transactions: TransactionSplit[];
    created_at: string;
    updated_at: string;
  };
}

export interface CreateTransactionData {
  error_if_duplicate_hash?: boolean;
  apply_rules?: boolean;
  fire_webhooks?: boolean;
  group_title?: string;
  transactions: {
    type: "withdrawal" | "deposit" | "transfer";
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
  }[];
}

export interface AccountTransaction {
  user: string;
  transaction_journal_id: string;
  type: string;
  date: string;
  order: number;
  object_has_currency_setting: boolean;
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  currency_decimal_places: number;
  foreign_currency_id?: string;
  foreign_currency_code?: string;
  foreign_currency_symbol?: string;
  foreign_currency_decimal_places?: number;
  primary_currency_id: string;
  primary_currency_code: string;
  primary_currency_symbol: string;
  primary_currency_decimal_places: number;
  amount: string;
  pc_amount: string;
  foreign_amount?: string;
  pc_foreign_amount?: string;
  source_balance_after?: string;
  pc_source_balance_after?: string;
  destination_balance_after?: string;
  pc_destination_balance_after?: string;
  description: string;
  source_id: string;
  source_name: string;
  source_iban?: string;
  source_type: string;
  destination_id: string;
  destination_name: string;
  destination_iban?: string;
  destination_type: string;
  budget_id?: string;
  budget_name?: string;
  category_id?: string;
  category_name?: string;
  bill_id?: string;
  bill_name?: string;
  subscription_id?: string;
  subscription_name?: string;
  reconciled: boolean;
  notes?: string;
  tags: string[] | null;
  internal_reference?: string;
  external_id?: string;
  external_url?: string;
  original_source?: string;
  recurrence_id?: string;
  recurrence_total?: number;
  recurrence_count?: number;
  import_hash_v2?: string;
  sepa_cc?: string;
  sepa_ct_op?: string;
  sepa_ct_id?: string;
  sepa_db?: string;
  sepa_country?: string;
  sepa_ep?: string;
  sepa_ci?: string;
  sepa_batch_id?: string;
  interest_date?: string;
  book_date?: string;
  process_date?: string;
  due_date?: string;
  payment_date?: string;
  invoice_date?: string;
  latitude?: number;
  longitude?: number;
  zoom_level?: number;
  has_attachments: boolean;
}

/** Body for PUT /v1/transactions/{id} */
export interface TransactionUpdateData {
  apply_rules?: boolean;
  fire_webhooks?: boolean;
  group_title?: string | null;
  transactions: TransactionSplitUpdate[];
}

export interface TransactionSplitUpdate {
  transaction_journal_id?: string;
  type?:
    | "withdrawal"
    | "deposit"
    | "transfer"
    | "reconciliation"
    | "opening balance";
  date?: string;
  amount?: string;
  description?: string;
  order?: number | null;
  currency_id?: string | null;
  currency_code?: string | null;
  foreign_amount?: string | null;
  foreign_currency_id?: string | null;
  foreign_currency_code?: string | null;
  source_id?: string | null;
  source_name?: string | null;
  destination_id?: string | null;
  destination_name?: string | null;
  budget_id?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  bill_id?: string | null;
  bill_name?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  reconciled?: boolean;
  internal_reference?: string | null;
  external_id?: string | null;
  external_url?: string | null;
}

/** Autocomplete response item for /v1/autocomplete/categories */
export interface AutocompleteCategory {
  id: string;
  name: string;
}

/** Autocomplete response item for /v1/autocomplete/subscriptions */
export interface AutocompleteSubscription {
  id: string;
  name: string;
  active?: boolean;
}

/** Transaction group resource returned by GET /v1/accounts/{id}/transactions */
export interface AccountTransactionGroup {
  type: string;
  id: string;
  attributes: {
    created_at: string;
    updated_at: string;
    user: string;
    group_title: string;
    transactions: AccountTransaction[];
  };
  links?: Record<string, string | { rel: string; uri: string }>;
}
