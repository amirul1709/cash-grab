import { useState, useRef } from 'react';
import type { Account } from '../api/accounts';

const TYPE_LABELS: Record<Account['type'], string> = {
  checking:   'Checking',
  savings:    'Savings',
  credit:     'Credit',
  investment: 'Investment',
  cash:       'Cash',
};

interface Props {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: number) => void;
}

export default function AccountCard({ account, onEdit, onDelete }: Props) {
  const balance    = parseFloat(account.balance);
  const isNegative = balance < 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleMenuOpen() {
    if (!menuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setMenuOpen((v) => !v);
  }

  return (
    <div className="bg-white border border-cream-300 rounded-xl p-5 hover:border-cream-400 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[9px] font-mono tracking-editorial uppercase text-gray-400 mb-1">
            {TYPE_LABELS[account.type]} · {account.currency}
          </p>
          <p className="font-medium text-gray-900 text-sm">{account.name}</p>
        </div>
        <div className="relative">
          <button
            ref={btnRef}
            onClick={handleMenuOpen}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cream-100 text-gray-400 hover:text-gray-700 text-base leading-none transition-colors"
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div
                className="fixed z-50 bg-white border border-cream-300 rounded-lg shadow-md overflow-hidden min-w-[100px]"
                style={{ top: pos.top, right: pos.right }}
              >
                <button
                  onClick={() => { onEdit(account); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-mono tracking-wide text-gray-600 hover:bg-cream-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => { onDelete(account.id); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-mono tracking-wide text-red-500 hover:bg-cream-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <p className={`text-3xl font-light tracking-tight tabular-nums ${isNegative ? 'text-red-500' : 'text-gray-900'}`}>
        {isNegative ? '−' : ''}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}
