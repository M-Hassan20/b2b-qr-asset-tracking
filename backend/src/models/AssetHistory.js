import mongoose from 'mongoose';

const assetHistorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true
    },
    eventType: {
      type: String,
      enum: [
        'Created',
        'StatusChange',
        'AssignedToEmployee',
        'AssignedToLocation',
        'Unassigned',
        'Updated'
      ],
      required: true
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    note: {
      type: String,
      default: null,
      maxlength: 500
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only, no update timestamp
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.assetId = ret.assetId.toString();
        ret.performedBy = ret.performedBy.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.tenantId; // tenantId is never returned
        return ret;
      }
    }
  }
);

// Indexes per spec
assetHistorySchema.index({ tenantId: 1, assetId: 1, createdAt: -1 });
assetHistorySchema.index({ tenantId: 1, createdAt: -1 });

export const AssetHistory = mongoose.model('AssetHistory', assetHistorySchema);
