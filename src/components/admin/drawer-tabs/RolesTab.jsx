import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { X, Plus, Loader2, AlertCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';

const ROLE_OPTIONS = [
  { value: 'rider', label: 'Rider' },
  { value: 'county_admin', label: 'County Admin' },
  { value: 'sacco_admin', label: 'SACCO Admin' },
  { value: 'merchant_admin', label: 'Merchant Admin' },
  { value: 'field_agent', label: 'Field Agent' },
  { value: 'stage_admin', label: 'Stage Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const SCOPED_ROLES = ['county_admin', 'sacco_admin', 'merchant_admin', 'field_agent', 'stage_admin'];

export default function RolesTab({ user, scopeEntities, isSuper, onUpdate }) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [localRoles, setLocalRoles] = useState(user?.roles || [user?.role].filter(Boolean) || []);
  const [newRole, setNewRole] = useState('');
  const [newScope, setNewScope] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [removeConfirm, setRemoveConfirm] = useState(null);

  const currentRoles = localRoles || [];
  const scopeOptions = useMemo(() => getScopeOptions(newRole, scopeEntities), [newRole]);

  if (!isSuper) {
    return <p className="text-center text-xs text-muted-foreground py-8">Only super admins can manage roles</p>;
  }

  async function handleAddRole() {
    if (!newRole) return;
    if (currentRoles.includes(newRole)) {
      toast({ title: 'Role already assigned', variant: 'destructive' });
      return;
    }
    if (SCOPED_ROLES.includes(newRole) && !newScope) {
      toast({ title: 'Scope required for this role', variant: 'destructive' });
      return;
    }
    setConfirmDialog({ role: newRole, scope: newScope });
  }

  async function handleConfirmAdd() {
    setSaving(true);
    try {
      const updatedRoles = [...currentRoles, confirmDialog.role];
      const updateData = { roles: updatedRoles };
      if (confirmDialog.scope) {
        updateData.scope_entity_id = confirmDialog.scope;
        if (confirmDialog.role === 'county_admin' || confirmDialog.role === 'field_agent') {
          updateData.county_id = confirmDialog.scope;
        }
      }
      await base44.entities.User.update(user.id, updateData);
      setLocalRoles(updatedRoles);
      setNewRole('');
      setNewScope('');
      setConfirmDialog(null);
      toast({ title: 'Role added', description: `${ROLE_OPTIONS.find(r => r.value === confirmDialog.role)?.label} granted to ${user.full_name}` });
      if (onUpdate) onUpdate();
    } catch (e) {
      toast({ title: 'Failed to add role', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleRemoveRole(role) {
    setRemoveConfirm(role);
  }

  async function handleConfirmRemove() {
    setSaving(true);
    try {
      const updatedRoles = currentRoles.filter(r => r !== removeConfirm);
      const updateData = { roles: updatedRoles };
      if (!updatedRoles.some(r => ['county_admin', 'field_agent'].includes(r))) {
        updateData.county_id = '';
      }
      await base44.entities.User.update(user.id, updateData);
      setLocalRoles(updatedRoles);
      setRemoveConfirm(null);
      toast({ title: 'Role removed' });
      if (onUpdate) onUpdate();
    } catch (e) {
      toast({ title: 'Failed to remove role', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Current Roles */}
      {currentRoles.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold mb-2">Current Roles</h4>
          <div className="flex flex-wrap gap-2">
            {currentRoles.map(role => {
              const roleLabel = ROLE_OPTIONS.find(r => r.value === role)?.label || role;
              return (
                <div
                  key={role}
                  className="flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1.5 text-xs font-medium"
                >
                  {roleLabel}
                  <button
                    onClick={() => handleRemoveRole(role)}
                    className="p-0.5 hover:bg-primary/20 rounded-full"
                    title="Remove role"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Role Form */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-semibold">Add Role</h4>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">Role</label>
            <select
              value={newRole}
              onChange={e => { setNewRole(e.target.value); setNewScope(''); }}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-xs"
            >
              <option value="">— Select Role —</option>
              {ROLE_OPTIONS.filter(r => !currentRoles.includes(r.value)).map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {newRole && SCOPED_ROLES.includes(newRole) && (
            <div>
              <label className="text-xs text-muted-foreground">{getScopeLabel(newRole)}</label>
              <select
                value={newScope}
                onChange={e => setNewScope(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-xs"
              >
                <option value="">— Select {getScopeLabel(newRole)} —</option>
                {scopeOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {!newScope && (
                <p className="text-[10px] text-warning mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Scope assignment required
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleAddRole}
            disabled={saving || !newRole || (SCOPED_ROLES.includes(newRole) && !newScope)}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2 text-xs font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add Role
          </button>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => !saving && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Grant Role Access</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to grant <strong>{ROLE_OPTIONS.find(r => r.value === confirmDialog?.role)?.label}</strong> access to <strong>{user?.full_name}</strong>.
            {confirmDialog?.scope && (
              <>
                <br />
                This will allow them to access the {getScopeLabel(confirmDialog.role)} portal for <strong>{scopeEntities[getScopeKey(confirmDialog.role)]?.find(e => e.id === confirmDialog.scope)?.name}</strong>.
              </>
            )}
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAdd} disabled={saving} className="bg-primary">
              {saving ? 'Granting...' : 'Confirm'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removeConfirm} onOpenChange={() => !saving && setRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove Role</AlertDialogTitle>
          <AlertDialogDescription>
            Remove <strong>{ROLE_OPTIONS.find(r => r.value === removeConfirm)?.label}</strong> from <strong>{user?.full_name}</strong>?
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove} disabled={saving} className="bg-destructive">
              {saving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getScopeLabel(role) {
  if (role === 'county_admin' || role === 'field_agent') return 'County';
  if (role === 'sacco_admin') return 'SACCO';
  if (role === 'stage_admin') return 'Stage';
  if (role === 'merchant_admin') return 'Merchant';
  return '';
}

function getScopeKey(role) {
  if (role === 'county_admin' || role === 'field_agent') return 'counties';
  if (role === 'sacco_admin') return 'saccos';
  if (role === 'stage_admin') return 'stages';
  if (role === 'merchant_admin') return 'merchants';
  return '';
}

function getScopeOptions(role, scopeEntities) {
  if (role === 'county_admin' || role === 'field_agent') return scopeEntities?.counties?.map(c => ({ value: c.id, label: c.name })) || [];
  if (role === 'sacco_admin') return scopeEntities?.saccos?.map(s => ({ value: s.id, label: s.name })) || [];
  if (role === 'stage_admin') return scopeEntities?.stages?.map(s => ({ value: s.id, label: s.name })) || [];
  if (role === 'merchant_admin') return scopeEntities?.merchants?.map(m => ({ value: m.id, label: m.name })) || [];
  return [];
}