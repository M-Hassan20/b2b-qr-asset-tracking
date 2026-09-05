import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validateQuery } from '../middlewares/validator.js';
import { EmployeeService } from '../services/employeeService.js';
import { employeeFilterSchema } from '../schemas/validationSchemas.js';

const router = Router();

router.use(requireAuth);

// GET /api/employees (Admin, Viewer)
router.get('/', validateQuery(employeeFilterSchema), async (req, res, next) => {
  try {
    const result = await EmployeeService.listEmployees(req.user.tenantId, req.query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/employees/:id (Admin, Viewer)
router.get('/:id', async (req, res, next) => {
  try {
    const result = await EmployeeService.getEmployeeById(
      req.user.tenantId,
      req.params.id,
      req.user.role
    );
    return res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
