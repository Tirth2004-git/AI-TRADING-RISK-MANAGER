import mongoose from 'mongoose';

const symbolProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    maintenanceMarginPct: { type: Number, required: true, min: 0.01, max: 50 },
    maxLeverage: { type: Number, required: true, min: 1, max: 125 },
    qtyStep: { type: Number, default: null, min: 0.00000001 },
    minNotional: { type: Number, default: null, min: 0.01 },
    correlationGroup: { type: String, trim: true, uppercase: true, default: '' },
    beta: { type: Number, required: true, default: 1, min: 0 },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

symbolProfileSchema.pre('save', function setDefaultGroup() {
  if (!this.correlationGroup) {
    this.correlationGroup = this.symbol;
  }
});

symbolProfileSchema.index(
  { userId: 1, symbol: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
);

const SymbolProfile = mongoose.model('SymbolProfile', symbolProfileSchema);
export default SymbolProfile;
