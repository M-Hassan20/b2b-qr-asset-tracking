import { Employee } from '../models/Employee.js';
import { ApiError } from '../middlewares/errorHandler.js';

export class EmployeeService {
  static async listEmployees(tenantId, filters = {}) {
    const { page = 1, limit = 20, status, department, search } = filters;
    const query = { tenantId };

    if (status) query.status = status;
    if (department) query.department = department;
    if (search && search.trim() !== '') {
      query.name = new RegExp(search.trim(), 'i');
    }

    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      Employee.find(query).sort({ name: 1 }).skip(skip).limit(limit).exec(),
      Employee.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit) || 0;

    // contactInfo is omitted from list responses for both Viewer and Admin per spec
    const data = employees.map((emp) => {
      const json = emp.toJSON();
      delete json.contactInfo;
      return json;
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async getEmployeeById(tenantId, employeeId, role) {
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) {
      throw new ApiError(404, 'NOT_FOUND', 'Employee not found within tenant');
    }

    const json = employee.toJSON();
    // Viewer Response: contactInfo is omitted entirely
    if (role !== 'Admin') {
      delete json.contactInfo;
    }

    return json;
  }
}
