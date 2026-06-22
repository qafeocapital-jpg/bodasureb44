import { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Receipt, AlertCircle } from 'lucide-react';
import { formatKES, formatDateTime } from '@/lib/format';
import { formatPhoneDisplay } from '@/lib/phone';
import FileDisputeSheet from './FileDisputeSheet';

const typeLabels = {
  deposit: 'Deposit',
  withdraw: 'Withdrawal',
  send: 'Sent',
  lipisha: 'Fare Collection',
  lipa_county: 'County Payment',
  lipa_owner: 'Owner Payment',
  chama: 'Chama Contribution',
  insurance: 'Insurance Premium',
  utility: 'Bill Payment',
  penalty: 'Penalty Payment',
  p2p_receive: 'Received',
};

export default function TransactionDetailSheet({ transaction, onClose }) {
  const [showDispute, setShowDispute] = useState(false);
  if (!transaction) return null;

  const isCredit = ['deposit', 'lipisha', 'p2p_receive'].includes(transaction.type);
  const canDispute = transaction.status === 'failed' || transaction.status === 'completed';

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading font-bold text-lg">Transaction Details</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Amount */}
        <div className="flex flex-col items-center mb-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${isCredit ? 'bg-success/10' : 'bg-accent'}`}>
            {isCredit ? (
              <ArrowDownLeft className="w-7 h-7 text-success" />
            ) : (
              <ArrowUpRight className="w-7 h-7 text-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">{typeLabels[transaction.type] || transaction.type}</p>
          <p className={`text-3xl font-heading font-extrabold mt-1 ${isCredit ? 'text-success' : ''}`}>
            {isCredit ? '+' : '-'}{formatKES(transaction.amount_cents)}
          </p>
          <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 mt-2 ${
            transaction.status === 'completed' ? 'bg-success/10 text-success'
            : transaction.status === 'initiated' || transaction.status === 'pending' ? 'bg-warning/10 text-warning'
            : transaction.status === 'failed' ? 'bg-destructive/10 text-destructive'
            : 'bg-muted text-muted-foreground'
          }`}>
            {transaction.status}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-3 bg-accent/50 rounded-xl p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Reference</span>
            <span className="font-mono text-xs font-medium">{transaction.reference}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date & Time</span>
            <span className="font-medium">{formatDateTime(transaction.created_date)}</span>
          </div>
          {transaction.counterparty_phone && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Counterparty</span>
              <span className="font-medium">{formatPhoneDisplay(transaction.counterparty_phone)}</span>
            </div>
          )}
          {transaction.description && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Description</span>
              <span className="font-medium text-right max-w-[60%]">{transaction.description}</span>
            </div>
          )}
          {transaction.product_type && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium capitalize">{transaction.product_type.replace(/_/g, ' ')}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-5">
          <button className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm font-semibold hover:bg-accent transition-colors">
            <Receipt className="w-4 h-4" /> Share Receipt
          </button>
          {canDispute && (
            <button
              onClick={() => setShowDispute(true)}
              className="flex-1 flex items-center justify-center gap-2 border border-destructive/20 text-destructive rounded-xl py-3 text-sm font-semibold hover:bg-destructive/5 transition-colors"
            >
              <AlertCircle className="w-4 h-4" /> Report Problem
            </button>
          )}
        </div>
      </div>

      <FileDisputeSheet
        open={showDispute}
        onClose={() => setShowDispute(false)}
        onSubmit={async (data) => {
          const { base44 } = await import('@/api/base44Client');
          const user = await base44.auth.me();
          await base44.entities.Dispute.create({
            rider_id: user.id,
            transaction_id: transaction.id,
            transaction_reference: transaction.reference,
            amount_cents: transaction.amount_cents,
            category: data.category,
            reason: data.reason,
            description: data.description,
            status: 'open',
          });
        }}
        transaction={transaction}
      />
    </div>
  );
}