import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Account State Transition Function
 * The ONLY code path that writes account_state.
 * Validates transitions per the state machine rules.
 */
const VALID_TRANSITIONS = {
  DRAFT: ['BASIC_ACTIVE_ACHIEVED', 'DEACTIVATED'],
  BASIC_ACTIVE: ['KYC_PENDING', 'SUSPENDED', 'DEACTIVATED', 'PROVISIONAL_EXPIRED'],
  KYC_PENDING: ['KYC_REVIEW', 'VERIFIED', 'KYC_REJECTED', 'SUSPENDED'],
  KYC_REVIEW: ['VERIFIED', 'KYC_REJECTED', 'KYC_PENDING', 'SUSPENDED'],
  VERIFIED: ['KYC_REJECTED', 'SUSPENDED', 'DEACTIVATED'],
  KYC_REJECTED: ['KYC_PENDING', 'DEACTIVATED'],
  SUSPENDED: ['BASIC_ACTIVE', 'KYC_PENDING', 'DEACTIVATED'],
  DEACTIVATED: [],
};

const ACCOUNT_STATES = [
  'DRAFT',
  'BASIC_ACTIVE',
  'KYC_PENDING',
  'KYC_REVIEW',
  'VERIFIED',
  'KYC_REJECTED',
  'SUSPENDED',
  'DEACTIVATED',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // FIX 1: Allow system calls (no user session) OR admin sessions, block regular users
    const user = await base44.auth.me().catch(() => null);
    let adminId = null;
    
    if (user) {
      // If user session exists, must be admin
      if (user.role !== 'super_admin' && user.role !== 'bodasure_staff') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      adminId = user.id;
    }
    // If no user session, allow (scheduled/system call)

    const { userId, event, metadata } = await req.json();

    if (!userId || !event) {
      return Response.json({ error: 'userId and event are required' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // Fetch current user state
    const users = await sr.entities.User.filter({ id: userId });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const currentUser = users[0];
    const oldState = currentUser.account_state || 'DRAFT';

    // Validate transition
    const allowedTargets = VALID_TRANSITIONS[oldState] || [];
    const targetState = event === 'DEACTIVATED' ? 'DEACTIVATED' : 
      event === 'BASIC_ACTIVE_ACHIEVED' ? 'BASIC_ACTIVE' :
      event === 'KYC_ACCEPTED' ? 'VERIFIED' :
      event === 'KYC_REVIEW_REQUIRED' ? 'KYC_REVIEW' :
      event === 'KYC_REJECTED' ? 'KYC_REJECTED' :
      event === 'PROVISIONAL_EXPIRED' ? 'SUSPENDED' :
      event;

    if (!ACCOUNT_STATES.includes(targetState)) {
      return Response.json({ error: `Invalid target state: ${targetState}` }, { status: 400 });
    }

    if (!allowedTargets.includes(targetState) && oldState !== targetState) {
      return Response.json({ 
        error: `Invalid transition from ${oldState} to ${targetState}. Allowed: ${allowedTargets.join(', ')}`,
        current_state: oldState,
        allowed_transitions: allowedTargets
      }, { status: 400 });
    }

    // Atomic update
    const updateData = {
      account_state: targetState,
      account_state_updated_at: new Date().toISOString(),
    };

    // Set legacy booleans for backward compatibility
    if (targetState === 'BASIC_ACTIVE' || targetState === 'VERIFIED') {
      updateData.onboarding_complete = true;
    }
    if (targetState === 'VERIFIED') {
      updateData.verification_complete = true;
      updateData.kyc_status = 'verified';
    }
    if (targetState === 'KYC_REJECTED') {
      updateData.kyc_status = 'rejected';
    }

    await sr.entities.User.update(userId, updateData);

    // Audit log
    await sr.entities.AuditLog.create({
      user_id: userId,
      action: 'account_state_transition',
      entity_type: 'User',
      entity_id: userId,
      old_values: { account_state: oldState },
      new_values: { account_state: targetState },
      description: `Transitioned from ${oldState} to ${targetState} via event ${event}`,
      ip_address: adminId ? 'admin:' + adminId : 'system',
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