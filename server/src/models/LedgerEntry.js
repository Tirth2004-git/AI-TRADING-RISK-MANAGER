import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    type: { type: String, required: true, enum: ['DEPOSIT', 'WITHDRAWAL'] },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true, default: Date.now },
    note: { type: String, default: '', maxlength: 500 },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ date: 1 });

const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
export default LedgerEntry;
