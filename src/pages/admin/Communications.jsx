import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { MessageSquare, FileText, Send, History } from 'lucide-react';
import SmsTemplatesPage from '@/components/admin/comms/SmsTemplatesPage';
import BulkSmsPage from '@/components/admin/comms/BulkSmsPage';
import SmsLogsPage from '@/components/admin/comms/SmsLogsPage';

export default function Communications() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('templates');

  const isSuperAdmin = user?.roles?.includes('super_admin') || user?.role === 'super_admin';

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Communications</h1>
            <p className="text-sm text-muted-foreground">Manage SMS templates and campaigns</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 -mb-[1px] whitespace-nowrap ${
            activeTab === 'templates' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'
          }`}
        >
          <FileText className="w-4 h-4" /> SMS Templates
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 -mb-[1px] whitespace-nowrap ${
              activeTab === 'bulk' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'
            }`}
          >
            <Send className="w-4 h-4" /> Bulk SMS
          </button>
        )}
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 -mb-[1px] whitespace-nowrap ${
            activeTab === 'logs' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'
          }`}
        >
          <History className="w-4 h-4" /> SMS Logs
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'templates' && <SmsTemplatesPage />}
      {activeTab === 'bulk' && isSuperAdmin && <BulkSmsPage />}
      {activeTab === 'logs' && <SmsLogsPage />}
    </div>
  );
}