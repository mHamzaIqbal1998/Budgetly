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
