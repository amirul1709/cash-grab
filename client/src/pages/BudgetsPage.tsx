import { useState, useRef, FormEvent } from 'react';
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
    <div className="bg-white rounded-xl border border-cream-300 p-5 hover:border-cream-400 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: budget.category_color }} />
          <span className="font-medium text-gray-900 text-sm truncate">{budget.category_name}</span>
          <span className="text-[9px] font-mono tracking-wider uppercase text-gray-400 shrink-0">{budget.period}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-xs font-mono tabular-nums ${over ? 'text-red-500' : 'text-gray-500'}`}>
            ${spent.toLocaleString()} / ${parseFloat(budget.amount).toLocaleString()}
          </span>
          {actions}
        </div>
      </div>
      <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : 'bg-gray-900'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over ? (
        <p className="text-[10px] font-mono text-red-400 mt-2">
          ${(spent - limit).toLocaleString()} over budget
        </p>
      ) : remaining === 0 ? (
        <p className="text-[10px] font-mono text-gray-400 mt-2">Budget reached</p>
      ) : (
        <p className="text-[10px] font-mono text-gray-400 mt-2">
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
          <p className="text-[10px] font-mono tracking-wider uppercase text-gray-400">{initial ? 'Edit' : 'New'} Budget</p>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors text-sm">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
            >
              <option value="">Select category</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Budget Limit</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Period</label>
            <div className="flex rounded-md overflow-hidden border border-cream-300">
              {(['monthly', 'weekly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 text-xs font-mono tracking-wider uppercase transition-colors ${
                    period === p ? 'bg-[#111111] text-white' : 'bg-white text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
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

export default function BudgetsPage() {
  const qc = useQueryClient();
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: budgetsApi.list,
  });

  const [modal, setModal]       = useState<Budget | 'create' | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [menuPos, setMenuPos]   = useState({ top: 0, right: 0 });
  const menuBtnRefs             = useRef<Record<number, HTMLButtonElement | null>>({});

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
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] text-gray-400">01 /</span>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Budgets</h1>
        </div>
        <button
          onClick={() => setModal('create')}
          className="bg-[#111111] text-white px-4 py-2 rounded-md text-xs font-mono tracking-wider uppercase hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          + Add Budget
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base mb-1">No budgets yet</p>
          <p className="text-sm">Set spending limits per category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {budgets.map((b) => (
            <div key={b.id}>
              <BudgetProgress
                budget={b}
                actions={
                  <div className="relative">
                    <button
                      ref={(el) => { menuBtnRefs.current[b.id] = el; }}
                      onClick={() => {
                        const btn = menuBtnRefs.current[b.id];
                        if (openMenu !== b.id && btn) {
                          const rect = btn.getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                        }
                        setOpenMenu(openMenu === b.id ? null : b.id);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cream-100 text-gray-400 hover:text-gray-700 text-base leading-none transition-colors"
                    >
                      ⋮
                    </button>
                    {openMenu === b.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                        <div
                          className="fixed z-50 bg-white border border-cream-300 rounded-lg shadow-md overflow-hidden min-w-[100px]"
                          style={{ top: menuPos.top, right: menuPos.right }}
                        >
                          <button
                            onClick={() => { setModal(b); setOpenMenu(null); }}
                            className="w-full text-left px-4 py-2 text-xs font-mono tracking-wide text-gray-600 hover:bg-cream-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { handleDelete(b.id); setOpenMenu(null); }}
                            className="w-full text-left px-4 py-2 text-xs font-mono tracking-wide text-red-500 hover:bg-cream-100 transition-colors"
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
