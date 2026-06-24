/**
 * SMS template variable replacement utility.
 * Used when sending transactional SMS in event handlers.
 */

export async function getSmsTemplate(base44, templateKey, variables = {}) {
  try {
    const templates = await base44.asServiceRole.entities.SmsTemplate.filter({
      template_key: templateKey,
      is_active: true,
    });

    if (templates.length === 0) return null;

    let body = templates[0].body;
    // Replace {variable} placeholders with values
    Object.entries(variables).forEach(([key, value]) => {
      body = body.replace(`{${key}}`, String(value));
    });

    return body;
  } catch (e) {
    console.error('Failed to get SMS template:', e);
    return null;
  }
}

/**
 * Call sendSms backend function with a template.
 */
export async function sendTransactionalSms(
  base44,
  phone,
  templateKey,
  eventType,
  variables = {},
  userId = null,
  metadata = {}
) {
  try {
    const body = await getSmsTemplate(base44, templateKey, variables);
    if (!body) {
      console.warn(`No SMS template found for key: ${templateKey}`);
      return null;
    }

    const result = await base44.functions.invoke('sendSms', {
      phone,
      message: body,
      templateKey,
      eventType,
      metadata: { ...metadata, ...variables },
    });

    return result.data;
  } catch (e) {
    console.error('Failed to send transactional SMS:', e);
    return null;
  }
}