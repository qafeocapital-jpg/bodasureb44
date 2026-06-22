import { base44 } from '@/api/base44Client';

/**
 * Write an audit log entry for a key action.
 * Silent fail — audit logging should not break the main operation.
 *
 * @param {Object} params
 * @param {string} params.userId - The user performing the action
 * @param {string} params.action - Action identifier (e.g. 'kyc_approved', 'county_live')
 * @param {string} [params.entityType] - Entity type being acted on
 * @param {string} [params.entityId] - Entity ID being acted on
 * @param {string} [params.description] - Human-readable description
 * @param {Object} [params.oldValues] - Previous values (for updates)
 * @param {Object} [params.newValues] - New values (for updates)
 */
export async function auditLog({ userId, action, entityType, entityId, description, oldValues, newValues }) {
  try {
    await base44.entities.AuditLog.create({
      user_id: userId || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      description: description || '',
      old_values: oldValues || null,
      new_values: newValues || null,
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}