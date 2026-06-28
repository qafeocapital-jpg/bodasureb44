import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { FileText, Upload, Loader2, CheckCircle2, Clock, XCircle, FileCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const KYB_DOCS = [
  { key: 'group_reg_cert', label: 'Group Registration Certificate', desc: 'Certificate of registration from the relevant government body' },
  { key: 'group_constitution', label: 'Constitution / By-laws', desc: 'The group\'s governing document' },
  { key: 'group_kra_pin', label: 'KRA PIN Certificate', desc: 'Kenya Revenue Authority PIN for the group' },
  { key: 'group_resolution', label: 'Officials Resolution', desc: 'Signed resolution authorizing BodaSure wallet opening' },
];

export default function GroupKybDocuments({ group }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);

  useEffect(() => { load(); }, [group?.id]);

  async function load() {
    if (!group?.id) return;
    setLoading(true);
    try {
      const list = await base44.entities.KycDocument.filter({ user_id: `group:${group.id}` });
      setDocs(list);
    } catch (e) {}
    setLoading(false);
  }

  async function handleUpload(docKey) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(docKey);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        // Check if there's an existing doc for this type
        const existing = docs.find(d => d.document_type === docKey);
        if (existing) {
          await base44.entities.KycDocument.update(existing.id, {
            file_url,
            status: 'pending',
            rejection_reason: null,
            reviewed_by_id: null,
            reviewed_at: null,
          });
        } else {
          await base44.entities.KycDocument.create({
            user_id: `group:${group.id}`,
            document_type: docKey,
            file_url,
            status: 'pending',
            provider_name: 'manual_upload',
          });
        }
        toast({ title: 'Document uploaded' });
        load();
      } catch (err) {
        toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
      }
      setUploading(null);
    };
    input.click();
  }

  function getDocStatus(docKey) {
    const doc = docs.find(d => d.document_type === docKey);
    if (!doc) return { status: 'missing', doc: null };
    return { status: doc.status, doc };
  }

  const allApproved = KYB_DOCS.every(d => getDocStatus(d.key).status === 'approved');

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground mb-2">Upload the following documents. Each will be reviewed by BodaSure before your business wallet is activated.</p>

      {KYB_DOCS.map(doc => {
        const { status, doc: docRecord } = getDocStatus(doc.key);
        return (
          <div key={doc.key} className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                status === 'approved' ? 'bg-green-100 text-green-600'
                : status === 'rejected' ? 'bg-red-100 text-red-600'
                : status === 'pending' ? 'bg-amber-100 text-amber-600'
                : 'bg-muted text-muted-foreground'
              }`}>
                {status === 'approved' ? <FileCheck className="w-4 h-4" />
                : status === 'pending' ? <Clock className="w-4 h-4" />
                : status === 'rejected' ? <XCircle className="w-4 h-4" />
                : <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{doc.label}</p>
                <p className="text-[10px] text-muted-foreground">{doc.desc}</p>
                {docRecord?.rejection_reason && (
                  <p className="text-[10px] text-red-600 mt-1">Rejected: {docRecord.rejection_reason}</p>
                )}
                {docRecord?.file_url && status === 'pending' && (
                  <a href={docRecord.file_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline mt-1">View uploaded file</a>
                )}
              </div>
              <button
                onClick={() => handleUpload(doc.key)}
                disabled={uploading === doc.key}
                className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-lg px-3 py-1.5 disabled:opacity-50"
              >
                {uploading === doc.key ? <Loader2 className="w-3 h-3 animate-spin" />
                : status === 'approved' ? <CheckCircle2 className="w-3 h-3" />
                : <Upload className="w-3 h-3" />}
                {status === 'approved' ? 'Replace' : status === 'missing' ? 'Upload' : 'Re-upload'}
              </button>
            </div>
          </div>
        );
      })}

      {allApproved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <p className="text-xs text-green-800 font-medium">All documents approved! You can proceed to Business Account.</p>
        </div>
      )}
    </div>
  );
}