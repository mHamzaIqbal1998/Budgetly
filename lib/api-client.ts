// Firefly III API Client
import {
  Account,
  AccountOverview,
  AllBillsResponse,
  Budget,
  BudgetLimit,
  CreateBudgetData,
  CreateTransactionData,
  FireflyApiResponse,
  FireflyCredentials,
  FireflyVersion,
  PiggyBank,
  RecurringTransaction,
  Transaction,
} from "@/types/firefly";
import axios, { AxiosError, AxiosInstance } from "axios";

class FireflyApiClient {
  private axiosInstance: AxiosInstance | null = null;
  private credentials: FireflyCredentials | null = null;

  initialize(credentials: FireflyCredentials) {
    this.credentials = credentials;
    const baseURL = credentials.instanceUrl.endsWith("/")
      ? credentials.instanceUrl
      : `${credentials.instanceUrl}/`;

    this.axiosInstance = axios.create({
      baseURL: `${baseURL}api/v1/`,
      headers: {
        Authorization: `Bearer ${credentials.personalAccessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          return new Error(
            "Invalid credentials. Please check your Personal Access Token."
          );
        case 403:
          return new Error(
            "Access forbidden. You do not have permission to access this resource."
          );
        case 404:
          return new Error("Resource not found.");
        case 422:
          return new Error(
            data?.message || "Validation error. Please check your input."
          );
        case 429:
          return new Error(
            "Too many requests. Please wait a moment and try again."
          );
        case 500:
          return new Error("Server error. Please try again later.");
        default:
          return new Error(
            data?.message || `Request failed with status ${status}`
          );
      }
    } else if (error.request) {
      // Request made but no response received
      return new Error(
        "Cannot connect to Firefly III. Please check your instance URL and network connection."
      );
    } else {
      // Something else happened
      return new Error(error.message || "An unexpected error occurred.");
    }
  }

  private ensureInitialized() {
    if (!this.axiosInstance) {
      throw new Error(
        "API client not initialized. Please set credentials first."
      );
    }
    return this.axiosInstance;
  }

  // Validation & Version
  async validateConnection(): Promise<FireflyVersion> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyVersion>("about");
    return response.data;
  }

  // Accounts
  async getAccounts(
    page: number = 1,
    type: string = "all"
  ): Promise<FireflyApiResponse<Account[]>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<Account[]>>("accounts", {
      params: { page, type },
    });
    return response.data;
  }

  async getAllAccounts(
    type: string = "all"
  ): Promise<FireflyApiResponse<Account[]>> {
    // Fetch first page to get pagination info
    const firstPageResponse = await this.getAccounts(1, type);
    const allAccounts = [...(firstPageResponse.data || [])];

    const totalPages = firstPageResponse.meta?.pagination?.total_pages || 1;

    // Fetch remaining pages if any
    if (totalPages > 1) {
      const pagePromises = [];
      for (let page = 2; page <= totalPages; page++) {
        pagePromises.push(this.getAccounts(page, type));
      }

      const remainingPages = await Promise.all(pagePromises);
      remainingPages.forEach((pageResponse) => {
        if (pageResponse.data) {
          allAccounts.push(...pageResponse.data);
        }
      });
    }

    // Return all accounts with the metadata from the first page
    return {
      ...firstPageResponse,
      data: allAccounts,
    };
  }

  async getAccountOverview(): Promise<FireflyApiResponse<AccountOverview[]>> {
    const api = this.ensureInitialized();
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

  async getAccount(id: string): Promise<FireflyApiResponse<Account>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<Account>>(
      `accounts/${id}`
    );
    return response.data;
  }

  // Transactions
  async getTransactions(
    page: number = 1,
    start?: string,
    end?: string,
    type?: string
  ): Promise<FireflyApiResponse<Transaction[]>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<Transaction[]>>(
      "transactions",
      {
        params: { page, start, end, type },
      }
    );
    return response.data;
  }

  async getTransaction(id: string): Promise<FireflyApiResponse<Transaction>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<Transaction>>(
      `transactions/${id}`
    );
    return response.data;
  }

  async createTransaction(
    data: CreateTransactionData
  ): Promise<FireflyApiResponse<Transaction>> {
    const api = this.ensureInitialized();
    const response = await api.post<FireflyApiResponse<Transaction>>(
      "transactions",
      data
    );
    return response.data;
  }

  async updateTransaction(
    id: string,
    data: CreateTransactionData
  ): Promise<FireflyApiResponse<Transaction>> {
    const api = this.ensureInitialized();
    const response = await api.put<FireflyApiResponse<Transaction>>(
      `transactions/${id}`,
      data
    );
    return response.data;
  }

  async deleteTransaction(id: string): Promise<void> {
    const api = this.ensureInitialized();
    await api.delete(`transactions/${id}`);
  }

  // Budgets
  async getBudgets(page: number = 1): Promise<FireflyApiResponse<Budget[]>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<Budget[]>>("budgets", {
      params: { page },
    });
    return response.data;
  }

  async getBudget(id: string): Promise<FireflyApiResponse<Budget>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<Budget>>(`budgets/${id}`);
    return response.data;
  }

  async createBudget(
    data: CreateBudgetData
  ): Promise<FireflyApiResponse<Budget>> {
    const api = this.ensureInitialized();
    const response = await api.post<FireflyApiResponse<Budget>>(
      "budgets",
      data
    );
    return response.data;
  }

  async updateBudget(
    id: string,
    data: Partial<CreateBudgetData>
  ): Promise<FireflyApiResponse<Budget>> {
    const api = this.ensureInitialized();
    const response = await api.put<FireflyApiResponse<Budget>>(
      `budgets/${id}`,
      data
    );
    return response.data;
  }

  async deleteBudget(id: string): Promise<void> {
    const api = this.ensureInitialized();
    await api.delete(`budgets/${id}`);
  }

  async getBudgetLimits(
    id: string
  ): Promise<FireflyApiResponse<BudgetLimit[]>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<BudgetLimit[]>>(
      `budgets/${id}/limits`
    );
    return response.data;
  }

  // Piggy Banks
  async getPiggyBanks(
    page: number = 1
  ): Promise<FireflyApiResponse<PiggyBank[]>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<PiggyBank[]>>(
      "piggy-banks",
      {
        params: { page },
      }
    );
    return response.data;
  }

  async getPiggyBank(id: string): Promise<FireflyApiResponse<PiggyBank>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<PiggyBank>>(
      `piggy-banks/${id}`
    );
    return response.data;
  }

  // Recurring Transactions (Subscriptions)
  async getRecurringTransactions(
    page: number = 1
  ): Promise<FireflyApiResponse<RecurringTransaction[]>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<RecurringTransaction[]>>(
      "recurring",
      {
        params: { page },
      }
    );
    return response.data;
  }

  async getRecurringTransaction(
    id: string
  ): Promise<FireflyApiResponse<RecurringTransaction>> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyApiResponse<RecurringTransaction>>(
      `recurring/${id}`
    );
    return response.data;
  }

  async getSubscriptionsBills(): Promise<
    FireflyApiResponse<AllBillsResponse[]>
  > {
    const api = this.ensureInitialized();
    const response =
      await api.get<FireflyApiResponse<AllBillsResponse[]>>("bills");
    return response.data;
  }
}

export const apiClient = new FireflyApiClient();
