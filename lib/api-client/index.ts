import type {
  AccountStoreRequestBody,
  AccountUpdateRequestBody,
  CreateBudgetData,
  CreateTransactionData,
} from "@/types";
import * as accountsModule from "./accounts";
import * as budgetsModule from "./budgets";
import { FireflyApiClient } from "./core";
import * as currenciesModule from "./currencies";
import * as expensesModule from "./expenses";
import * as piggyBanksModule from "./piggy-banks";
import * as recurringModule from "./recurring";
import * as transactionsModule from "./transactions";

export * from "@/types";

class FireflyApiClientImpl extends FireflyApiClient {
  // Accounts
  async getAccounts(page: number = 1, type: string = "all") {
    return accountsModule.getAccounts(this.ensureInitialized(), page, type);
  }

  async getAllAccounts(type: string = "all") {
    return accountsModule.getAllAccounts(
      this.ensureInitialized(),
      accountsModule.getAccounts,
      type
    );
  }

  async getAccountOverview() {
    return accountsModule.getAccountOverview(this.ensureInitialized());
  }

  async getAccount(id: string) {
    return accountsModule.getAccount(this.ensureInitialized(), id);
  }

  async updateAccount(id: string, body: AccountUpdateRequestBody) {
    return accountsModule.updateAccount(this.ensureInitialized(), id, body);
  }

  async createAccount(body: AccountStoreRequestBody) {
    return accountsModule.createAccount(this.ensureInitialized(), body);
  }

  async deleteAccount(id: string) {
    return accountsModule.deleteAccount(this.ensureInitialized(), id);
  }

  async getAccountTransactions(
    accountId: string,
    page: number = 1,
    start?: string,
    end?: string,
    type?: string
  ) {
    return accountsModule.getAccountTransactions(
      this.ensureInitialized(),
      accountId,
      page,
      start,
      end,
      type
    );
  }

  async getAllAccountTransactions(
    accountId: string,
    start?: string,
    end?: string,
    type?: string
  ) {
    return accountsModule.getAllAccountTransactions(
      this.ensureInitialized(),
      accountsModule.getAccountTransactions,
      accountId,
      start,
      end,
      type
    );
  }

  // Transactions
  async getTransactions(
    page: number = 1,
    start?: string,
    end?: string,
    type?: string
  ) {
    return transactionsModule.getTransactions(
      this.ensureInitialized(),
      page,
      start,
      end,
      type
    );
  }

  async getTransaction(id: string) {
    return transactionsModule.getTransaction(this.ensureInitialized(), id);
  }

  async createTransaction(data: CreateTransactionData) {
    return transactionsModule.createTransaction(this.ensureInitialized(), data);
  }

  async updateTransaction(id: string, data: CreateTransactionData) {
    return transactionsModule.updateTransaction(
      this.ensureInitialized(),
      id,
      data
    );
  }

  async deleteTransaction(id: string) {
    return transactionsModule.deleteTransaction(this.ensureInitialized(), id);
  }

  // Budgets
  async getBudgets(page: number = 1, start?: string, end?: string) {
    return budgetsModule.getBudgets(this.ensureInitialized(), page, start, end);
  }

  async getAllBudgets(start?: string, end?: string) {
    return budgetsModule.getAllBudgets(
      this.ensureInitialized(),
      budgetsModule.getBudgets,
      start,
      end
    );
  }
  async getBudget(id: string) {
    return budgetsModule.getBudget(this.ensureInitialized(), id);
  }

  async createBudget(data: CreateBudgetData) {
    return budgetsModule.createBudget(this.ensureInitialized(), data);
  }

  async updateBudget(id: string, data: Partial<CreateBudgetData>) {
    return budgetsModule.updateBudget(this.ensureInitialized(), id, data);
  }

  async deleteBudget(id: string) {
    return budgetsModule.deleteBudget(this.ensureInitialized(), id);
  }

  async getBudgetLimits(start: string, end: string, page: number = 1) {
    return budgetsModule.getBudgetLimits(
      this.ensureInitialized(),
      start,
      end,
      page
    );
  }

  async getAllBudgetLimits(start: string, end: string) {
    return budgetsModule.getAllBudgetLimits(
      this.ensureInitialized(),
      budgetsModule.getBudgetLimits,
      start,
      end
    );
  }
  // Piggy Banks
  async getPiggyBanks(page: number = 1) {
    return piggyBanksModule.getPiggyBanks(this.ensureInitialized(), page);
  }

  async getPiggyBank(id: string) {
    return piggyBanksModule.getPiggyBank(this.ensureInitialized(), id);
  }

  // Recurring
  async getRecurringTransactions(page: number = 1) {
    return recurringModule.getRecurringTransactions(
      this.ensureInitialized(),
      page
    );
  }

  async getRecurringTransaction(id: string) {
    return recurringModule.getRecurringTransaction(
      this.ensureInitialized(),
      id
    );
  }

  async getSubscriptionsBills() {
    return recurringModule.getSubscriptionsBills(this.ensureInitialized());
  }

  // Expenses
  async getExpensesByExpenseAccount(start: string, end: string) {
    return expensesModule.getExpensesByExpenseAccount(
      this.ensureInitialized(),
      start,
      end
    );
  }

  // Currencies
  async getUserCurrencies() {
    return currenciesModule.getUserCurrencies(this.ensureInitialized());
  }
}

export const apiClient = new FireflyApiClientImpl();
