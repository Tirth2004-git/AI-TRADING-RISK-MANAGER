import { connectDB, disconnectDB } from '../src/config/db.js';
import Trade from '../src/models/Trade.js';
import { TRADE_STATUSES } from '../src/risk/constants.js';

export async function migrateDatabase() {
  const trades = await Trade.find();
  let migratedClosed = 0;
  let migratedOpen = 0;

  for (const trade of trades) {
    let changed = false;

    if (trade.initialQuantity === null || trade.initialQuantity === undefined) {
      trade.initialQuantity = trade.quantity;
      changed = true;
    }

    if (trade.initialStop === null && trade.stopLoss !== null) {
      trade.initialStop = trade.stopLoss;
      changed = true;
    }

    if (trade.status === TRADE_STATUSES.CLOSED) {
      if (!Array.isArray(trade.exits) || trade.exits.length === 0) {
        trade.exits = [
          {
            quantity: trade.quantity,
            price: trade.exitPrice ?? trade.entry,
            fee: trade.fees ?? 0,
            fundingPaid: 0,
            pnl: trade.realizedPnl ?? 0,
            time: trade.closedAt ?? trade.updatedAt ?? new Date(),
          },
        ];
        trade.remainingQuantity = 0;
        changed = true;
        migratedClosed += 1;
      } else if (trade.remainingQuantity === null || trade.remainingQuantity === undefined) {
        trade.remainingQuantity = 0;
        changed = true;
      }
    } else if (trade.status === TRADE_STATUSES.OPEN) {
      if (trade.remainingQuantity === null || trade.remainingQuantity === undefined) {
        const exitedQty = (trade.exits || []).reduce((sum, ex) => sum + ex.quantity, 0);
        trade.remainingQuantity = Math.max(0, trade.quantity - exitedQty);
        changed = true;
        migratedOpen += 1;
      }
    }

    if (changed) {
      await trade.save();
    }
  }

  return { migratedClosed, migratedOpen, totalScanned: trades.length };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('migrate.js')) {
  connectDB()
    .then(async () => {
      const result = await migrateDatabase();
      console.log('Migration complete:', result);
      await disconnectDB();
    })
    .catch(async (err) => {
      console.error('Migration failed:', err);
      await disconnectDB();
      process.exit(1);
    });
}
