import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';

const DOC_LABELS = {
  group_reg_cert: 'Registration Certificate',
  group_constitution: 'Constitution / By-laws',
  group_kra_pin: 'KRA PIN Certificate',
  group_resolution: 'Officials Resolution',
};

export default function KybDocsPreview({ groupId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!groupId) return;
      try {
        const list = await base44.entities.KycDocument.filter({ user_id: `group:${groupId}` });
        setDocs(list);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [groupId]);

  if (loading) return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

  const docTypes = Object.keys(DOC_LABELS);

  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">KYB Documents</p>
      <div className="space-y-1.5">
        {docTypes.map(key => {
          const doc = docs.find(d => d.document_type === key);
          const status = doc?.status || 'missing';
          return (
            <div key={key} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-xs">
              <div className="flex-shrink-0">
                {status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                : status === 'pending' ? <Clock className="w-3.5 h-3.5 text-amber-600" />
                : status === 'rejected' ? <XCircle className="w-3.5 h-3.5 text-red-600" />
                : <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <span className="flex-1">{DOC_LABELS[key]}</span>
              {doc?.file_url && <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-primary underline">View</a>}
              <span className={`font-semibold ${status === 'approved' ? 'text-green-600' : status === 'pending' ? 'text-amber-600' : status === 'rejected' ? 'text-red-600' : 'text-muted-foreground'}`}>{status}</span>
            </div>
          );
        })}
        {docs.length === 0 && <p className="text-xs text-muted-foreground py-1">No documents uploaded yet.</p>}
      </div>
    </div>
  );
}