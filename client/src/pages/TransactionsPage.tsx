import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, type Transaction, type TransactionPayload } from '../api/transactions';
import { accountsApi } from '../api/accounts';
import { categoriesApi } from '../api/categories';
import TransactionTable from '../components/TransactionTable';
import TransactionForm from '../components/TransactionForm';

export default function TransactionsPage() {
  const qc = useQueryClient();

  const [page, setPage]         = useState(1);
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [modal, setModal]       = useState<Transaction | 'create' | null>(null);

  const { data: txData, isLoading } = useQuery({
    queryKey: ['transactions', page, from, to],
    queryFn: () => transactionsApi.list({ page, from: from || undefined, to: to || undefined }),
  });

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'],   queryFn: accountsApi.list });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['accounts'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TransactionPayload }) => transactionsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['accounts'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['accounts'] }); },
  });

  async function handleSubmit(data: TransactionPayload) {
    if (modal && modal !== 'create') {
      await updateMutation.mutateAsync({ id: modal.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  }

  function handleDelete(id: number) {
    if (confirm('Delete this transaction?')) deleteMutation.mutate(id);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => setModal('create')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          + Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px] sm:flex-none">
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1 min-w-[140px] sm:flex-none">
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {(from || to) && (
          <div className="flex items-end">
            <button
              onClick={() => { setFrom(''); setTo(''); setPage(1); }}
              className="text-xs text-gray-500 hover:text-gray-700 mb-0.5"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <TransactionTable
          transactions={txData?.data ?? []}
          total={txData?.total ?? 0}
          page={page}
          limit={txData?.limit ?? 20}
          onPage={setPage}
          onEdit={(t) => setModal(t)}
          onDelete={handleDelete}
        />
      )}

      {modal && (
        <TransactionForm
          initial={modal === 'create' ? null : modal}
          accounts={accounts}
          categories={categories}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
