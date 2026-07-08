import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { name, county, role, phone, email } = body;

    if (!name || !county || !role || !phone || !email) {
      return Response.json({ error: 'All fields are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const demoRequest = await base44.asServiceRole.entities.DemoRequest.create({
      name: String(name).slice(0, 200),
      county: String(county).slice(0, 200),
      role: String(role).slice(0, 200),
      phone: String(phone).slice(0, 50),
      email: String(email).slice(0, 200),
      status: 'pending',
    });

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'hello@bodasure.co.ke',
        subject: `New Callback Request: ${name} (${county})`,
        body: [
          'New callback request received:',
          '',
          `Name: ${name}`,
          `County: ${county}`,
          `Role: ${role}`,
          `Phone: ${phone}`,
          `Email: ${email}`,
          '',
          'Please call them back within 48 hours.',
        ].join('\n'),
      });
    } catch (emailErr) {
      console.error('Email notification failed:', emailErr.message);
    }

    return Response.json({ success: true, id: demoRequest.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});