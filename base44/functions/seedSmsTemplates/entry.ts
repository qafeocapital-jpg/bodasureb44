import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role?.includes('admin') && user?.role !== 'super_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingCount = await base44.asServiceRole.entities.SmsTemplate.filter({});
    if (existingCount.length > 0) {
      return Response.json({ message: 'Templates already exist', skipped: true });
    }

    const templates = [
      {
        template_key: 'otp',
        name: 'OTP Verification',
        body: 'Your BodaSure OTP is {code}. Valid for 5 minutes. Do not share.',
        event_type: 'otp',
        is_system: true,
      },
      {
        template_key: 'deposit',
        name: 'Wallet Deposit',
        body: 'You have deposited KES {amount} to your BodaSure Wallet. New balance: KES {balance}. Reference: {reference}',
        event_type: 'deposit',
        is_system: true,
      },
      {
        template_key: 'withdrawal',
        name: 'Wallet Withdrawal',
        body: 'You have withdrawn KES {amount} from your BodaSure Wallet. New balance: KES {balance}. Reference: {reference}',
        event_type: 'withdrawal',
        is_system: true,
      },
      {
        template_key: 'permit_receipt',
        name: 'Permit Receipt',
        body: 'Permit issued for {plate_number}. Valid until {expiry_date}. Amount: KES {amount}. Reference: {reference}',
        event_type: 'permit_receipt',
        is_system: true,
      },
      {
        template_key: 'p2p_send',
        name: 'P2P Payment Sent',
        body: 'You sent KES {amount} to {recipient}. Reference: {reference}. Your balance: KES {balance}',
        event_type: 'p2p_send',
        is_system: true,
      },
      {
        template_key: 'kyc_approved',
        name: 'KYC Approved',
        body: 'Congratulations! Your KYC verification has been approved. Your BodaSure Wallet is now fully activated. Enjoy seamless transactions.',
        event_type: 'kyc_approved',
        is_system: true,
      },
      {
        template_key: 'kyc_rejected',
        name: 'KYC Rejected',
        body: 'Your KYC submission was not approved. Reason: {reason}. Please resubmit or contact support for assistance.',
        event_type: 'kyc_rejected',
        is_system: true,
      },
      {
        template_key: 'bulk_custom',
        name: 'Custom Bulk Message',
        body: 'Custom message body — customize this template for bulk campaigns.',
        event_type: 'bulk_custom',
        is_system: true,
      },
    ];

    const created = await base44.asServiceRole.entities.SmsTemplate.bulkCreate(templates);
    return Response.json({ created: created.length, message: 'Templates seeded successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});