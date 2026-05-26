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
  const [date, setDate]           = useState(initial?.date ? initial.date.slice(0, 10) : today);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const filteredCategories = categories.filter((c) => c.type === type);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
          <p className="text-[10px] font-mono tracking-wider uppercase text-gray-400">{initial ? 'Edit' : 'New'} Transaction</p>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type toggle — semantic colors kept for income/expense clarity */}
          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Type</label>
            <div className="flex rounded-md overflow-hidden border border-cream-300">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 text-xs font-mono tracking-wider uppercase transition-colors ${
                    type === t
                      ? t === 'income'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-white text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-900 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
            >
              <option value="">No category</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional note"
              className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-mono">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#111111] text-white py-3 text-xs font-mono tracking-wider uppercase hover:bg-gray-800 disabled:opacity-40 transition-colors rounded-md"
          >
            {saving ? 'Saving…' : 'Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}
