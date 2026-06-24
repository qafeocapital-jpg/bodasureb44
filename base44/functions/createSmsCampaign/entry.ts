import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { audienceType, audienceFilterId, audiencePhone, message, name, countyScope } = await req.json();
    if (!message || !name || !audienceType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let recipientPhones = [];

    if (audienceType === 'individual' && audiencePhone) {
      recipientPhones = [audiencePhone];
    } else if (audienceType === 'all_riders') {
      const users = countyScope
        ? await base44.asServiceRole.entities.User.filter({ county_id: countyScope })
        : await base44.asServiceRole.entities.User.filter({ staff_type: 'none' });
      recipientPhones = users.filter(u => u.phone).map(u => u.phone);
    } else if (audienceType === 'by_county' && audienceFilterId) {
      const users = await base44.asServiceRole.entities.User.filter({ county_id: audienceFilterId, staff_type: 'none' });
      recipientPhones = users.filter(u => u.phone).map(u => u.phone);
    } else if (audienceType === 'by_sacco' && audienceFilterId) {
      const members = await base44.asServiceRole.entities.GroupMember.filter({ group_id: audienceFilterId });
      const userIds = [...new Set(members.map(m => m.user_id))];
      const users = await Promise.all(
        userIds.map(id => base44.asServiceRole.entities.User.get(id).catch(() => null))
      );
      recipientPhones = users.filter(u => u?.phone).map(u => u.phone);
    } else if (audienceType === 'by_stage' && audienceFilterId) {
      const stage = await base44.asServiceRole.entities.Stage.get(audienceFilterId);
      if (!stage) return Response.json({ error: 'Stage not found' }, { status: 404 });
      const users = await base44.asServiceRole.entities.User.filter({ county_id: stage.county_id });
      recipientPhones = users.filter(u => u.phone).map(u => u.phone);
    } else if (audienceType === 'by_sub_county' && audienceFilterId) {
      const wards = await base44.asServiceRole.entities.Ward.filter({ sub_county_id: audienceFilterId });
      const wardIds = wards.map(w => w.id);
      const vehicles = await base44.asServiceRole.entities.Vehicle.filter({});
      const vehiclesInWards = vehicles.filter(v => wardIds.includes(v.ward_id));
      const riderIds = [...new Set(vehiclesInWards.map(v => v.rider_id).filter(Boolean))];
      const users = await Promise.all(
        riderIds.map(id => base44.asServiceRole.entities.User.get(id).catch(() => null))
      );
      recipientPhones = users.filter(u => u?.phone).map(u => u.phone);
    } else if (audienceType === 'by_ward' && audienceFilterId) {
      const vehicles = await base44.asServiceRole.entities.Vehicle.filter({ ward_id: audienceFilterId });
      const riderIds = [...new Set(vehicles.map(v => v.rider_id).filter(Boolean))];
      const users = await Promise.all(
        riderIds.map(id => base44.asServiceRole.entities.User.get(id).catch(() => null))
      );
      recipientPhones = users.filter(u => u?.phone).map(u => u.phone);
    }

    if (recipientPhones.length === 0) {
      return Response.json({ error: 'No recipients found for this audience' }, { status: 400 });
    }

    const batchCount = Math.ceil(recipientPhones.length / 1000);
    const campaign = await base44.asServiceRole.entities.SmsCampaign.create({
      name,
      message_body: message,
      audience_type: audienceType,
      audience_filter_id: audienceFilterId || null,
      audience_phone: audiencePhone || null,
      county_scope_id: countyScope || null,
      status: 'queued',
      total_recipients: recipientPhones.length,
      batch_count: batchCount,
      created_by_id: user.id,
    });

    // Fire off bulk send async
    try {
      await base44.functions.invoke('sendBulkSms', { campaignId: campaign.id });
    } catch (e) {
      console.error('Failed to start bulk send:', e);
    }

    return Response.json({
      campaignId: campaign.id,
      recipientCount: recipientPhones.length,
      batchCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});