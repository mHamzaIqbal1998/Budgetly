/** Account role. Mandatory when type is asset. */
export type AccountRole =
  | "defaultAsset"
  | "sharedAsset"
  | "savingAsset"
  | "ccAsset"
  | "cashWalletAsset";

/** Credit card type. Mandatory when account_role is ccAsset. */
export type CreditCardType = "monthlyFull";

/** Liability type. Mandatory when type is liability. */
export type LiabilityType = "loan" | "debt" | "mortgage";

/**
 * Request body for account update API (PATCH/PUT accounts/{id}).
 * Aligned with Firefly III account update schema.
 */
export interface AccountUpdateRequestBody {
  /** Account name (required). */
  name: string;
  iban?: string | null;
  bic?: string | null;
  account_number?: string | null;
  /** Opening balance amount (e.g. "-1012.12"). */
  opening_balance?: string;
  /** ISO 8601 date-time (e.g. "2026-01-01T00:00:00+00:00"). */
  opening_balance_date?: string | null;
  virtual_balance?: string;
  /** Use either currency_id or currency_code. Defaults to financial administration currency. */
  currency_id?: string;
  currency_code?: string;
  /** Defaults to true if omitted. */
  active?: boolean;
  /** Order of the account. */
  order?: number;
  /** Defaults to true if omitted. */
  include_net_worth?: boolean;
  /** Mandatory when type is asset. */
  account_role?: AccountRole | null;
  /** Mandatory when account_role is ccAsset. */
  credit_card_type?: CreditCardType | null;
  /** Mandatory when account_role is ccAsset. ISO 8601 date-time (e.g. 2026-01-01T00:00:00+00:00). */
  monthly_payment_date?: string | null;
  /** Mandatory when type is liability. */
  liability_type?: LiabilityType | null;
  /** Mandatory when type is liability. Interest percentage. */
  interest?: string | null;
  interest_period?: string;
  notes?: string | null;
  /** Omit to keep existing; send null to remove location. */
  latitude?: number | null;
  longitude?: number | null;
  zoom_level?: number | null;
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
    debt_amount?: string;
    iban?: string;
    account_number?: string;
    bic?: string;
    active: boolean;
    include_net_worth: boolean;
    opening_balance?: string;
    opening_balance_date?: string;
    /** CC monthly payment date (YYYY-MM-DD or ISO). */
    monthly_payment_date?: string;
    cc_monthly_payment_date?: string;
    virtual_balance?: string;
    notes?: string;
    /** Mandatory when type is liability. */
    liability_type?: string;
    /** 'credit' = somebody owes you; 'debit' = you owe this debt. Only for liabilities. */
    liability_direction?: "credit" | "debit";
    /** Interest percentage. Only for liabilities. */
    interest?: string;
    /** Interest period (e.g. "monthly", "yearly"). Only for liabilities. */
    interest_period?: string;
    /** Credit card type (e.g. "monthlyFull"). Only for ccAsset. */
    credit_card_type?: string;
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
