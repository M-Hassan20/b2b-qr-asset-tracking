import { z } from 'zod';

// Auth Login Schema
export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Valid email format required'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty')
});

// Public Scan Params & Query
export const publicScanSchema = z.object({
  params: z.object({
    qrToken: z.string().length(64, 'Token must be 64 characters').regex(/^[0-9a-f]{64}$/, 'Malformed token')
  }),
  query: z.object({
    tenantId: z.string({ required_error: 'tenantId is required' }).min(1, 'tenantId cannot be empty')
  })
});

// Asset Creation Schema
export const createAssetSchema = z.object({
  name: z.string().min(1, 'Name must be 1-200 characters').max(200, 'Name must be 1-200 characters'),
  category: z.enum(['Laptop', 'Vehicle', 'Tool', 'Furniture', 'Equipment'], {
    errorMap: () => ({ message: 'Category must be Laptop, Vehicle, Tool, Furniture, or Equipment' })
  }),
  description: z.string().max(1000, 'Description max 1000 characters').optional(),
  serialNumber: z.string().max(100, 'Serial number max 100 characters').optional(),
  isPublicVisible: z.boolean().optional(),
  assetCode: z.string().regex(/^[A-Z0-9\-]{3,20}$/, 'Asset code format must be ^[A-Z0-9\\-]{3,20}$').optional()
});

// Asset Metadata Patch Schema
export const patchAssetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['Laptop', 'Vehicle', 'Tool', 'Furniture', 'Equipment']).optional(),
  description: z.string().max(1000).optional(),
  serialNumber: z.string().max(100).optional(),
  isPublicVisible: z.boolean().optional()
}).refine((data) => {
  return Object.keys(data).length > 0;
}, {
  message: 'At least one field must be provided to update'
});

// Asset Assignment Schema (Mutually exclusive employeeId / locationId)
export const assignAssetSchema = z.object({
  employeeId: z.string().min(1).optional(),
  locationId: z.string().min(1).optional(),
  note: z.string().max(500, 'Note max 500 characters').optional()
}).superRefine((val, ctx) => {
  const hasEmp = Boolean(val.employeeId);
  const hasLoc = Boolean(val.locationId);

  if ((hasEmp && hasLoc) || (!hasEmp && !hasLoc)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either employeeId or locationId, not both.',
      path: ['employeeId']
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either employeeId or locationId, not both.',
      path: ['locationId']
    });
  }
});

// Asset Unassign Schema
export const unassignAssetSchema = z.object({
  note: z.string().max(500, 'Note max 500 characters').optional()
});

// Asset Status Change Schema
export const changeStatusSchema = z.object({
  status: z.enum(['Available', 'Assigned', 'In Repair', 'Retired', 'Lost'], {
    errorMap: () => ({ message: 'Status must be Available, Assigned, In Repair, Retired, or Lost' })
  }),
  note: z.string().max(500, 'Note max 500 characters').optional()
});

// Pagination / Filter Query Schema for Assets
export const assetFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['Available', 'Assigned', 'In Repair', 'Retired', 'Lost']).optional(),
  category: z.enum(['Laptop', 'Vehicle', 'Tool', 'Furniture', 'Equipment']).optional(),
  assignedEmployeeId: z.string().optional(),
  assignedLocationId: z.string().optional(),
  search: z.string().optional(),
  isPublicVisible: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional())
});

// Pagination / Filter Query Schema for History
export const historyFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  eventType: z.enum([
    'Created',
    'StatusChange',
    'AssignedToEmployee',
    'AssignedToLocation',
    'Unassigned',
    'Updated'
  ]).optional()
});

// Pagination / Filter Query Schema for Employees
export const employeeFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive']).optional(),
  department: z.string().optional(),
  search: z.string().optional()
});

// Pagination / Filter Query Schema for Locations
export const locationFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['site', 'building', 'zone', 'room', 'other']).optional(),
  search: z.string().optional()
});
