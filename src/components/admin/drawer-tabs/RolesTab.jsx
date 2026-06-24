import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Check, X } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'rider', label: 'Rider', description: 'Basic app user' },
  { value: 'county_admin', label: 'County Admin', description: 'Manage county operations' },
  { value: 'sacco_admin', label: 'SACCO Admin', description: 'Manage SACCO members' },
  { value: 'merchant_admin', label: 'Merchant Admin', description: 'Manage products & policies' },
  { value: 'field_agent', label: 'Field Agent', description: 'Field verification & enforcement' },
  { value: 'stage_admin', label: 'Stage Admin', description: 'Manage stage operations' },
  { value: 'bodasure_staff', label: 'BodaSure Staff', description: 'Read-only admin access' },
  { value: 'super_admin', label: 'Super Admin', description: 'Full system access' },
];

const SCOPED_ROLES = {
  county_admin: 'counties',
  field_agent: 'counties',
  sacco_admin: 'saccos',
  stage_admin: 'stages',
  merchant_admin: 'merchants',
};

export default function RolesTab({ user, scopeEntities = {}, isSuper, onUpdate }) {
  const { toast } = useToast();
  const [initialRoles, setInitialRoles] = useState(user?.roles || []);
  const [initialScopes, setInitialScopes] = useState(user?.scope_entity_ids || []);
  const [selectedRoles, setSelectedRoles] = useState(user?.roles || []);
  const [selectedScopes, setSelectedScopes] = useState(user?.scope_entity_ids || []);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setInitialRoles(user?.roles || []);
    setInitialScopes(user?.scope_entity_ids || []);
    setSelectedRoles(user?.roles || []);
    setSelectedScopes(user?.scope_entity_ids || []);
  }, [user?.id]);

  const scopedRolesList = useMemo(() => {
    return selectedRoles.filter(r => Object.keys(SCOPED_ROLES).includes(r));
  }, [selectedRoles]);

  const selectedScopesByRole = useMemo(() => {
    const result = {};
    scopedRolesList.forEach(role => {
      const entityType = SCOPED_ROLES[role];
      result[role] = selectedScopes.filter(id => {
        const entities = scopeEntities[entityType] || [];
        return entities.some(e => e.id === id);
      });
    });
    return result;
  }, [selectedScopes, scopedRolesList]);

  const hasChanges = 
    selectedRoles.length !== initialRoles.length ||
    selectedRoles.some(r => !initialRoles.includes(r)) ||
    selectedScopes.length !== initialScopes.length ||
    selectedScopes.some(s => !initialScopes.includes(s));

  function toggleRole(role) {
    setSelectedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }

  function toggleScope(role, scopeId) {
    setSelectedScopes(prev => 
      prev.includes(scopeId) 
        ? prev.filter(id => id !== scopeId)
        : [...prev, scopeId]
    );
  }

  function selectAllForRole(role) {
    const entityType = SCOPED_ROLES[role];
    const entities = scopeEntities[entityType] || [];
    const allIds = entities.map(e => e.id);
    const current = selectedScopesByRole[role] || [];
    if (current.length === allIds.length) {
      // Deselect all
      setSelectedScopes(prev => 
        prev.filter(id => !allIds.includes(id))
      );
    } else {
      // Select all
      setSelectedScopes(prev => {
        const newScopes = new Set(prev);
        allIds.forEach(id => newScopes.add(id));
        return Array.from(newScopes);
      });
    }
  }

  const computeDiff = () => {
    const added = selectedRoles.filter(r => !initialRoles.includes(r));
    const removed = initialRoles.filter(r => !selectedRoles.includes(r));
    const scopesAdded = selectedScopes.filter(s => !initialScopes.includes(s));
    const scopesRemoved = initialScopes.filter(s => !selectedScopes.includes(s));
    return { added, removed, scopesAdded, scopesRemoved };
  };

  async function handleSave() {
    setSaving(true);
    try {
      const firstScopedId = selectedScopes.length > 0 ? selectedScopes[0] : '';
      const updateData = {
        roles: selectedRoles,
        scope_entity_ids: selectedScopes,
        scope_entity_id: firstScopedId,
      };
      await base44.entities.User.update(user.id, updateData);
      toast({ title: 'Roles updated successfully' });
      if (onUpdate) onUpdate();
      setInitialRoles(selectedRoles);
      setInitialScopes(selectedScopes);
      setShowConfirm(false);
    } catch (e) {
      toast({ title: 'Failed to update roles', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  if (!isSuper) {
    return <p className="text-center text-xs text-muted-foreground py-8">Only super admins can manage roles</p>;
  }

  const diff = showConfirm ? computeDiff() : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 max-h-80 overflow-y-auto">
        {/* Left Panel: Roles */}
        <div className="sm:col-span-2 border border-border rounded-xl p-3 space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Available Roles</h4>
          <div className="space-y-2">
            {ROLE_OPTIONS.map(role => (
              <label key={role.value} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                <Checkbox
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={() => toggleRole(role.value)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{role.label}</p>
                  <p className="text-[10px] text-muted-foreground">{role.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Right Panel: Entity Scopes */}
        <div className="sm:col-span-3 border border-border rounded-xl p-3 space-y-3">
          <h4 className="text-xs font-semibold text-foreground">Scope Assignment</h4>
          {scopedRolesList.length === 0 ? (
            <p className="text-xs text-muted-foreground">Select a scoped role to assign entities</p>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {scopedRolesList.map(role => {
                const entityType = SCOPED_ROLES[role];
                const entities = scopeEntities[entityType] || [];
                const current = selectedScopesByRole[role] || [];
                const roleLabel = ROLE_OPTIONS.find(r => r.value === role)?.label || role;
                const entityLabel = {
                  counties: 'Counties',
                  saccos: 'SACCOs',
                  stages: 'Stages',
                  merchants: 'Merchants',
                }[entityType] || entityType;

                return (
                  <div key={role} className="border-t border-border pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold">{entityLabel}</p>
                      <button
                        onClick={() => selectAllForRole(role)}
                        className="text-[10px] text-primary font-medium hover:underline"
                      >
                        {current.length === entities.length && entities.length > 0 ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {entities.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">No {entityLabel.toLowerCase()} available</p>
                      ) : (
                        entities.map(entity => (
                          <label key={entity.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors">
                            <Checkbox
                              checked={current.includes(entity.id)}
                              onCheckedChange={() => toggleScope(role, entity.id)}
                            />
                            <p className="text-xs">{entity.name}</p>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={!hasChanges || saving}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
      </button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={() => !saving && setShowConfirm(false)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogTitle>Confirm Role Changes</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              {diff?.added.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-success mb-1">Roles to add:</p>
                  <div className="flex flex-wrap gap-1">
                    {diff.added.map(r => (
                      <span key={r} className="inline-flex items-center gap-1 bg-success/10 text-success px-2 py-0.5 rounded text-xs">
                        <Check className="w-2.5 h-2.5" /> {ROLE_OPTIONS.find(ro => ro.value === r)?.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {diff?.removed.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-destructive mb-1">Roles to remove:</p>
                  <div className="flex flex-wrap gap-1">
                    {diff.removed.map(r => (
                      <span key={r} className="inline-flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-0.5 rounded text-xs line-through">
                        <X className="w-2.5 h-2.5" /> {ROLE_OPTIONS.find(ro => ro.value === r)?.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {diff?.scopesAdded.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-success mb-1">Scopes to add:</p>
                  <div className="text-xs text-muted-foreground">{diff.scopesAdded.length} entities</div>
                </div>
              )}
              {diff?.scopesRemoved.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-destructive mb-1">Scopes to remove:</p>
                  <div className="text-xs text-muted-foreground">{diff.scopesRemoved.length} entities</div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end mt-4">
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={saving} className="bg-primary">
              {saving ? 'Saving...' : 'Confirm'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}