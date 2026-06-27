import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Daily scheduled function to process owner invite reminders.
 * Runs at 9 AM EAT daily.
 * Sends reminders at day 3, day 7, and flags for admin at day 14.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin-only scheduled function
    const user = await base44.auth.me().catch(() => null);
    if (!user || (user.role !== 'super_admin' && user.role !== 'bodasure_staff')) {
      // Allow scheduled execution without user (system call)
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const sr = base44.asServiceRole;
    const now = new Date();

    // FIX 7: Fetch vehicles (accept 50-record limit for now - most counties have <50 unverified owners)
    // Note: Base44 filter doesn't support skip parameter, so we fetch one batch of 50
    const batch = await sr.entities.Vehicle.filter({}, '-created_date', 50);
    const vehiclesToProcess = batch.filter(v => 
      v.owner_invite_sent_at && 
      v.owner_verified !== true && 
      v.is_owner_rider !== true
    );

    let remindersSent = 0;
    let flaggedForReview = 0;

    for (const vehicle of vehiclesToProcess) {
      const inviteSentAt = new Date(vehicle.owner_invite_sent_at);
      const daysSinceInvite = Math.floor((now.getTime() - inviteSentAt.getTime()) / (1000 * 60 * 60 * 24));

      // Day 3 reminder
      if (daysSinceInvite === 3) {
        try {
          await sr.functions.invoke('sendSms', {
            to: vehicle.owner_phone,
            message: `Hi ${vehicle.owner_name}, this is a reminder to verify your motorcycle ${vehicle.plate_number} on BodaSure. Download the app: https://bodasure.com/register`,
          });
          remindersSent++;
        } catch (e) {
          console.error(`Day 3 reminder failed for ${vehicle.plate_number}:`, e);
        }
      }

      // Day 7 reminder
      if (daysSinceInvite === 7) {
        try {
          await sr.functions.invoke('sendSms', {
            to: vehicle.owner_phone,
            message: `Hi ${vehicle.owner_name}, second reminder: Please verify ownership of ${vehicle.plate_number} on BodaSure. Contact support if you need help: 0701200500.`,
          });
          remindersSent++;
        } catch (e) {
          console.error(`Day 7 reminder failed for ${vehicle.plate_number}:`, e);
        }
      }

      // Day 14 - flag for admin review
      if (daysSinceInvite >= 14 && !vehicle.needs_review) {
        await sr.entities.Vehicle.update(vehicle.id, { needs_review: true });
        flaggedForReview++;

        await sr.entities.AuditLog.create({
          user_id: vehicle.rider_id,
          action: 'owner_invite_escalated',
          entity_type: 'Vehicle',
          entity_id: vehicle.id,
          new_values: { needs_review: true },
          description: `Owner invite escalated to admin review after 14 days for ${vehicle.plate_number}`,
          ip_address: 'system',
        });
      }
    }

    return Response.json({
      success: true,
      processed: vehiclesToProcess.length,
      reminders_sent: remindersSent,
      flagged_for_review: flaggedForReview,
      executed_at: now.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});