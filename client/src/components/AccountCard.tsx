import { useState } from 'react';
import type { Account } from '../api/accounts';

const TYPE_LABELS: Record<Account['type'], string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  investment: 'Investment',
  cash: 'Cash',
};

interface Props {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: number) => void;
}

export default function AccountCard({ account, onEdit, onDelete }: Props) {
  const balance = parseFloat(account.balance);
  const isNegative = balance < 0;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{account.name}</p>
          <p className="text-xs text-gray-500">{TYPE_LABELS[account.type]} · {account.currency}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-base leading-none transition-colors"
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white border border-gray-100 rounded-lg shadow-lg overflow-hidden min-w-[100px]">
                <button
                  onClick={() => { onEdit(account); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => { onDelete(account.id); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <p className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
        {isNegative ? '-' : ''}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}
