import { useState, FormEvent } from 'react';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi, type Budget, type BudgetPayload } from '../api/budgets';
import { categoriesApi } from '../api/categories';

function BudgetProgress({ budget, actions }: { budget: Budget; actions?: React.ReactNode }) {
  const spent  = parseFloat(budget.spent);
  const limit  = parseFloat(budget.amount);
  const pct    = Math.min(100, limit > 0 ? (spent / limit) * 100 : 0);
  const over      = spent > limit;
  const remaining = limit - spent;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: budget.category_color }} />
          <span className="font-medium text-gray-900 text-sm truncate">{budget.category_name}</span>
          <span className="text-xs text-gray-400 capitalize shrink-0">{budget.period}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-xs font-semibold ${over ? 'text-red-500' : 'text-gray-500'}`}>
            ${spent.toLocaleString()} / ${parseFloat(budget.amount).toLocaleString()}
          </span>
          {actions}
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over ? (
        <p className="text-xs text-red-500 mt-1">
          ${(spent - limit).toLocaleString()} over budget
        </p>
      ) : remaining === 0 ? (
        <p className="text-xs text-indigo-500 mt-1">Budget reached</p>
      ) : (
        <p className="text-xs text-indigo-500 mt-1">
          ${remaining.toLocaleString()} remaining
        </p>
      )}
    </div>
  );
}

function BudgetModal({ initial, onClose }: { initial?: Budget | null; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 8) + '01';

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const [categoryId, setCategoryId] = useState(initial?.category_id?.toString() ?? '');
  const [amount, setAmount]         = useState(initial ? parseFloat(initial.amount).toString() : '');
  const [period, setPeriod]         = useState<'monthly' | 'weekly'>(initial?.period ?? 'monthly');
  const [startDate, setStartDate]   = useState(initial?.start_date?.slice(0, 10) ?? today);
  const [error, setError]           = useState('');

  const save = useMutation({
    mutationFn: (data: BudgetPayload) =>
      initial ? budgetsApi.update(initial.id, data) : budgetsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); onClose(); },
    onError: () => setError('Failed to save'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!categoryId) { setError('Select a category'); return; }
    save.mutate({ category_id: parseInt(categoryId), amount: parseFloat(amount), period, start_date: startDate });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold">{initial ? 'Edit' : 'New'} Budget</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select category</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Budget Limit</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Period</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(['monthly', 'weekly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    period === p ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={save.isPending}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const qc = useQueryClient();
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: budgetsApi.list,
  });

  const [modal, setModal] = useState<Budget | 'create' | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: budgetsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });

  function handleDelete(id: number) {
    if (confirm('Delete this budget?')) deleteMutation.mutate(id);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Budgets</h1>
        <button
          onClick={() => setModal('create')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          + Add Budget
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No budgets yet</p>
          <p className="text-sm">Set spending limits per category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => (
            <div key={b.id}>
              <BudgetProgress
                budget={b}
                actions={
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-base leading-none transition-colors"
                    >
                      ⋮
                    </button>
                    {openMenu === b.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                        <div className="absolute right-0 top-8 z-20 bg-white border border-gray-100 rounded-lg shadow-lg overflow-hidden min-w-[100px]">
                          <button
                            onClick={() => { setModal(b); setOpenMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { handleDelete(b.id); setOpenMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                }
              />
            </div>
          ))}
        </div>
      )}

      {modal && (
        <BudgetModal
          initial={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
