import { Asset } from '../models/Asset.js';
import { Employee } from '../models/Employee.js';
import { Location } from '../models/Location.js';
import { QRService } from './qrService.js';
import { HistoryService } from './historyService.js';
import { ApiError } from '../middlewares/errorHandler.js';

export class AssetService {
  /**
   * Generates tenant-scoped sequential assetCode: AST0001, AST0002...
   */
  static async generateAssetCode(tenantId) {
    const assets = await Asset.find({ tenantId }).sort({ createdAt: -1 }).limit(100);
    let maxNum = 0;
    for (const a of assets) {
      const match = a.assetCode?.match(/^AST(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    return `AST${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Resolves public QR scan
   */
  static async resolvePublicScan(qrToken, tenantId) {
    if (!QRService.isValidToken(qrToken)) {
      throw new ApiError(404, 'NOT_FOUND', 'Asset not found.');
    }

    const asset = await Asset.findOne({ qrToken, tenantId });
    if (!asset || !asset.isPublicVisible) {
      throw new ApiError(404, 'NOT_FOUND', 'Asset not found.');
    }

    let assignedTo = null;
    if (asset.assignedEmployeeId) {
      const employee = await Employee.findOne({ _id: asset.assignedEmployeeId, tenantId });
      if (employee) {
        assignedTo = {
          type: 'employee',
          displayName: employee.name,
          title: employee.title
        };
      }
    } else if (asset.assignedLocationId) {
      const location = await Location.findOne({ _id: asset.assignedLocationId, tenantId });
      if (location) {
        assignedTo = {
          type: 'location',
          name: location.name,
          locationTyp: location.type
        };
      }
    }

    return {
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      description: asset.description,
      status: asset.status,
      assignedTo
    };
  }

  /**
   * Returns paginated asset list for tenant
   */
  static async listAssets(tenantId, filters = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      assignedEmployeeId,
      assignedLocationId,
      search,
      isPublicVisible
    } = filters;

    const query = { tenantId };

    if (status) query.status = status;
    if (category) query.category = category;
    if (assignedEmployeeId) query.assignedEmployeeId = assignedEmployeeId;
    if (assignedLocationId) query.assignedLocationId = assignedLocationId;
    if (typeof isPublicVisible === 'boolean') query.isPublicVisible = isPublicVisible;

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { assetCode: regex },
        { serialNumber: regex }
      ];
    }

    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      Asset.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Asset.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit) || 0;

    return {
      data: assets.map((a) => a.toJSON()),
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Returns single asset by ID for tenant with optional QR Image
   */
  static async getAssetById(tenantId, assetId, { host = 'localhost:5173', includeQrImage = false } = {}) {
    const asset = await Asset.findOne({ _id: assetId, tenantId });
    if (!asset) {
      throw new ApiError(404, 'NOT_FOUND', 'Asset does not exist within the caller\'s tenant');
    }

    const json = asset.toJSON();
    const scanUrl = QRService.buildScanUrl(host, asset.qrToken, tenantId);
    json.qrToken = asset.qrToken;
    json.qrCodeUrl = scanUrl;

    if (includeQrImage) {
      json.qrCodeImageBase64 = await QRService.generateQrImageDataUrl(scanUrl);
    }

    return json;
  }

  /**
   * Creates a new asset
   */
  static async createAsset(tenantId, userId, assetData, host = 'localhost:5173') {
    let assetCode = assetData.assetCode;
    if (assetCode) {
      const existing = await Asset.findOne({ tenantId, assetCode });
      if (existing) {
        throw new ApiError(409, 'CONFLICT', `An asset with code '${assetCode}' already exists in this organization.`);
      }
    } else {
      assetCode = await this.generateAssetCode(tenantId);
    }

    const qrToken = QRService.generateToken();

    const asset = new Asset({
      tenantId,
      assetCode,
      name: assetData.name,
      category: assetData.category,
      description: assetData.description || '',
      serialNumber: assetData.serialNumber || '',
      isPublicVisible: assetData.isPublicVisible !== undefined ? assetData.isPublicVisible : true,
      status: 'Available',
      assignedEmployeeId: null,
      assignedLocationId: null,
      qrToken
    });

    await asset.save();

    // Record 'Created' history event
    await HistoryService.record({
      tenantId,
      assetId: asset._id,
      eventType: 'Created',
      previousValue: {},
      newValue: {
        assetCode: asset.assetCode,
        name: asset.name,
        status: asset.status
      },
      performedBy: userId,
      note: null
    });

    return await this.getAssetById(tenantId, asset._id, { host, includeQrImage: true });
  }

  /**
   * Updates asset metadata (PATCH)
   */
  static async updateMetadata(tenantId, userId, assetId, updateData, host = 'localhost:5173') {
    const asset = await Asset.findOne({ _id: assetId, tenantId });
    if (!asset) {
      throw new ApiError(404, 'NOT_FOUND', 'Asset does not exist within tenant');
    }

    const previousValue = {};
    const newValue = {};

    ['name', 'category', 'description', 'serialNumber', 'isPublicVisible'].forEach((field) => {
      if (updateData[field] !== undefined && updateData[field] !== asset[field]) {
        previousValue[field] = asset[field];
        newValue[field] = updateData[field];
        asset[field] = updateData[field];
      }
    });

    if (Object.keys(newValue).length === 0) {
      return await this.getAssetById(tenantId, asset._id, { host, includeQrImage: true });
    }

    await asset.save();

    await HistoryService.record({
      tenantId,
      assetId: asset._id,
      eventType: 'Updated',
      previousValue,
      newValue,
      performedBy: userId,
      note: null
    });

    return await this.getAssetById(tenantId, asset._id, { host, includeQrImage: true });
  }

  /**
   * Assigns asset to employee or location
   */
  static async assignAsset(tenantId, userId, assetId, { employeeId, locationId, note }, host = 'localhost:5173') {
    const asset = await Asset.findOne({ _id: assetId, tenantId });
    if (!asset) {
      throw new ApiError(404, 'NOT_FOUND', 'Asset, employee, or location not found');
    }

    // EC 07: Retired asset check
    if (asset.status === 'Retired') {
      throw new ApiError(409, 'CONFLICT', 'Retired assets cannot be modified.');
    }

    // Check if already assigned to the exact same target
    const currentEmpId = asset.assignedEmployeeId ? asset.assignedEmployeeId.toString() : null;
    const currentLocId = asset.assignedLocationId ? asset.assignedLocationId.toString() : null;

    if (employeeId && currentEmpId === employeeId) {
      throw new ApiError(409, 'CONFLICT', 'Asset is already assigned to this employee.');
    }
    if (locationId && currentLocId === locationId) {
      throw new ApiError(409, 'CONFLICT', 'Asset is already assigned to this location.');
    }

    const previousValue = {
      assignedEmployeeId: currentEmpId,
      assignedLocationId: currentLocId
    };

    let eventType = '';
    const newValue = {};

    if (employeeId) {
      const employee = await Employee.findOne({ _id: employeeId, tenantId });
      if (!employee) {
        throw new ApiError(404, 'NOT_FOUND', 'Asset, employee, or location not found');
      }
      if (employee.status === 'inactive') {
        throw new ApiError(409, 'CONFLICT', 'Cannot assign to an inactive employee.');
      }
      asset.assignedEmployeeId = employee._id;
      asset.assignedLocationId = null;
      asset.status = 'Assigned';
      eventType = 'AssignedToEmployee';
      newValue.assignedEmployeeId = employee._id.toString();
      newValue.assignedLocationId = null;
    } else if (locationId) {
      const location = await Location.findOne({ _id: locationId, tenantId });
      if (!location) {
        throw new ApiError(404, 'NOT_FOUND', 'Asset, employee, or location not found');
      }
      asset.assignedLocationId = location._id;
      asset.assignedEmployeeId = null;
      asset.status = 'Assigned';
      eventType = 'AssignedToLocation';
      newValue.assignedEmployeeId = null;
      newValue.assignedLocationId = location._id.toString();
    }

    await asset.save();

    await HistoryService.record({
      tenantId,
      assetId: asset._id,
      eventType,
      previousValue,
      newValue,
      performedBy: userId,
      note: note || null
    });

    return await this.getAssetById(tenantId, asset._id, { host, includeQrImage: true });
  }

  /**
   * Unassigns asset
   */
  static async unassignAsset(tenantId, userId, assetId, note, host = 'localhost:5173') {
    const asset = await Asset.findOne({ _id: assetId, tenantId });
    if (!asset) {
      throw new ApiError(404, 'NOT_FOUND', 'Asset not found within tenant');
    }

    if (asset.status === 'Retired') {
      throw new ApiError(409, 'CONFLICT', 'Retired assets cannot be modified.');
    }

    // Idempotent: If already unassigned, return 200 without writing history
    if (!asset.assignedEmployeeId && !asset.assignedLocationId) {
      return await this.getAssetById(tenantId, asset._id, { host, includeQrImage: true });
    }

    const previousValue = {
      assignedEmployeeId: asset.assignedEmployeeId ? asset.assignedEmployeeId.toString() : null,
      assignedLocationId: asset.assignedLocationId ? asset.assignedLocationId.toString() : null
    };

    asset.assignedEmployeeId = null;
    asset.assignedLocationId = null;
    // Set status to Available if currently Assigned
    if (asset.status === 'Assigned') {
      asset.status = 'Available';
    }

    await asset.save();

    await HistoryService.record({
      tenantId,
      assetId: asset._id,
      eventType: 'Unassigned',
      previousValue,
      newValue: {
        assignedEmployeeId: null,
        assignedLocationId: null
      },
      performedBy: userId,
      note: note || null
    });

    return await this.getAssetById(tenantId, asset._id, { host, includeQrImage: true });
  }

  /**
   * Changes status with state machine validation
   */
  static async changeStatus(tenantId, userId, assetId, newStatus, note, host = 'localhost:5173') {
    const asset = await Asset.findOne({ _id: assetId, tenantId });
    if (!asset) {
      throw new ApiError(404, 'NOT_FOUND', 'Asset not found within tenant');
    }

    if (asset.status === 'Retired') {
      throw new ApiError(409, 'CONFLICT', 'Retired assets cannot be modified.');
    }

    if (newStatus === 'Available' && (asset.assignedEmployeeId || asset.assignedLocationId)) {
      throw new ApiError(409, 'CONFLICT', 'Cannot set status to Available while asset is assigned. Unassign the asset first.');
    }

    if (newStatus === 'Assigned' && !asset.assignedEmployeeId && !asset.assignedLocationId) {
      throw new ApiError(409, 'CONFLICT', 'Setting Assigned requires an employee or location assignment.');
    }

    const previousStatus = asset.status;
    asset.status = newStatus;
    await asset.save();

    await HistoryService.record({
      tenantId,
      assetId: asset._id,
      eventType: 'StatusChange',
      previousValue: { status: previousStatus },
      newValue: { status: newStatus },
      performedBy: userId,
      note: note || null
    });

    return await this.getAssetById(tenantId, asset._id, { host, includeQrImage: true });
  }

  /**
   * Regenerates QR token
   */
  static async regenerateQr(tenantId, userId, assetId, host = 'localhost:5173') {
    const asset = await Asset.findOne({ _id: assetId, tenantId });
    if (!asset) {
      throw new ApiError(404, 'NOT_FOUND', 'Asset not found within tenant');
    }

    const oldToken = asset.qrToken;
    const newToken = QRService.generateToken();

    asset.qrToken = newToken;
    await asset.save();

    await HistoryService.record({
      tenantId,
      assetId: asset._id,
      eventType: 'Updated',
      previousValue: { qrToken: oldToken },
      newValue: { qrToken: newToken },
      performedBy: userId,
      note: 'QR code regenerated'
    });

    const scanUrl = QRService.buildScanUrl(host, newToken, tenantId);
    const qrImage = await QRService.generateQrImageDataUrl(scanUrl);

    return {
      id: asset._id.toString(),
      assetCode: asset.assetCode,
      qrToken: newToken,
      qrCodeUrl: scanUrl,
      qrCodeImageBase64: qrImage,
      updatedAt: asset.updatedAt.toISOString()
    };
  }
}
