import type { FireflyApiResponse, PiggyBank } from "@/types";
import type { AxiosInstance } from "axios";

export async function getPiggyBanks(
  api: AxiosInstance,
  page: number = 1
): Promise<FireflyApiResponse<PiggyBank[]>> {
  const response = await api.get<FireflyApiResponse<PiggyBank[]>>(
    "piggy-banks",
    {
      params: { page },
    }
  );
  return response.data;
}

export async function getPiggyBank(
  api: AxiosInstance,
  id: string
): Promise<FireflyApiResponse<PiggyBank>> {
  const response = await api.get<FireflyApiResponse<PiggyBank>>(
    `piggy-banks/${id}`
  );
  return response.data;
}
