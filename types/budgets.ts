export interface BudgetSpent {
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_decimal_places: number;
  amount: string;
}

export interface Budget {
  type: string;
  id: string;
  attributes: {
    created_at: string;
    updated_at: string;
    active: boolean;
    name: string;
    order: number;
    notes?: string;
    auto_budget_type?: string;
    auto_budget_period?: string;
    object_group_id?: string;
    object_group_order?: number;
    object_group_title?: string;
    object_has_currency_setting?: boolean;
    currency_id?: string;
    currency_name?: string;
    currency_code?: string;
    currency_symbol?: string;
    currency_decimal_places?: number;
    primary_currency_id?: string;
    primary_currency_name?: string;
    primary_currency_code?: string;
    primary_currency_symbol?: string;
    primary_currency_decimal_places?: number;
    auto_budget_amount?: string;
    pc_auto_budget_amount?: string;
    spent?: {
      currency_id: string;
      currency_code: string;
      currency_symbol: string;
      currency_decimal_places: number;
      sum: string;
    }[];
    pc_spent?: {
      currency_id: string;
      currency_code: string;
      currency_symbol: string;
      currency_decimal_places: number;
      sum: string;
    }[];
  };
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

export interface CreateBudgetData {
  name: string;
  active?: boolean;
  auto_budget_type?: "reset" | "rollover" | "none";
  auto_budget_currency_id?: string;
  auto_budget_currency_code?: string;
  auto_budget_amount?: string;
  auto_budget_period?:
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "half_year"
    | "yearly";
}
