export interface PiggyBankAccount {
  account_id: string;
  name: string;
  current_amount: string;
  pc_current_amount: string;
}

export interface PiggyBankAttributes {
  created_at: string;
  updated_at: string;
  name: string;
  percentage: number | null;
  start_date: string;
  target_date: string | null;
  order: number;
  active: boolean;
  notes: string | null;
  object_group_id: string | null;
  object_group_order: number | null;
  object_group_title: string | null;
  accounts: PiggyBankAccount[];
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
  target_amount: string | null;
  pc_target_amount: string | null;
  current_amount: string;
  pc_current_amount: string;
  left_to_save: string | null;
  pc_left_to_save: string | null;
  save_per_month: string | null;
  pc_save_per_month: string | null;
}

export interface PiggyBank {
  id: string;
  type: string;
  attributes: PiggyBankAttributes;
}
