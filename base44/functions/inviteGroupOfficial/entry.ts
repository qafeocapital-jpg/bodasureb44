import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Invite a group official by phone number.
 * Creates a GroupOfficial record (status=pending) and sends an SMS invite
 * via the existing sendSms function.
 * Works whether the invitee has a BodaSure account or not.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { groupId, phone, role, officialName } = await req.json();

    if (!groupId || !phone || !role) {
      return Response.json({ error: 'groupId, phone, and role are required' }, { status: 400 });
    }

    const validRoles = ['chairperson', 'secretary', 'treasurer', 'committee_member'];
    if (!validRoles.includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // Verify the group exists
    const groups = await sr.entities.Group.filter({ id: groupId });
    if (groups.length === 0) {
      return Response.json({ error: 'Group not found' }, { status: 404 });
    }
    const group = groups[0];

    // Verify the inviter is an official of this group (or the founding official)
    const inviterOfficials = await sr.entities.GroupOfficial.filter({
      group_id: groupId,
      user_id: user.id,
      status: 'active',
    });
    if (inviterOfficials.length === 0) {
      // Also allow if user created the group (founding official check via official_name/phone)
      // Be strict: only active officials can invite
      return Response.json({ error: 'Only active group officials can invite others' }, { status: 403 });
    }

    // Check for existing pending/active official with same phone for this group
    const existing = await sr.entities.GroupOfficial.filter({
      group_id: groupId,
      invite_phone: phone,
    });
    if (existing.some(o => o.status === 'active' || o.status === 'pending')) {
      return Response.json({ error: 'An official with this phone is already invited or active' }, { status: 400 });
    }

    // Try to find existing BodaSure user by phone
    let userId = null;
    let kycComplete = false;
    const normalizedPhone = phone.replace(/\D/g, '');
    const phoneVariants = [
      normalizedPhone,
      '0' + normalizedPhone.replace(/^254/, ''),
      '+254' + normalizedPhone.replace(/^254/, '').replace(/^0/, ''),
    ];

    for (const pv of phoneVariants) {
      if (!pv) continue;
      const found = await sr.entities.User.filter({ phone: pv });
      if (found.length > 0) {
        userId = found[0].id;
        kycComplete = found[0].account_state === 'VERIFIED' || found[0].kyc_status === 'approved' || found[0].verification_complete === true;
        break;
      }
    }

    // Create the GroupOfficial record
    const official = await sr.entities.GroupOfficial.create({
      group_id: groupId,
      user_id: userId || null,
      role,
      status: userId ? 'pending' : 'pending',
      invite_phone: phone,
      invite_sent_at: new Date().toISOString(),
      kyc_complete: kycComplete,
      invited_by_user_id: user.id,
    });

    // Send SMS via existing sendSms function
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://bodasure.com';
    const inviteeLabel = officialName || 'there';
    const smsMessage = `Hi ${inviteeLabel}, ${user.full_name} has invited you to join "${group.name}" on BodaSure as ${role}. ${userId ? 'Open BodaSure → Groups to accept.' : 'Download BodaSure and register to accept: ' + appUrl + '/register'}`;

    try {
      await sr.functions.invoke('sendSms', {
        phone,
        message: smsMessage,
        eventType: 'kyc_approved',
        metadata: { group_id: groupId, role },
      });
    } catch (smsError) {
      console.error('Group official invite SMS failed:', smsError);
      // Don't fail the whole operation — record was created
    }

    // Audit log
    await sr.entities.AuditLog.create({
      user_id: user.id,
      action: 'group_official_invited',
      entity_type: 'GroupOfficial',
      entity_id: official.id,
      new_values: { group_id: groupId, role, invite_phone: phone, invitee_user_id: userId },
      description: `Invited ${inviteeLabel} (${phone}) as ${role} to group "${group.name}"`,
      ip_address: 'user:' + user.id,
    });

    return Response.json({
      success: true,
      official_id: official.id,
      invitee_has_account: !!userId,
      message: 'Invitation sent successfully',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});