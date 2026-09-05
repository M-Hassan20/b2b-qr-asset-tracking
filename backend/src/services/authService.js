import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { ApiError } from '../middlewares/errorHandler.js';

export class AuthService {
  static async login({ email, password }) {
    // 1. Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Prevent user enumeration: 401 for wrong email or wrong password
      throw new ApiError(401, 'UNAUTHORIZED', 'Email not found, wrong password, inactive tenant, or different tenant');
    }

    // 2. Verify tenant is active
    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || !tenant.isActive) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Organization account is inactive.');
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Email not found, wrong password, inactive tenant, or different tenant');
    }

    // 4. Generate JWT payload: { sub: userId, tenantId, role, iat, exp }
    const secret = process.env.JWT_SECRET || 'vision71_super_secret_jwt_key_asset_tracking_2026';
    const expiresIn = 86400; // 24 hours

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        tenantId: user.tenantId.toString(),
        role: user.role
      },
      secret,
      { expiresIn }
    );

    return {
      token,
      expiresIn,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }
}
