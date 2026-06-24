import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const getAtCredentials = () => {
  const env = Deno.env.get('AT_ENVIRONMENT');
  const isProd = env === 'production';
  return {
    username: isProd ? Deno.env.get('AT_USERNAME_PRODUCTION') : Deno.env.get('AT_USERNAME'),
    apiKey: isProd ? Deno.env.get('AT_API_KEY_PRODUCTION') : Deno.env.get('AT_API_KEY'),
    baseUrl: isProd ? 'https://api.africastalking.com' : 'https://api.sandbox.africastalking.com',
  };
};

function sanitizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;
  let sanitized = phone.trim();
  sanitized = sanitized.replace(/\D/g, '');
  if (!sanitized) return null;
  if (sanitized.startsWith('254')) return `+${sanitized}`;
  if (sanitized.startsWith('0')) return `+254${sanitized.substring(1)}`;
  return `+254${sanitized}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { campaignId } = await req.json();
    if (!campaignId) return Response.json({ error: 'Missing campaignId' }, { status: 400 });

    const campaign = await base44.asServiceRole.entities.SmsCampaign.get(campaignId);
    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });

    // Resolve all recipient phones based on campaign audience
    let recipientPhones = [];
    if (campaign.audience_type === 'individual' && campaign.audience_phone) {
      const formatted = sanitizePhoneNumber(campaign.audience_phone);
      if (formatted) recipientPhones = [formatted];
    } else if (campaign.audience_type === 'all_riders') {
      const users = campaign.county_scope_id
        ? await base44.asServiceRole.entities.User.filter({ county_id: campaign.county_scope_id, staff_type: 'none' })
        : await base44.asServiceRole.entities.User.filter({ staff_type: 'none' });
      recipientPhones = users.filter(u => u.phone).map(u => sanitizePhoneNumber(u.phone)).filter(Boolean);
    } else if (campaign.audience_type === 'by_county' && campaign.audience_filter_id) {
      const users = await base44.asServiceRole.entities.User.filter({ county_id: campaign.audience_filter_id, staff_type: 'none' });
      recipientPhones = users.filter(u => u.phone).map(u => sanitizePhoneNumber(u.phone)).filter(Boolean);
    } else if (campaign.audience_type === 'by_sacco' && campaign.audience_filter_id) {
      const members = await base44.asServiceRole.entities.GroupMember.filter({ group_id: campaign.audience_filter_id });
      const userIds = [...new Set(members.map(m => m.user_id))];
      const users = await Promise.all(
        userIds.map(id => base44.asServiceRole.entities.User.get(id).catch(() => null))
      );
      recipientPhones = users.filter(u => u?.phone).map(u => sanitizePhoneNumber(u.phone)).filter(Boolean);
    } else if (campaign.audience_type === 'by_stage' && campaign.audience_filter_id) {
      const stage = await base44.asServiceRole.entities.Stage.get(campaign.audience_filter_id);
      const users = await base44.asServiceRole.entities.User.filter({ county_id: stage.county_id, staff_type: 'none' });
      recipientPhones = users.filter(u => u.phone).map(u => sanitizePhoneNumber(u.phone)).filter(Boolean);
    } else if (campaign.audience_type === 'by_sub_county' && campaign.audience_filter_id) {
      const wards = await base44.asServiceRole.entities.Ward.filter({ sub_county_id: campaign.audience_filter_id });
      const wardIds = wards.map(w => w.id);
      const vehicles = await base44.asServiceRole.entities.Vehicle.filter({});
      const vehiclesInWards = vehicles.filter(v => wardIds.includes(v.ward_id));
      const riderIds = [...new Set(vehiclesInWards.map(v => v.rider_id).filter(Boolean))];
      const users = await Promise.all(
        riderIds.map(id => base44.asServiceRole.entities.User.get(id).catch(() => null))
      );
      recipientPhones = users.filter(u => u?.phone).map(u => sanitizePhoneNumber(u.phone)).filter(Boolean);
    } else if (campaign.audience_type === 'by_ward' && campaign.audience_filter_id) {
      const vehicles = await base44.asServiceRole.entities.Vehicle.filter({ ward_id: campaign.audience_filter_id });
      const riderIds = [...new Set(vehicles.map(v => v.rider_id).filter(Boolean))];
      const users = await Promise.all(
        riderIds.map(id => base44.asServiceRole.entities.User.get(id).catch(() => null))
      );
      recipientPhones = users.filter(u => u?.phone).map(u => sanitizePhoneNumber(u.phone)).filter(Boolean);
    }

    let sentCount = 0;
    let failedCount = 0;
    let batchesProcessed = 0;

    const { username, apiKey, baseUrl } = getAtCredentials();

    // Process in batches of 1000
    for (let i = 0; i < recipientPhones.length; i += 1000) {
      const batch = recipientPhones.slice(i, i + 1000);
      const toPhones = batch.join(',');

      try {
        const atResponse = await fetch(`${baseUrl}/version1/messaging`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'apiKey': apiKey,
          },
          body: new URLSearchParams({
            username: username,
            to: toPhones,
            message: campaign.message_body,
          }).toString(),
        });

        const atData = await atResponse.json();
        if (atData.SMSMessageData?.Recipients) {
          for (const recipient of atData.SMSMessageData.Recipients) {
            const log = await base44.asServiceRole.entities.SmsLog.create({
              recipient_phone: recipient.number,
              message_body: campaign.message_body,
              event_type: 'bulk',
              at_message_id: recipient.messageId || '',
              status: recipient.statusCode === '101' ? 'delivered' : recipient.statusCode === '100' ? 'sent' : 'failed',
              metadata_json: JSON.stringify({ campaign_id: campaignId }),
            });
            if (log.status === 'delivered' || log.status === 'sent') {
              sentCount++;
            } else {
              failedCount++;
            }
          }
        }
      } catch (e) {
        failedCount += batch.length;
        console.error('Batch send failed:', e.message);
      }

      batchesProcessed++;
      // Update campaign progress
      await base44.asServiceRole.entities.SmsCampaign.update(campaignId, {
        batches_processed: batchesProcessed,
        sent_count: sentCount,
        failed_count: failedCount,
        status: batchesProcessed === campaign.batch_count ? 'completed' : 'processing',
        completed_at: batchesProcessed === campaign.batch_count ? new Date().toISOString() : null,
      });
    }

    return Response.json({ campaignId, sentCount, failedCount, batchesProcessed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});