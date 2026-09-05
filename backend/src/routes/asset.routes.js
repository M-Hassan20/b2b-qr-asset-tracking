import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleGuard.js';
import { validateBody, validateQuery } from '../middlewares/validator.js';
import { AssetService } from '../services/assetService.js';
import { HistoryService } from '../services/historyService.js';
import {
  createAssetSchema,
  patchAssetSchema,
  assignAssetSchema,
  unassignAssetSchema,
  changeStatusSchema,
  assetFilterSchema,
  historyFilterSchema
} from '../schemas/validationSchemas.js';

const router = Router();

// All asset endpoints require JWT authentication
router.use(requireAuth);

// Helper for extracting frontend host
const getHost = (req) => {
  // 1. Check Origin or Referer header (from frontend browser requests)
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    try {
      const parsed = new URL(origin);
      return parsed.host; // e.g. "192.168.18.18:5173" or "localhost:5173"
    } catch {}
  }

  // 2. Check FRONTEND_URL from env if available
  if (process.env.FRONTEND_URL) {
    try {
      const parsed = new URL(process.env.FRONTEND_URL);
      return parsed.host;
    } catch {}
  }

  // 3. Fallback: replace port 5000 with 5173 if present
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
  return host.replace(':5000', ':5173');
};

// GET /api/assets (Admin, Viewer)
router.get('/', validateQuery(assetFilterSchema), async (req, res, next) => {
  try {
    const result = await AssetService.listAssets(req.user.tenantId, req.query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/assets/:id (Admin, Viewer)
router.get('/:id', async (req, res, next) => {
  try {
    const includeQrImage = req.query.includeQrImage === 'true' && req.user.role === 'Admin';
    const result = await AssetService.getAssetById(req.user.tenantId, req.params.id, {
      host: getHost(req),
      includeQrImage
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/assets (Admin only)
router.post('/', requireRole('Admin'), validateBody(createAssetSchema), async (req, res, next) => {
  try {
    const result = await AssetService.createAsset(
      req.user.tenantId,
      req.user.userId,
      req.body,
      getHost(req)
    );
    return res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/assets/:id (Admin only)
router.patch('/:id', requireRole('Admin'), validateBody(patchAssetSchema), async (req, res, next) => {
  try {
    const result = await AssetService.updateMetadata(
      req.user.tenantId,
      req.user.userId,
      req.params.id,
      req.body,
      getHost(req)
    );
    return res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/assets/:id/history (Admin, Viewer)
router.get('/:id/history', validateQuery(historyFilterSchema), async (req, res, next) => {
  try {
    // Verify asset exists first
    await AssetService.getAssetById(req.user.tenantId, req.params.id);
    const result = await HistoryService.getHistory(req.user.tenantId, req.params.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/assets/:id/assign (Admin only)
router.post('/:id/assign', requireRole('Admin'), validateBody(assignAssetSchema), async (req, res, next) => {
  try {
    const result = await AssetService.assignAsset(
      req.user.tenantId,
      req.user.userId,
      req.params.id,
      req.body,
      getHost(req)
    );
    return res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/assets/:id/unassign (Admin only)
router.post('/:id/unassign', requireRole('Admin'), validateBody(unassignAssetSchema), async (req, res, next) => {
  try {
    const result = await AssetService.unassignAsset(
      req.user.tenantId,
      req.user.userId,
      req.params.id,
      req.body.note,
      getHost(req)
    );
    return res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/assets/:id/status (Admin only)
router.post('/:id/status', requireRole('Admin'), validateBody(changeStatusSchema), async (req, res, next) => {
  try {
    const result = await AssetService.changeStatus(
      req.user.tenantId,
      req.user.userId,
      req.params.id,
      req.body.status,
      req.body.note,
      getHost(req)
    );
    return res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/assets/:id/qr/regenerate (Admin only)
router.post('/:id/qr/regenerate', requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await AssetService.regenerateQr(
      req.user.tenantId,
      req.user.userId,
      req.params.id,
      getHost(req)
    );
    return res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
