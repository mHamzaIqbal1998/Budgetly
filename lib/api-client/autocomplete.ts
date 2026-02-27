import type {
  AutocompleteCategory,
  AutocompleteSubscription,
  AutocompleteTransaction,
} from "@/types";
import type { AxiosInstance } from "axios";

export async function getAutocompleteCategories(
  api: AxiosInstance
): Promise<AutocompleteCategory[]> {
  const response = await api.get<AutocompleteCategory[]>(
    "autocomplete/categories"
  );
  return response.data;
}

export async function getAutocompleteSubscriptions(
  api: AxiosInstance
): Promise<AutocompleteSubscription[]> {
  const response = await api.get<AutocompleteSubscription[]>(
    "autocomplete/subscriptions"
  );
  return response.data;
}

export async function getAutocompleteTransactions(
  api: AxiosInstance,
  query: string,
  limit: number = 10
): Promise<AutocompleteTransaction[]> {
  const response = await api.get<AutocompleteTransaction[]>(
    "autocomplete/transactions",
    {
      params: { query, limit },
    }
  );
  return response.data;
}
