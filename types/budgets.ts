export interface BudgetSpent {
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_decimal_places: number;
  amount: string;
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
