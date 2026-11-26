import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Settings from '../src/models/Settings.js';
import SymbolProfile from '../src/models/SymbolProfile.js';
import Trade from '../src/models/Trade.js';
import LedgerEntry from '../src/models/LedgerEntry.js';
import AuditLog from '../src/models/AuditLog.js';
import AiReview from '../src/models/AiReview.js';

async function runAuthMigration() {
  await connectDB();

  // Sync updated compound indexes (e.g. SymbolProfile { userId, symbol })
  await Promise.all([
    Settings.syncIndexes(),
    SymbolProfile.syncIndexes(),
    Trade.syncIndexes(),
    LedgerEntry.syncIndexes(),
    AuditLog.syncIndexes(),
    AiReview.syncIndexes(),
  ]);

  const unownedFilter = { userId: null, isDemo: { $ne: true } };
  const unownedTrades = await Trade.countDocuments(unownedFilter);
  const unownedLedger = await LedgerEntry.countDocuments(unownedFilter);
  const unownedSymbols = await SymbolProfile.countDocuments(unownedFilter);

  if (unownedTrades === 0 && unownedLedger === 0 && unownedSymbols === 0) {
    console.log('No unowned legacy non-demo records found. Indexes synced cleanly.');
    await disconnectDB();
    return;
  }

  const ownerArg = process.argv.find((arg) => arg.startsWith('--owner-email='));
  if (!ownerArg) {
    console.log(
      `Found unowned legacy records (trades: ${unownedTrades}, ledger: ${unownedLedger}, symbols: ${unownedSymbols}).`
    );
    console.log(
      'Refusing to assign automatically. Re-run with --owner-email=<registered-email> to assign them safely.'
    );
    await disconnectDB();
    return;
  }

  const ownerEmail = ownerArg.split('=')[1]?.trim().toLowerCase();
  const owner = await User.findOne({ email: ownerEmail }).lean();
  if (!owner) {
    throw new Error(`Owner user not found for email: ${ownerEmail}`);
  }

  const [tRes, lRes, sRes, aRes, aiRes, setRes] = await Promise.all([
    Trade.updateMany(unownedFilter, { $set: { userId: owner._id, isDemo: false } }),
    LedgerEntry.updateMany(unownedFilter, { $set: { userId: owner._id, isDemo: false } }),
    SymbolProfile.updateMany(unownedFilter, { $set: { userId: owner._id, isDemo: false } }),
    AuditLog.updateMany(unownedFilter, { $set: { userId: owner._id, isDemo: false } }),
    AiReview.updateMany(unownedFilter, { $set: { userId: owner._id, isDemo: false } }),
    Settings.updateMany({ userId: null }, { $set: { userId: owner._id } }),
  ]);

  console.log('Legacy records assigned safely to', ownerEmail, {
    trades: tRes.modifiedCount,
    ledger: lRes.modifiedCount,
    symbols: sRes.modifiedCount,
    audit: aRes.modifiedCount,
    aiReviews: aiRes.modifiedCount,
    settings: setRes.modifiedCount,
  });

  await disconnectDB();
}

runAuthMigration().catch(async (err) => {
  console.error('Auth migration failed:', err.message);
  await disconnectDB();
  process.exit(1);
});
