import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    qrToken: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    assetCode: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['Laptop', 'Vehicle', 'Tool', 'Furniture', 'Equipment'],
      required: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    serialNumber: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['Available', 'Assigned', 'In Repair', 'Retired', 'Lost'],
      default: 'Available',
      required: true
    },
    assignedEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    assignedLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null
    },
    isPublicVisible: {
      type: Boolean,
      default: true
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        if (ret.assignedEmployeeId) {
          ret.assignedEmployeeId = ret.assignedEmployeeId.toString();
        }
        if (ret.assignedLocationId) {
          ret.assignedLocationId = ret.assignedLocationId.toString();
        }
        delete ret._id;
        delete ret.__v;
        delete ret.tenantId; // tenantId is never returned
        return ret;
      }
    }
  }
);

// Indexes per spec
assetSchema.index({ qrToken: 1 }, { unique: true });
assetSchema.index({ tenantId: 1, assetCode: 1 }, { unique: true });
assetSchema.index({ tenantId: 1, status: 1 });
assetSchema.index({ tenantId: 1, category: 1 });
assetSchema.index({ tenantId: 1, assignedEmployeeId: 1 });
assetSchema.index({ tenantId: 1, assignedLocationId: 1 });

export const Asset = mongoose.model('Asset', assetSchema);
