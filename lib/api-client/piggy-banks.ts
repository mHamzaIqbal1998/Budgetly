import type {
  CreatePiggyBankData,
  FireflyApiResponse,
  PiggyBank,
  UpdatePiggyBankData,
} from "@/types";
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

export async function updatePiggyBank(
  api: AxiosInstance,
  id: string,
  data: UpdatePiggyBankData
): Promise<FireflyApiResponse<PiggyBank>> {
  const response = await api.put<FireflyApiResponse<PiggyBank>>(
    `piggy-banks/${id}`,
    data
  );
  return response.data;
}

export async function createPiggyBank(
  api: AxiosInstance,
  data: CreatePiggyBankData
): Promise<FireflyApiResponse<PiggyBank>> {
  const response = await api.post<FireflyApiResponse<PiggyBank>>(
    "piggy-banks",
    data
  );
  return response.data;
}

export async function deletePiggyBank(
  api: AxiosInstance,
  id: string
): Promise<void> {
  await api.delete(`piggy-banks/${id}`);
}
