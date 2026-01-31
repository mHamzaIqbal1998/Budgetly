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
