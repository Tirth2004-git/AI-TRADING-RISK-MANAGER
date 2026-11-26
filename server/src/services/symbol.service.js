import SymbolProfile from '../models/SymbolProfile.js';
import ApiError from '../utils/ApiError.js';
import { getOwnerFields, scopeQuery } from '../utils/scopeQuery.js';

export async function listSymbols(auth) {
  return SymbolProfile.find(scopeQuery(auth)).sort({ symbol: 1 }).lean();
}

export async function getSymbolByCode(auth, symbol) {
  if (!symbol) return null;
  return SymbolProfile.findOne(
    scopeQuery(auth, { symbol: symbol.trim().toUpperCase() })
  ).lean();
}

export async function createSymbol(auth, data) {
  const existing = await SymbolProfile.findOne(
    scopeQuery(auth, { symbol: data.symbol })
  ).lean();
  if (existing) {
    throw new ApiError(409, `Symbol profile for ${data.symbol} already exists`);
  }
  const created = await SymbolProfile.create({
    ...data,
    ...getOwnerFields(auth),
    correlationGroup: data.correlationGroup || data.symbol,
  });
  return created.toObject();
}

export async function updateSymbol(auth, id, data) {
  const profile = await SymbolProfile.findOne(scopeQuery(auth, { _id: id }));
  if (!profile) {
    throw new ApiError(404, 'Symbol profile not found');
  }

  if (data.symbol && data.symbol !== profile.symbol) {
    const conflict = await SymbolProfile.findOne(
      scopeQuery(auth, { symbol: data.symbol })
    ).lean();
    if (conflict) {
      throw new ApiError(409, `Symbol profile for ${data.symbol} already exists`);
    }
  }

  Object.assign(profile, {
    ...data,
    correlationGroup: data.correlationGroup || data.symbol,
  });
  await profile.save();
  return profile.toObject();
}

export async function deleteSymbol(auth, id) {
  const deleted = await SymbolProfile.findOneAndDelete(
    scopeQuery(auth, { _id: id })
  ).lean();
  if (!deleted) {
    throw new ApiError(404, 'Symbol profile not found');
  }
  return deleted;
}
