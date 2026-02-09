import type {
  Account,
  AccountOverview,
  AccountStoreRequestBody,
  AccountTransactionGroup,
  AccountUpdateRequestBody,
  FireflyApiResponse,
} from "@/types";
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

export async function updateAccount(
  api: AxiosInstance,
  id: string,
  body: AccountUpdateRequestBody
): Promise<FireflyApiResponse<Account>> {
  const response = await api.put<FireflyApiResponse<Account>>(
    `accounts/${id}`,
    body
  );
  return response.data;
}

export async function createAccount(
  api: AxiosInstance,
  body: AccountStoreRequestBody
): Promise<FireflyApiResponse<Account>> {
  const response = await api.post<FireflyApiResponse<Account>>(
    "accounts",
    body
  );
  return response.data;
}

export async function deleteAccount(
  api: AxiosInstance,
  id: string
): Promise<void> {
  await api.delete(`accounts/${id}`);
}

export async function getAccountTransactions(
  api: AxiosInstance,
  accountId: string,
  page: number = 1,
  start?: string,
  end?: string,
  type?: string,
  limit?: number
): Promise<FireflyApiResponse<AccountTransactionGroup[]>> {
  const response = await api.get<FireflyApiResponse<AccountTransactionGroup[]>>(
    `accounts/${accountId}/transactions`,
    {
      params: { page, start, end, type, limit },
    }
  );
  return response.data;
}

export async function getAllAccountTransactions(
  api: AxiosInstance,
  getAccountTransactionsFn: (
    api: AxiosInstance,
    accountId: string,
    page: number,
    start?: string,
    end?: string,
    type?: string
  ) => Promise<FireflyApiResponse<AccountTransactionGroup[]>>,
  accountId: string,
  start?: string,
  end?: string,
  type?: string
): Promise<FireflyApiResponse<AccountTransactionGroup[]>> {
  const firstPageResponse = await getAccountTransactionsFn(
    api,
    accountId,
    1,
    start,
    end,
    type
  );
  const allGroups = [...(firstPageResponse.data || [])];

  const totalPages = firstPageResponse.meta?.pagination?.total_pages || 1;

  if (totalPages > 1) {
    const pagePromises: Promise<
      FireflyApiResponse<AccountTransactionGroup[]>
    >[] = [];
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(
        getAccountTransactionsFn(api, accountId, page, start, end, type)
      );
    }

    const remainingPages = await Promise.all(pagePromises);
    remainingPages.forEach((pageResponse) => {
      if (pageResponse.data) {
        allGroups.push(...pageResponse.data);
      }
    });
  }

  return {
    ...firstPageResponse,
    data: allGroups,
  };
}
