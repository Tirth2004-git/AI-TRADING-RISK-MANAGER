import mongoose from 'mongoose';
import { TRADE_SIDES, TRADE_STATUSES } from '../risk/constants.js';

const scoreFactorSchema = new mongoose.Schema(
  {
    factor: { type: String, required: true },
    points: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const exitSchema = new mongoose.Schema(
  {
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    fundingPaid: { type: Number, default: 0 },
    pnl: { type: Number, required: true },
    time: { type: Date, default: Date.now },
  },
  { _id: false }
);

const stopHistorySchema = new mongoose.Schema(
  {
    from: { type: Number, default: null },
    to: { type: Number, required: true },
    reason: { type: String, default: '' },
    time: { type: Date, default: Date.now },
  },
  { _id: false }
);

const metricsSchema = new mongoose.Schema(
  {
    balance: Number,
    riskBudget: Number,
    effectiveRiskPct: Number,
    stopDistance: { type: Number, default: null },
    quantity: Number,
    notional: Number,
    margin: Number,
    liquidation: Number,
    liquidationDistancePct: Number,
    stopBeyondLiquidation: Boolean,
    amountAtRisk: Number,
    amountAtRiskPct: Number,
    potentialReward: { type: Number, default: null },
    netReward: { type: Number, default: null },
    riskReward: { type: Number, default: null },
    netRiskReward: { type: Number, default: null },
    breakEven: { type: Number, default: null },
    entryFee: { type: Number, default: 0 },
    fundingCost: { type: Number, default: 0 },
    estimatedExitCost: { type: Number, default: 0 },
    hasStop: Boolean,
    hasTarget: Boolean,
  },
  { _id: false }
);

const tradeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    symbol: { type: String, required: true, trim: true, uppercase: true },
    side: { type: String, required: true, enum: Object.values(TRADE_SIDES) },
    entry: { type: Number, required: true },
    stopLoss: { type: Number, default: null },
    initialStop: { type: Number, default: null },
    stopHistory: { type: [stopHistorySchema], default: [] },
    target: { type: Number, default: null },
    leverage: { type: Number, required: true, min: 1, max: 125 },
    quantity: { type: Number, required: true },
    initialQuantity: { type: Number, default: null },
    remainingQuantity: { type: Number, default: null },
    fundingRatePct: { type: Number, default: 0 },
    fundingIntervals: { type: Number, default: 0 },
    markPrice: { type: Number, default: null },
    markUpdatedAt: { type: Date, default: null },
    exits: { type: [exitSchema], default: [] },
    status: {
      type: String,
      required: true,
      enum: Object.values(TRADE_STATUSES),
      default: TRADE_STATUSES.OPEN,
    },
    exitPrice: { type: Number, default: null },
    fees: { type: Number, default: 0, min: 0 },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 2000 },
    overrideReason: { type: String, default: '' },
    setupTag: { type: String, default: '', trim: true, maxlength: 50 },
    emotionTag: { type: String, default: '', trim: true, maxlength: 50 },
    followedPlan: { type: Boolean, default: null },
    lesson: { type: String, default: '', maxlength: 1000 },
    metrics: { type: metricsSchema, required: true },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskBand: { type: String, required: true },
    scoreBreakdown: { type: [scoreFactorSchema], default: [] },
    warnings: { type: [String], default: [] },
    realizedPnl: { type: Number, default: null },
    rMultiple: { type: Number, default: null },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

tradeSchema.index({ userId: 1, status: 1, openedAt: -1 });
tradeSchema.index({ userId: 1, status: 1, closedAt: -1 });
tradeSchema.index({ status: 1, openedAt: -1 });
tradeSchema.index({ status: 1, closedAt: 1 });
tradeSchema.index({ status: 1, symbol: 1, closedAt: -1 });

const Trade = mongoose.model('Trade', tradeSchema);
export default Trade;
