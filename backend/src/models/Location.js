import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['site', 'building', 'zone', 'room', 'other'],
      required: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.tenantId; // tenantId is never returned
        return ret;
      }
    }
  }
);

// Indexes per spec
locationSchema.index({ tenantId: 1, type: 1 });

export const Location = mongoose.model('Location', locationSchema);
