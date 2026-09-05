import { Router } from 'express';
import { AssetService } from '../services/assetService.js';
import { ApiError } from '../middlewares/errorHandler.js';

const router = Router();

// GET /api/public/scan/:qrToken
router.get('/scan/:qrToken', async (req, res, next) => {
  try {
    const { qrToken } = req.params;
    const tenantId = req.query.t || req.query.tenantId;

    if (!tenantId) {
      return next(new ApiError(422, 'VALIDATION_ERROR', 'qrToken is empty or tenantId is missing', {
        tenantId: 'tenantId is required'
      }));
    }

    if (!qrToken || qrToken.length !== 64 || !/^[0-9a-f]{64}$/.test(qrToken)) {
      return next(new ApiError(404, 'NOT_FOUND', 'Asset not found.'));
    }

    const data = await AssetService.resolvePublicScan(qrToken, tenantId);
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

export default router;
