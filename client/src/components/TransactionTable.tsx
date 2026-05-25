import { useState } from 'react';
import type { Transaction } from '../api/transactions';
import { formatDate } from '../utils/format';

interface Props {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  onPage: (p: number) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number) => void;
}

function KebabMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-base leading-none transition-colors"
      >
        ⋮
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-gray-100 rounded-lg shadow-lg overflow-hidden min-w-[100px]">
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TransactionTable({
  transactions,
  total,
  page,
  limit,
  onPage,
  onEdit,
  onDelete,
}: Props) {
  const totalPages = Math.ceil(total / limit);
  const pageNumbers = buildPageWindow(page, totalPages);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Mobile/tablet: stacked cards */}
      <ul className="lg:hidden divide-y divide-gray-50">
        {transactions.length === 0 && (
          <li className="px-4 py-8 text-center text-gray-400 text-sm">No transactions found</li>
        )}
        {transactions.map((t) => (
          <li key={t.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 truncate">{t.description || '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {formatDate(t.date)} · {t.account_name}
                </p>
                {t.category_name && (
                  <span
                    className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: t.category_color ?? '#6366f1' }}
                  >
                    {t.category_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className={`text-sm font-semibold whitespace-nowrap ${
                  t.type === 'income' ? 'text-green-600' : 'text-red-500'
                }`}>
                  {t.type === 'income' ? '+' : '-'}${parseFloat(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <KebabMenu onEdit={() => onEdit(t)} onDelete={() => onDelete(t.id)} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No transactions found
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                <td className="px-4 py-3 text-gray-900">{t.description || '—'}</td>
                <td className="px-4 py-3">
                  {t.category_name ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: t.category_color ?? '#6366f1' }}
                    >
                      {t.category_name}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{t.account_name}</td>
                <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                  t.type === 'income' ? 'text-green-600' : 'text-red-500'
                }`}>
                  {t.type === 'income' ? '+' : '-'}${parseFloat(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <KebabMenu onEdit={() => onEdit(t)} onDelete={() => onDelete(t.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
          <span className="text-xs sm:text-sm">{total} total</span>
          <div className="flex gap-1 flex-wrap justify-end">
            <button
              onClick={() => onPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              ‹
            </button>
            {pageNumbers.map((p, i) =>
              p === '…' ? (
                <span key={`gap-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPage(p)}
                  className={`w-8 h-8 rounded ${
                    p === page
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => onPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildPageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}
