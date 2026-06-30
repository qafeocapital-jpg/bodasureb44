import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Convert provisional permit to full permit upon KYC verification.
 * Called when verification_complete becomes true.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    let targetUserId = user?.id;

    // Allow passing userId explicitly (for admin/function-invoked calls)
    try {
      const body = await req.json();
      if (body?.userId) targetUserId = body.userId;
    } catch { /* no body — use authenticated user */ }

    if (!targetUserId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sr = base44.asServiceRole;

    // Find user's provisional permits
    const permits = await sr.entities.Permit.filter({ 
      rider_id: targetUserId, 
      permit_type: 'provisional', 
      status: 'active' 
    });

    if (!permits || permits.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No provisional permits to convert',
        converted: 0,
      });
    }

    let convertedCount = 0;

    for (const permit of permits) {
      // Calculate full permit end date based on billing cycle
      const issuedAt = new Date(permit.start_date || permit.created_date);
      const fullEndDate = new Date(issuedAt);
      
      if (permit.billing_cycle === 'weekly') fullEndDate.setDate(fullEndDate.getDate() + 7);
      else if (permit.billing_cycle === 'monthly') fullEndDate.setMonth(fullEndDate.getMonth() + 1);
      else if (permit.billing_cycle === 'quarterly') fullEndDate.setMonth(fullEndDate.getMonth() + 3);
      else if (permit.billing_cycle === 'yearly') fullEndDate.setFullYear(fullEndDate.getFullYear() + 1);

      // Update permit
      await sr.entities.Permit.update(permit.id, {
        permit_type: 'full',
        end_date: fullEndDate.toISOString(),
      });

      // Audit log
      await sr.entities.AuditLog.create({
        user_id: targetUserId,
        action: 'permit_converted_to_full',
        entity_type: 'Permit',
        entity_id: permit.id,
        old_values: { permit_type: 'provisional', end_date: permit.end_date },
        new_values: { permit_type: 'full', end_date: fullEndDate.toISOString() },
        description: `Permit ${permit.id} converted from provisional to full, extended to ${fullEndDate.toISOString()}`,
        ip_address: 'system',
      });

      convertedCount++;
    }

    return Response.json({
      success: true,
      converted: convertedCount,
      message: `${convertedCount} permit(s) converted to full`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});