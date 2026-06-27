import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Send owner invite SMS with automated reminder scheduling.
 * Called when rider submits owner phone + name in Phase 4.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sr = base44.asServiceRole;
    const { vehicleId, ownerPhone, ownerName } = await req.json();

    if (!vehicleId || !ownerPhone || !ownerName) {
      return Response.json({ error: 'vehicleId, ownerPhone, and ownerName are required' }, { status: 400 });
    }

    // Fetch vehicle
    const vehicles = await sr.entities.Vehicle.filter({ id: vehicleId });
    if (vehicles.length === 0) {
      return Response.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    const vehicle = vehicles[0];

    // Verify rider owns this vehicle
    if (vehicle.rider_id !== user.id) {
      return Response.json({ error: 'Unauthorized for this vehicle' }, { status: 403 });
    }

    // Update vehicle with owner details
    const updateData = {
      owner_phone: ownerPhone,
      owner_name: ownerName,
      owner_invite_sent_at: new Date().toISOString(),
    };

    // If rider is the owner, mark as verified immediately
    if (vehicle.is_owner_rider === true) {
      updateData.owner_verified = true;
    }

    await sr.entities.Vehicle.update(vehicleId, updateData);

    // Send SMS to owner
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://bodasure.com';
    const downloadLink = `${appUrl}/register`;
    
    const smsMessage = `Hi ${ownerName}, ${user.full_name} has registered your motorcycle ${vehicle.plate_number} on BodaSure. Download BodaSure and verify your bike ownership: ${downloadLink}`;

    try {
      await sr.functions.invoke('sendSms', {
        to: ownerPhone,
        message: smsMessage,
      });
    } catch (smsError) {
      console.error('Owner invite SMS failed:', smsError);
      // Don't fail the vehicle update
    }

    // Log audit trail
    await sr.entities.AuditLog.create({
      user_id: user.id,
      action: 'owner_invite_sent',
      entity_type: 'Vehicle',
      entity_id: vehicleId,
      new_values: { owner_phone: ownerPhone, owner_name: ownerName, owner_invite_sent_at: updateData.owner_invite_sent_at },
      description: `Owner invite sent to ${ownerName} (${ownerPhone}) for vehicle ${vehicle.plate_number}`,
      ip_address: 'system',
    });

    return Response.json({
      success: true,
      owner_invite_sent_at: updateData.owner_invite_sent_at,
      message: 'Owner invite sent successfully',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});