import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Search, Building2, ArrowRight } from 'lucide-react';
import GroupSearchClaim from '@/components/groups/GroupSearchClaim';
import GroupBasicForm from '@/components/groups/GroupBasicForm';

export default function SaccoRegister() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('search'); // search | create | success
  const [createdGroup, setCreatedGroup] = useState(null);
  const [createdRole, setCreatedRole] = useState('');

  function handleClaim(group, role) {
    setCreatedGroup(group);
    setCreatedRole(role);
    setPhase('success');
  }

  function handleJoinRequest(group) {
    // After requesting to join committee of an already-claimed group
    navigate('/app/groups');
  }

  function handleSuccess(group, role) {
    setCreatedGroup(group);
    setCreatedRole(role);
    setPhase('success');
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-5 py-3 flex items-center gap-2">
        <button onClick={() => phase === 'search' ? navigate(-1) : setPhase('search')} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-heading font-bold">
            {phase === 'search' ? 'Find or Create Group' : phase === 'create' ? 'Create New Group' : 'Group Created'}
          </h1>
          <p className="text-[10px] text-muted-foreground">
            {phase === 'search' ? 'Step 1 of 2' : phase === 'create' ? 'Step 2 of 2' : 'Done'}
          </p>
        </div>
      </div>

      <div className="px-5 py-5 pb-20 max-w-[512px] mx-auto">
        {phase === 'search' && (
          <GroupSearchClaim
            onClaim={handleClaim}
            onJoinRequest={handleJoinRequest}
            onCreateNew={() => setPhase('create')}
          />
        )}

        {phase === 'create' && (
          <>
            <button onClick={() => setPhase('search')} className="flex items-center gap-1 text-xs text-muted-foreground mb-3 hover:text-foreground">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to search
            </button>
            <GroupBasicForm onSuccess={handleSuccess} />
          </>
        )}

        {phase === 'success' && (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-heading font-bold mb-2">Your Group is Live!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-semibold text-foreground">{createdGroup?.name}</span> is now live and visible to riders in your county.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              You're registered as <span className="font-medium capitalize">{createdRole}</span>. Members can now join your group.
              Verify your group to unlock a business wallet and start collecting contributions.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/app/groups')}
                className="w-full flex items-center justify-center gap-1 bg-primary text-white rounded-xl py-3 text-sm font-semibold"
              >
                Go to Groups <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/app')}
                className="w-full text-xs text-muted-foreground py-2 hover:text-foreground"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}