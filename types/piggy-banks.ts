export interface PiggyBank {
  id: string;
  type: string;
  attributes: {
    name: string;
    account_id: string;
    account_name: string;
    currency_id: string;
    currency_code: string;
    currency_symbol: string;
    target_amount: string;
    current_amount: string;
    percentage: number;
    left_to_save: string;
    save_per_month: string;
    start_date?: string;
    target_date?: string;
    order: number;
    active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
  };
}
