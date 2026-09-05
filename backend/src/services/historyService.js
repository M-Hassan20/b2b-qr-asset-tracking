import { AssetHistory } from '../models/AssetHistory.js';

export class HistoryService {
  /**
   * Appends an immutable history log.
   * Per spec, no update or delete operations are ever allowed.
   */
  static async record({
    tenantId,
    assetId,
    eventType,
    previousValue = {},
    newValue = {},
    performedBy,
    note = null
  }) {
    const historyEntry = new AssetHistory({
      tenantId,
      assetId,
      eventType,
      previousValue,
      newValue,
      performedBy,
      note
    });

    return await historyEntry.save();
  }

  /**
   * Fetches paginated history for an asset, newest first
   */
  static async getHistory(tenantId, assetId, { page = 1, limit = 20, eventType } = {}) {
    const query = { tenantId, assetId };
    if (eventType) {
      query.eventType = eventType;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      AssetHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      AssetHistory.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit) || 0;

    return {
      data: data.map((doc) => doc.toJSON()),
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }
}
