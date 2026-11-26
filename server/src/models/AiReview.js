import mongoose from 'mongoose';

const aiReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    type: { type: String, required: true, enum: ['TRADE', 'PORTFOLIO', 'WEEKLY'] },
    tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', default: null },
    inputHash: { type: String, required: true, index: true },
    response: {
      summary: { type: String, required: true },
      weaknesses: { type: [String], default: [] },
      suggestions: { type: [String], default: [] },
      verdict: {
        type: String,
        required: true,
        enum: ['ACCEPTABLE', 'NEEDS_CHANGES', 'TOO_RISKY'],
      },
    },
    source: { type: String, required: true, enum: ['gemini', 'fallback'] },
    model: { type: String, required: true },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiReviewSchema.index({ type: 1, inputHash: 1, model: 1 });

const AiReview = mongoose.model('AiReview', aiReviewSchema);
export default AiReview;
