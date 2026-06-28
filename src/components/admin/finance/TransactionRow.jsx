import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatKES, formatDateTime } from '@/lib/format';
import TransactionDetailPanel from './TransactionDetailPanel';

const TYPE_BADGE_COLORS = {
  deposit: 'bg-blue-50 text-blue-700 border-blue-200',
  lipisha: 'bg-green-50 text-green-700 border-green-200',
  lipa_county: 'bg-orange-50 text-orange-700 border-orange-200',
  lipa_owner: 'bg-purple-50 text-purple-700 border-purple-200',
  send: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  withdraw: 'bg-amber-50 text-amber-700 border-amber-200',
  penalty: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_BADGE_COLORS = {
  completed: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  initiated: 'bg-gray-50 text-gray-600 border-gray-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  reversed: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function TransactionRow({ txn, expanded, onToggle }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {expanded
              ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            <span className="font-mono text-xs truncate max-w-[140px]">{txn.reference || '—'}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_BADGE_COLORS[txn.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {txn.type?.replace(/_/g, ' ') || '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-semibold">{formatKES(txn.amount_cents)}</td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE_COLORS[txn.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {txn.status}
          </span>
        </td>
        <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(txn.created_date)}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="animate-fade-in">
              <TransactionDetailPanel txn={txn} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}