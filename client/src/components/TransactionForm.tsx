import { useState, useEffect, useRef, FormEvent } from 'react';
import type { Transaction, TransactionPayload } from '../api/transactions';
import type { Account } from '../api/accounts';
import type { Category } from '../api/categories';

interface Props {
  initial?: Transaction | null;
  accounts: Account[];
  categories: Category[];
  onSubmit: (data: TransactionPayload) => Promise<void>;
  onClose: () => void;
}

export default function TransactionForm({ initial, accounts, categories, onSubmit, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [type, setType]           = useState<'income' | 'expense'>(initial?.type ?? 'expense');
  const [accountId, setAccountId] = useState(initial?.account_id?.toString() ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id?.toString() ?? '');
  const [amount, setAmount]       = useState(initial ? parseFloat(initial.amount).toString() : '');
  const [description, setDesc]    = useState(initial?.description ?? '');
  const [date, setDate]           = useState(initial?.date ?? today);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const filteredCategories = categories.filter((c) => c.type === type);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setCategoryId('');
  }, [type]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!accountId) { setError('Select an account'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }

    setSaving(true);
    try {
      await onSubmit({
        account_id: parseInt(accountId),
        category_id: categoryId ? parseInt(categoryId) : null,
        amount: parseFloat(amount),
        type,
        description: description || undefined,
        date,
      });
      onClose();
    } catch {
      setError('Failed to save transaction');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{initial ? 'Edit' : 'New'} Transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === t
                    ? t === 'income'
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No category</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional note"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}
