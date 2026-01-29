import type { Account, AccountOverview, FireflyApiResponse } from "@/types";
import type { AxiosInstance } from "axios";

export async function getAccounts(
  api: AxiosInstance,
  page: number = 1,
  type: string = "all"
): Promise<FireflyApiResponse<Account[]>> {
  const response = await api.get<FireflyApiResponse<Account[]>>("accounts", {
    params: { page, type },
  });
  return response.data;
}

export async function getAllAccounts(
  api: AxiosInstance,
  getAccountsFn: (
    api: AxiosInstance,
    page: number,
    type: string
  ) => Promise<FireflyApiResponse<Account[]>>,
  type: string = "all"
): Promise<FireflyApiResponse<Account[]>> {
  const firstPageResponse = await getAccountsFn(api, 1, type);
  const allAccounts = [...(firstPageResponse.data || [])];

  const totalPages = firstPageResponse.meta?.pagination?.total_pages || 1;

  if (totalPages > 1) {
    const pagePromises = [];
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(getAccountsFn(api, page, type));
    }

    const remainingPages = await Promise.all(pagePromises);
    remainingPages.forEach((pageResponse) => {
      if (pageResponse.data) {
        allAccounts.push(...pageResponse.data);
      }
    });
  }

  return {
    ...firstPageResponse,
    data: allAccounts,
  };
}

export async function getAccountOverview(
  api: AxiosInstance
): Promise<FireflyApiResponse<AccountOverview[]>> {
  const response = await api.get<FireflyApiResponse<AccountOverview[]>>(
    "chart/account/overview",
    {
      params: {
        start: "2026-01-01",
        end: "2026-01-31",
        preselected: "assets",
      },
    }
  );
  return response.data;
}

export async function getAccount(
  api: AxiosInstance,
  id: string
): Promise<FireflyApiResponse<Account>> {
  const response = await api.get<FireflyApiResponse<Account>>(`accounts/${id}`);
  return response.data;
}
