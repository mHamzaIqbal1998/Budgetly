// Custom hooks for API operations with React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { CreateTransactionData, CreateBudgetData } from '@/types/firefly';

// Accounts
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => apiClient.getAccount(id),
    enabled: !!id,
  });
}

// Transactions
export function useTransactions(page: number = 1, start?: string, end?: string) {
  return useQuery({
    queryKey: ['transactions', page, start, end],
    queryFn: () => apiClient.getTransactions(page, start, end),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => apiClient.getTransaction(id),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateTransactionData) => apiClient.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTransactionData }) => 
      apiClient.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Budgets
export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiClient.getBudgets(),
  });
}

export function useBudget(id: string) {
  return useQuery({
    queryKey: ['budgets', id],
    queryFn: () => apiClient.getBudget(id),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateBudgetData) => apiClient.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBudgetData> }) => 
      apiClient.updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

// Piggy Banks
export function usePiggyBanks() {
  return useQuery({
    queryKey: ['piggyBanks'],
    queryFn: () => apiClient.getPiggyBanks(),
  });
}

export function usePiggyBank(id: string) {
  return useQuery({
    queryKey: ['piggyBanks', id],
    queryFn: () => apiClient.getPiggyBank(id),
    enabled: !!id,
  });
}

// Recurring Transactions (Subscriptions)
export function useRecurringTransactions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => apiClient.getRecurringTransactions(),
  });
}

export function useRecurringTransaction(id: string) {
  return useQuery({
    queryKey: ['subscriptions', id],
    queryFn: () => apiClient.getRecurringTransaction(id),
    enabled: !!id,
  });
}

