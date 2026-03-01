import type { FireflyApiResponse } from "./common";

export interface ArrayEntryWithCurrencyAndSum {
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_decimal_places: number;
  sum: string;
}

export interface CategoryProperties {
  created_at: string;
  updated_at: string;
  name: string;
  notes: string | null;
  object_has_currency_setting: boolean;
  primary_currency_id: string;
  primary_currency_name: string;
  primary_currency_code: string;
  primary_currency_symbol: string;
  primary_currency_decimal_places: number;
  spent: ArrayEntryWithCurrencyAndSum[] | null;
  pc_spent: ArrayEntryWithCurrencyAndSum[] | null;
  earned: ArrayEntryWithCurrencyAndSum[] | null;
  pc_earned: ArrayEntryWithCurrencyAndSum[] | null;
  transferred: ArrayEntryWithCurrencyAndSum[] | null;
  pc_transferred: ArrayEntryWithCurrencyAndSum[] | null;
}

export interface CategoryRead {
  type: string;
  id: string;
  attributes: CategoryProperties;
}

export type CategoryArray = FireflyApiResponse<CategoryRead[]>;

export interface CategoryUpdate {
  name: string;
  notes?: string | null;
}
