import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, type Category, type CategoryPayload } from '../api/categories';

function CategoryList({
  items,
  label,
  onEdit,
  onDelete,
}: {
  items: Category[];
  label: string;
  onEdit: (c: Category) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div>
      <p className="text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-3">{label}</p>
      {items.length === 0 && <p className="text-sm text-gray-400 mb-4">None yet</p>}
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-white rounded-xl border border-cream-300 px-4 py-3 hover:border-cream-400 transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-sm text-gray-900">{c.name}</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => onEdit(c)} className="text-[10px] font-mono tracking-wider uppercase text-gray-400 hover:text-gray-900 transition-colors">Edit</button>
              <button onClick={() => onDelete(c.id)} className="text-[10px] font-mono tracking-wider uppercase text-red-400 hover:text-red-600 transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
          <p className="text-[10px] font-mono tracking-wider uppercase text-gray-400">{initial ? 'Edit' : 'New'} Category</p>
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
            <div className="flex rounded-md overflow-hidden border border-cream-300">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 text-xs font-mono tracking-wider uppercase transition-colors ${
                    type === t ? 'bg-[#111111] text-white' : 'bg-white text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 mb-3">Color</label>
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Categories</h1>
        <button
          onClick={() => setModal('create')}
          className="bg-[#111111] text-white px-4 py-2 rounded-md text-xs font-mono tracking-wider uppercase hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          + Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <CategoryList items={expense} label="Expense Categories" onEdit={setModal} onDelete={handleDelete} />
          <CategoryList items={income}  label="Income Categories"  onEdit={setModal} onDelete={handleDelete} />
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
