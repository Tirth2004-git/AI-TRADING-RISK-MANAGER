/**
 * Build ownership-scoped MongoDB filter from validated req.auth.
 * Never trusts userId from request bodies or query parameters.
 */
export function scopeQuery(auth, extra = {}) {
  if (auth?.isDemo) {
    return { isDemo: true, ...extra };
  }
  return {
    userId: auth.userId,
    isDemo: { $ne: true },
    ...extra,
  };
}

export function getOwnerFields(auth) {
  if (auth?.isDemo) {
    return { userId: null, isDemo: true };
  }
  return { userId: auth.userId, isDemo: false };
}
