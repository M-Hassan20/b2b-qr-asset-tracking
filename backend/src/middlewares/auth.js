import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';
import { Tenant } from '../models/Tenant.js';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required.'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid JWT'));
  }

  const secret = process.env.JWT_SECRET || 'vision71_super_secret_jwt_key_asset_tracking_2026';

  try {
    const payload = jwt.verify(token, secret);
    const { sub: userId, tenantId, role } = payload;

    if (!userId || !tenantId || !role) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid JWT'));
    }

    // EC 12: Verify tenant exists and is active
    const tenant = await Tenant.findById(tenantId);
    if (!tenant || !tenant.isActive) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Organization account is inactive.'));
    }

    // Attach to req.user for downstream tenant isolation
    req.user = {
      userId,
      tenantId: tenantId.toString(),
      role
    };

    next();
  } catch (error) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid JWT'));
  }
};
