import { Location } from '../models/Location.js';
import { ApiError } from '../middlewares/errorHandler.js';

export class LocationService {
  static async listLocations(tenantId, filters = {}) {
    const { page = 1, limit = 20, type, search } = filters;
    const query = { tenantId };

    if (type) query.type = type;
    if (search && search.trim() !== '') {
      query.name = new RegExp(search.trim(), 'i');
    }

    const skip = (page - 1) * limit;

    const [locations, total] = await Promise.all([
      Location.find(query).sort({ name: 1 }).skip(skip).limit(limit).exec(),
      Location.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit) || 0;

    return {
      data: locations.map((loc) => loc.toJSON()),
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async getLocationById(tenantId, locationId) {
    const location = await Location.findOne({ _id: locationId, tenantId });
    if (!location) {
      throw new ApiError(404, 'NOT_FOUND', 'Location not found within tenant');
    }
    return location.toJSON();
  }
}
