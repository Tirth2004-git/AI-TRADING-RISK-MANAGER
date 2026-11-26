import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, default: null },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
    time: { type: Date, required: true, default: Date.now },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: false }
);

auditLogSchema.index({ time: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
