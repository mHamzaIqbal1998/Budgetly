import type { FireflyApiResponse } from "./common";

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
export interface BudgetLimitSpent {
  sum: string;
  currency_id: string;
  currency_name: string;
  currency_symbol: string;
  currency_code: string;
  currency_decimal_places: number;
}
export interface BudgetLimit {
  type: "budget_limits";
  id: string;
  attributes: {
    created_at: string;
    updated_at: string;
    start: string;
    end: string;
    budget_id: string;
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
    amount: string;
    pc_amount: string | null;
    period: string;
    spent: BudgetLimitSpent[];
    pc_spent: BudgetLimitSpent[];
    notes: string | null;
  };
  links: {
    self: string;
    [key: string]: string | { rel: string; uri: string };
  };
  relationships: {
    budget: {
      links: {
        self: string;
        related: string;
      };
      data: {
        type: "budgets";
        id: string;
      };
    };
  };
}

/** API response for listing budget limits: data, optional included budgets, and meta (pagination). */
export interface BudgetLimitsListResponse extends FireflyApiResponse<
  BudgetLimit[]
> {
  included?: Budget[];
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
