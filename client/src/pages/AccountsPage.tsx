import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, type Account, type AccountPayload } from '../api/accounts';
import AccountCard from '../components/AccountCard';

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment', 'cash'] as const;

function AccountModal({
  initial,
  onClose,
}: {
  initial?: Account | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName]   = useState(initial?.name ?? '');
  const [type, setType]   = useState<Account['type']>(initial?.type ?? 'checking');
  const [balance, setBal] = useState(initial ? parseFloat(initial.balance).toString() : '0');
  const [currency, setCur] = useState(initial?.currency ?? 'USD');
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: (data: AccountPayload) =>
      initial ? accountsApi.update(initial.id, data) : accountsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: () => setError('Failed to save'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    // Balance is only settable at create time; afterwards it's derived from
    // transactions. Server rejects unknown keys, so don't send it on edit.
    const parsedBalance = parseFloat(balance);
    const payload: AccountPayload = initial
      ? { name, type, currency }
      : { name, type, balance: Number.isFinite(parsedBalance) ? parsedBalance : 0, currency };
    save.mutate(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
          <p className="text-[10px] font-mono tracking-wider uppercase text-gray-400">{initial ? 'Edit' : 'New'} Account</p>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors text-sm">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Account['type'])}
              className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          {!initial && (
            <div>
              <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Starting Balance</label>
              <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBal(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
              />
            </div>
          )}
          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Currency</label>
            <input
              value={currency}
              onChange={(e) => setCur(e.target.value.toUpperCase().slice(0, 3))}
              maxLength={3}
              className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>
          {error && <p className="text-xs text-red-500 font-mono">{error}</p>}
          <button
            type="submit"
            disabled={save.isPending}
            className="w-full bg-[#111111] text-white py-3 text-xs font-mono tracking-wider uppercase hover:bg-gray-800 disabled:opacity-40 transition-colors rounded-md"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const qc = useQueryClient();
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.list,
  });

  const [modal, setModal] = useState<'create' | Account | null>(null);

  const deleteMutation = useMutation({
    mutationFn: accountsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  function handleDelete(id: number) {
    if (confirm('Delete this account and all its transactions?')) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Accounts</h1>
        <button
          onClick={() => setModal('create')}
          className="bg-[#111111] text-white px-4 py-2 rounded-md text-xs font-mono tracking-wider uppercase hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          + Add Account
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && accounts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base mb-1">No accounts yet</p>
          <p className="text-sm">Add your first account to get started</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {accounts.map((a) => (
          <AccountCard
            key={a.id}
            account={a}
            onEdit={(acc) => setModal(acc)}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {modal && (
        <AccountModal
          initial={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
