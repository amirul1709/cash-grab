import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, type Category, type CategoryPayload } from '../api/categories';

const COLORS = [
  '#6366f1', '#f87171', '#34d399', '#fbbf24', '#60a5fa',
  '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c', '#4ade80',
];

function CategoryModal({
  initial,
  onClose,
}: {
  initial?: Category | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName]   = useState(initial?.name ?? '');
  const [type, setType]   = useState<'income' | 'expense'>(initial?.type ?? 'expense');
  const [color, setColor] = useState(initial?.color ?? '#6366f1');
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: (data: CategoryPayload) =>
      initial ? categoriesApi.update(initial.id, data) : categoriesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); onClose(); },
    onError: () => setError('Failed to save'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    save.mutate({ name, type, color });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold">{initial ? 'Edit' : 'New'} Category</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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

export default function CategoriesPage() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const [modal, setModal] = useState<Category | 'create' | null>(null);

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const income  = categories.filter((c) => c.type === 'income');
  const expense = categories.filter((c) => c.type === 'expense');

  function handleDelete(id: number) {
    if (confirm('Delete this category?')) deleteMutation.mutate(id);
  }

  function CategoryList({ items, label }: { items: Category[]; label: string }) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</h2>
        {items.length === 0 && <p className="text-sm text-gray-400 mb-4">None yet</p>}
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-sm text-gray-900">{c.name}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModal(c)} className="text-xs text-indigo-600 hover:text-indigo-800">Edit</button>
                <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={() => setModal('create')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          + Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <CategoryList items={expense} label="Expense Categories" />
          <CategoryList items={income}  label="Income Categories"  />
        </div>
      )}

      {modal && (
        <CategoryModal
          initial={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
