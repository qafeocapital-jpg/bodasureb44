import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft, Upload, CheckCircle2, Clock, XCircle, IdCard, Camera } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function Kyc() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const fileRefs = {
    id_front: useRef(null),
    id_back: useRef(null),
    selfie: useRef(null),
  };

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const userDocs = await base44.entities.KycDocument.filter({ user_id: user.id });
        setDocs(userDocs);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) return <PageSkeleton variant="hero-rows" />;

  const docTypes = [
    { key: 'id_front', label: 'ID Card Front', icon: IdCard },
    { key: 'id_back', label: 'ID Card Back', icon: IdCard },
    { key: 'selfie', label: 'Selfie Photo', icon: Camera },
  ];

  function getDocStatus(type) {
    const doc = docs.find(d => d.document_type === type);
    return doc;
  }

  async function handleUpload(type, file) {
    if (!file) return;
    setUploading(true);
    setUploadingType(type);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const existing = docs.find(d => d.document_type === type);
      if (existing) {
        const updated = await base44.entities.KycDocument.update(existing.id, {
          file_url,
          status: 'pending',
          rejection_reason: '',
        });
        setDocs(prev => prev.map(d => d.id === existing.id ? updated : d));
      } else {
        const newDoc = await base44.entities.KycDocument.create({
          user_id: user?.id,
          document_type: type,
          file_url,
          status: 'pending',
        });
        setDocs(prev => [...prev, newDoc]);
      }

      if (docTypes.every(dt => dt.key === type || docs.find(d => d.document_type === dt.key))) {
        await base44.auth.updateMe({ kyc_status: 'pending' });
      }
    } catch (e) {
      console.error(e);
    }
    setUploading(false);
    setUploadingType(null);
  }

  const allUploaded = docTypes.every(dt => getDocStatus(dt.key));

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">KYC Verification</h1>
      </div>

      {/* Status banner */}
      <div className={`rounded-xl p-4 mb-5 ${user?.kyc_status === 'approved' ? 'bg-success/10' : user?.kyc_status === 'pending' ? 'bg-warning/10' : 'bg-accent'}`}>
        <div className="flex items-center gap-2">
          {user?.kyc_status === 'approved' ? (
            <><CheckCircle2 className="w-5 h-5 text-success" /><p className="text-sm font-medium text-success">KYC Approved — Tier 2 unlocked!</p></>
          ) : user?.kyc_status === 'pending' ? (
            <><Clock className="w-5 h-5 text-warning" /><p className="text-sm font-medium text-warning">Under Review — We're checking your documents</p></>
          ) : (
            <><Upload className="w-5 h-5 text-muted-foreground" /><p className="text-sm font-medium text-muted-foreground">Upload your documents to get verified</p></>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-5">
        Upload clear photos of your national ID and a selfie. This unlocks higher wallet limits, withdrawals, and Lipa Owner.
      </p>

      {/* Document upload cards */}
      <div className="space-y-3">
        {docTypes.map(dt => {
          const doc = getDocStatus(dt.key);
          const Icon = dt.icon;
          return (
            <div key={dt.key} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{dt.label}</p>
                    {doc ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        {doc.status === 'approved' && <><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span className="text-[10px] text-success font-medium">Approved</span></>}
                        {doc.status === 'pending' && <><Clock className="w-3.5 h-3.5 text-warning" /><span className="text-[10px] text-warning font-medium">Pending</span></>}
                        {doc.status === 'rejected' && <><XCircle className="w-3.5 h-3.5 text-destructive" /><span className="text-[10px] text-destructive font-medium">Rejected</span></>}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Not uploaded</span>
                    )}
                  </div>
                </div>
              </div>

              <input
                ref={fileRefs[dt.key]}
                type="file"
                accept="image/*"
                capture={dt.key === 'selfie' ? 'user' : undefined}
                className="hidden"
                onChange={e => handleUpload(dt.key, e.target.files[0])}
              />
              <button
                onClick={() => fileRefs[dt.key].current?.click()}
                disabled={uploading && uploadingType === dt.key}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-3 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                {uploading && uploadingType === dt.key ? (
                  'Uploading...'
                ) : doc ? (
                  <><Upload className="w-4 h-4" /> Replace</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Photo</>
                )}
              </button>

              {doc?.rejection_reason && (
                <p className="text-[10px] text-destructive mt-2">{doc.rejection_reason}</p>
              )}
            </div>
          );
        })}
      </div>

      {allUploaded && user?.kyc_status !== 'approved' && (
        <div className="mt-5 bg-success/10 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-1" />
          <p className="text-sm font-medium text-success">All documents uploaded!</p>
          <p className="text-xs text-muted-foreground mt-0.5">We'll review and approve within 24 hours.</p>
        </div>
      )}
    </div>
  );
}