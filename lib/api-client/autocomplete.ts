import type { AutocompleteCategory, AutocompleteSubscription } from "@/types";
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
