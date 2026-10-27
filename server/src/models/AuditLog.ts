import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId | null;
  action: string;
  role: string;
  ip: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      default: 'anonymous',
      trim: true,
    },
    ip: {
      type: String,
      default: 'unknown',
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    // Append-only: disable updatedAt timestamp
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// Enforce append-only invariant at Mongoose middleware level
const preventMutation = function (this: unknown) {
  throw new Error('AuditLog is append-only. Updates and deletions are strictly prohibited.');
};

auditLogSchema.pre('updateOne', preventMutation);
auditLogSchema.pre('updateMany', preventMutation);
auditLogSchema.pre('findOneAndUpdate', preventMutation);
auditLogSchema.pre('findOneAndReplace', preventMutation);
auditLogSchema.pre('deleteOne', preventMutation);
auditLogSchema.pre('deleteMany', preventMutation);
auditLogSchema.pre('findOneAndDelete', preventMutation);

// Indexes for audit trails
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ actorId: 1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
