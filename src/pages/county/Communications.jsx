import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { MessageSquare, Send, History } from 'lucide-react';
import BulkSmsPage from '@/components/admin/comms/BulkSmsPage';
import SmsLogsPage from '@/components/admin/comms/SmsLogsPage';

export default function CountyCommunications() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bulk');

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Communications</h1>
            <p className="text-sm text-muted-foreground">Send bulk SMS to riders and track message logs</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 -mb-[1px] whitespace-nowrap ${
            activeTab === 'bulk' ? 'text-emerald-600 border-emerald-600' : 'text-muted-foreground border-transparent'
          }`}
        >
          <Send className="w-4 h-4" /> Bulk SMS
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 -mb-[1px] whitespace-nowrap ${
            activeTab === 'logs' ? 'text-emerald-600 border-emerald-600' : 'text-muted-foreground border-transparent'
          }`}
        >
          <History className="w-4 h-4" /> SMS Logs
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'bulk' && <BulkSmsPage countyScope={user?.scope_entity_id || user?.county_id} />}
      {activeTab === 'logs' && <SmsLogsPage countyScope={user?.scope_entity_id || user?.county_id} />}
    </div>
  );
}