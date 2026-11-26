import Settings from '../models/Settings.js';
import { DEFAULT_SETTINGS } from '../risk/constants.js';
import { getOwnerFields, scopeQuery } from '../utils/scopeQuery.js';
import { logAudit } from './audit.service.js';

export async function getSettings(auth) {
  if (auth?.isDemo) {
    let demoSettings = await Settings.findOne({ userId: null }).lean();
    if (!demoSettings) {
      demoSettings = { ...DEFAULT_SETTINGS, userId: null };
    }
    return demoSettings;
  }

  let settings = await Settings.findOne(scopeQuery(auth)).lean();
  if (!settings) {
    const created = await Settings.create({
      ...DEFAULT_SETTINGS,
      userId: auth.userId,
    });
    settings = created.toObject();
  }
  return settings;
}

export async function updateSettings(auth, data) {
  const existing = await Settings.findOne(scopeQuery(auth));
  if (!existing) {
    const created = await Settings.create({
      ...DEFAULT_SETTINGS,
      ...data,
      userId: auth.userId,
    });
    await logAudit(auth, {
      action: 'SETTINGS_UPDATE',
      entity: 'Settings',
      entityId: created._id,
      after: created.toObject(),
    });
    return created.toObject();
  }

  const before = existing.toObject();
  Object.assign(existing, data);
  await existing.save();
  const after = existing.toObject();

  await logAudit(auth, {
    action: 'SETTINGS_UPDATE',
    entity: 'Settings',
    entityId: existing._id,
    before,
    after,
    ...getOwnerFields(auth),
  });

  return after;
}
