import Trade from '../models/Trade.js';
import { analyzeBehaviour } from '../risk/behaviour.risk.js';
import { scopeQuery } from '../utils/scopeQuery.js';
import { getSettings } from './settings.service.js';

export async function getBehaviourAnalytics(auth) {
  const [settings, trades] = await Promise.all([
    getSettings(auth),
    Trade.find(scopeQuery(auth)).sort({ openedAt: -1 }).lean(),
  ]);

  return analyzeBehaviour(trades, settings);
}
