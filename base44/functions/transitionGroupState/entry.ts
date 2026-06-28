import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Group State Transition Function
 * The ONLY code path that writes group_state on the Group entity.
 * Mirrors transitionAccountState pattern.
 * Validates transitions per the group state machine rules.
 * Writes an AuditLog entry on every state change.
 */
const VALID_TRANSITIONS = {
  DRAFT: ['BASIC_ACTIVE', 'DEACTIVATED'],
  BASIC_ACTIVE: ['KYB_PENDING', 'SUSPENDED', 'DEACTIVATED'],
  KYB_PENDING: ['KYB_REVIEW', 'VERIFIED', 'BASIC_ACTIVE', 'SUSPENDED'],
  KYB_REVIEW: ['VERIFIED', 'BASIC_ACTIVE', 'KYB_PENDING', 'SUSPENDED'],
  VERIFIED: ['SUSPENDED', 'DEACTIVATED'],
  SUSPENDED: ['BASIC_ACTIVE', 'KYB_PENDING', 'DEACTIVATED'],
  DEACTIVATED: [],
};

const GROUP_STATES = ['DRAFT', 'BASIC_ACTIVE', 'KYB_PENDING', 'KYB_REVIEW', 'VERIFIED', 'SUSPENDED', 'DEACTIVATED'];

const EVENT_MAP = {
  group_basic_created: 'BASIC_ACTIVE',
  kyb_submitted: 'KYB_PENDING',
  kyb_review_required: 'KYB_REVIEW',
  group_verified: 'VERIFIED',
  group_suspended: 'SUSPENDED',
  group_deactivated: 'DEACTIVATED',
  kyb_rejected: 'BASIC_ACTIVE',
  duplicate_flagged: null,
  governance_dispute: null,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow system calls (no user session) OR admin sessions
    const user = await base44.auth.me().catch(() => null);
    let actorId = null;

    if (user) {
      actorId = user.id;
    }

    const { groupId, event, metadata } = await req.json();

    if (!groupId || !event) {
      return Response.json({ error: 'groupId and event are required' }, { status: 400 });
    }
    // Restrict admin-level events to admin roles (self-service events like group_basic_created/kyb_submitted are allowed for any user)
    const ADMIN_EVENTS = ['group_verified', 'group_suspended', 'group_deactivated'];
    if (user && ADMIN_EVENTS.includes(event) && user.role !== 'super_admin' && user.role !== 'bodasure_staff') {
      return Response.json({ error: 'Admin privileges required for this action' }, { status: 403 });
    }

    const targetState = EVENT_MAP[event];
    if (targetState === null) {
      // Non-state-changing events (duplicate_flagged, governance_dispute) — just audit log
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: actorId,
        action: event,
        entity_type: 'Group',
        entity_id: groupId,
        description: metadata?.description || `Event: ${event}`,
        new_values: metadata || null,
        ip_address: actorId ? 'user:' + actorId : 'system',
      });
      return Response.json({ success: true, event, audit_only: true });
    }

    if (!GROUP_STATES.includes(targetState)) {
      return Response.json({ error: `Invalid target state: ${targetState}` }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const groups = await sr.entities.Group.filter({ id: groupId });
    if (groups.length === 0) {
      return Response.json({ error: 'Group not found' }, { status: 404 });
    }
    const group = groups[0];
    const oldState = group.group_state || 'DRAFT';

    const allowedTargets = VALID_TRANSITIONS[oldState] || [];
    if (!allowedTargets.includes(targetState) && oldState !== targetState) {
      return Response.json({
        error: `Invalid transition from ${oldState} to ${targetState}. Allowed: ${allowedTargets.join(', ')}`,
        current_state: oldState,
        allowed_transitions: allowedTargets,
      }, { status: 400 });
    }

    // Build update data
    const updateData = {
      group_state: targetState,
      group_state_updated_at: new Date().toISOString(),
    };

    // Sync legacy fields for backward compatibility
    if (targetState === 'BASIC_ACTIVE') {
      updateData.status = 'active';
      if (group.kyc_status === 'rejected') updateData.kyc_status = 'unverified';
    }
    if (targetState === 'VERIFIED') {
      updateData.kyc_status = 'verified';
      updateData.status = 'active';
    }
    if (targetState === 'KYB_PENDING') {
      updateData.kyc_status = 'pending';
    }
    if (targetState === 'KYB_REVIEW') {
      updateData.kyc_status = 'pending';
    }
    if (targetState === 'SUSPENDED') {
      updateData.status = 'inactive';
    }
    if (targetState === 'DEACTIVATED') {
      updateData.status = 'inactive';
    }

    if (metadata?.kyb_rejection_reason) {
      updateData.kyb_rejection_reason = metadata.kyb_rejection_reason;
    }

    await sr.entities.Group.update(groupId, updateData);

    // Audit log
    await sr.entities.AuditLog.create({
      user_id: actorId,
      action: 'group_state_transition',
      entity_type: 'Group',
      entity_id: groupId,
      old_values: { group_state: oldState },
      new_values: { group_state: targetState, ...(metadata || {}) },
      description: `Group "${group.name}" transitioned from ${oldState} to ${targetState} via event ${event}`,
      ip_address: actorId ? 'user:' + actorId : 'system',
    });

    return Response.json({
      success: true,
      old_state: oldState,
      new_state: targetState,
      event,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});