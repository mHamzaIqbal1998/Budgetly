import type { UserCurrenciesList } from "@/types";
import type { AxiosInstance } from "axios";

export async function getUserCurrencies(
  api: AxiosInstance
): Promise<UserCurrenciesList[]> {
  const response = await api.get<UserCurrenciesList[]>(
    "autocomplete/currencies"
  );
  return response.data;
}
