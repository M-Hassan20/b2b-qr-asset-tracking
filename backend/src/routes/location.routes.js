import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validateQuery } from '../middlewares/validator.js';
import { LocationService } from '../services/locationService.js';
import { locationFilterSchema } from '../schemas/validationSchemas.js';

const router = Router();

router.use(requireAuth);

// GET /api/locations (Admin, Viewer)
router.get('/', validateQuery(locationFilterSchema), async (req, res, next) => {
  try {
    const result = await LocationService.listLocations(req.user.tenantId, req.query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/locations/:id (Admin, Viewer)
router.get('/:id', async (req, res, next) => {
  try {
    const result = await LocationService.getLocationById(req.user.tenantId, req.params.id);
    return res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
