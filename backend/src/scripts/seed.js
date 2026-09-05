import dotenv from 'dotenv';
dotenv.config();

import dns from 'node:dns';
import mongoose from 'mongoose';

// Route DNS queries through Google and Cloudflare DNS to resolve MongoDB Atlas SRV records
dns.setServers([
  '8.8.8.8',
  '8.8.4.4',
  '1.1.1.1',
  '1.0.0.1'
]);
import bcrypt from 'bcryptjs';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Employee } from '../models/Employee.js';
import { Location } from '../models/Location.js';
import { Asset } from '../models/Asset.js';
import { AssetHistory } from '../models/AssetHistory.js';
import { QRService } from '../services/qrService.js';

const seedDatabase = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI not found in environment.');
    process.exit(1);
  }

  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('[Seed] Connected successfully.');

    // 1. Clear existing collections
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      Tenant.deleteMany({}),
      User.deleteMany({}),
      Employee.deleteMany({}),
      Location.deleteMany({}),
      Asset.deleteMany({}),
      AssetHistory.deleteMany({})
    ]);

    // 2. Create Tenant
    console.log('[Seed] Creating Tenant...');
    const tenant = await Tenant.create({
      name: 'Vision71 Corporation',
      slug: 'vision71',
      isActive: true
    });
    console.log(`[Seed] Created Tenant: ${tenant.name} (${tenant._id})`);

    // Inactive Tenant for Edge Case 12 validation
    const inactiveTenant = await Tenant.create({
      name: 'Deactivated Holdings Ltd',
      slug: 'deactivated-holdings',
      isActive: false
    });

    // 3. Create Users
    console.log('[Seed] Creating Staff Users...');
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('AdminPass123!', salt);
    const viewerPasswordHash = await bcrypt.hash('ViewerPass123!', salt);

    const adminUser = await User.create({
      tenantId: tenant._id,
      name: 'Sarah Connor (Admin)',
      email: 'admin@vision71.com',
      passwordHash: adminPasswordHash,
      role: 'Admin'
    });

    const viewerUser = await User.create({
      tenantId: tenant._id,
      name: 'John Doe (Viewer)',
      email: 'viewer@vision71.com',
      passwordHash: viewerPasswordHash,
      role: 'Viewer'
    });

    // Inactive tenant user for tests
    await User.create({
      tenantId: inactiveTenant._id,
      name: 'Inactive Admin',
      email: 'inactive@deactivated.com',
      passwordHash: adminPasswordHash,
      role: 'Admin'
    });

    console.log(`[Seed] Created Admin: ${adminUser.email}`);
    console.log(`[Seed] Created Viewer: ${viewerUser.email}`);

    // 4. Create Locations
    console.log('[Seed] Creating Locations...');
    const locations = await Location.create([
      {
        tenantId: tenant._id,
        name: 'Vision71 Headquarters - Floor 3',
        type: 'building',
        address: '71 Innovation Blvd, Suite 300, San Francisco, CA'
      },
      {
        tenantId: tenant._id,
        name: 'Warehouse Logistics Center B',
        type: 'site',
        address: '104 Industrial Pkwy, Oakland, CA'
      },
      {
        tenantId: tenant._id,
        name: 'Hardware Testing Lab - Room 102',
        type: 'room',
        address: '71 Innovation Blvd, Ground Floor, San Francisco, CA'
      },
      {
        tenantId: tenant._id,
        name: 'Server Room Alpha',
        type: 'zone',
        address: '71 Innovation Blvd, Basement B1, San Francisco, CA'
      }
    ]);

    // 5. Create Employees
    console.log('[Seed] Creating Employees...');
    const employees = await Employee.create([
      {
        tenantId: tenant._id,
        name: 'Jane Smith',
        title: 'Senior Financial Analyst',
        department: 'Finance',
        contactInfo: { email: 'jane.smith@vision71.com', phone: '+1-555-0142' },
        status: 'active'
      },
      {
        tenantId: tenant._id,
        name: 'Alex Rivera',
        title: 'Principal Systems Architect',
        department: 'Engineering',
        contactInfo: { email: 'alex.rivera@vision71.com', phone: '+1-555-0188' },
        status: 'active'
      },
      {
        tenantId: tenant._id,
        name: 'Marcus Vance',
        title: 'Warehouse Operations Lead',
        department: 'Operations',
        contactInfo: { email: 'marcus.vance@vision71.com', phone: '+1-555-0199' },
        status: 'active'
      },
      {
        tenantId: tenant._id,
        name: 'Elena Rostova',
        title: 'Senior DevOps Engineer',
        department: 'Engineering',
        contactInfo: { email: 'elena.rostova@vision71.com', phone: '+1-555-0211' },
        status: 'active'
      },
      {
        tenantId: tenant._id,
        name: 'David Kim',
        title: 'Former QA Specialist',
        department: 'Quality Assurance',
        contactInfo: { email: 'david.kim@vision71.com', phone: '+1-555-0300' },
        status: 'inactive'
      }
    ]);

    // 6. Create 12 Realistic Assets across various states
    console.log('[Seed] Creating Assets and Audit History trails...');
    const assetsData = [
      {
        assetCode: 'AST0001',
        name: 'Dell Precision 5570 Workstation',
        category: 'Laptop',
        description: 'High-performance developer laptop with 64GB RAM & RTX A2000',
        serialNumber: 'SN-DP5570-8812',
        status: 'Assigned',
        assignedEmployeeId: employees[1]._id, // Alex Rivera
        assignedLocationId: null,
        isPublicVisible: true
      },
      {
        assetCode: 'AST0002',
        name: 'Apple MacBook Pro 16 M3 Max',
        category: 'Laptop',
        description: 'Finance executive laptop',
        serialNumber: 'SN-MBP16-9901',
        status: 'Assigned',
        assignedEmployeeId: employees[0]._id, // Jane Smith
        assignedLocationId: null,
        isPublicVisible: true
      },
      {
        assetCode: 'AST0003',
        name: 'Ford Transit 250 Cargo Van',
        category: 'Vehicle',
        description: 'Field equipment transport van - Fleet #04',
        serialNumber: 'VIN-1FTNE2Y89KDA1290',
        status: 'Assigned',
        assignedEmployeeId: null,
        assignedLocationId: locations[1]._id, // Warehouse B
        isPublicVisible: true
      },
      {
        assetCode: 'AST0004',
        name: 'Hilti TE 70-ATC Rotary Hammer Drill',
        category: 'Tool',
        description: 'Heavy duty concrete drilling tool',
        serialNumber: 'HLT-70ATC-4421',
        status: 'Available',
        assignedEmployeeId: null,
        assignedLocationId: null,
        isPublicVisible: true
      },
      {
        assetCode: 'AST0005',
        name: 'Herman Miller Aeron Ergonomic Chair',
        category: 'Furniture',
        description: 'Executive task chair with posture fit SL',
        serialNumber: 'HM-AER-2024-55',
        status: 'Assigned',
        assignedEmployeeId: null,
        assignedLocationId: locations[0]._id, // HQ Floor 3
        isPublicVisible: true
      },
      {
        assetCode: 'AST0006',
        name: 'Fluke 179 True-RMS Digital Multimeter',
        category: 'Equipment',
        description: 'Precision electronics testing multimeter',
        serialNumber: 'FLK-179-88320',
        status: 'Assigned',
        assignedEmployeeId: null,
        assignedLocationId: locations[2]._id, // Hardware Testing Lab
        isPublicVisible: true
      },
      {
        assetCode: 'AST0007',
        name: 'Cisco Catalyst 9300 48-Port Switch',
        category: 'Equipment',
        description: 'Core rack switch for HQ datacenter',
        serialNumber: 'CSC-CAT9300-3312',
        status: 'In Repair',
        assignedEmployeeId: null,
        assignedLocationId: null,
        isPublicVisible: true
      },
      {
        assetCode: 'AST0008',
        name: 'Lenovo ThinkPad X1 Carbon Gen 10',
        category: 'Laptop',
        description: 'Operations field laptop with LTE eSIM',
        serialNumber: 'SN-TPX1-0044',
        status: 'Available',
        assignedEmployeeId: null,
        assignedLocationId: null,
        isPublicVisible: true
      },
      {
        assetCode: 'AST0009',
        name: 'Toyota Tacoma 4x4 Utility Truck',
        category: 'Vehicle',
        description: 'Maintenance inspection pickup truck',
        serialNumber: 'VIN-4T1BE32K95U1088',
        status: 'Lost',
        assignedEmployeeId: null,
        assignedLocationId: null,
        isPublicVisible: false
      },
      {
        assetCode: 'AST0010',
        name: 'DeWalt 20V MAX Cordless Combo Kit',
        category: 'Tool',
        description: '6-tool drill and driver construction kit',
        serialNumber: 'DWT-20V-00991',
        status: 'Retired',
        assignedEmployeeId: null,
        assignedLocationId: null,
        isPublicVisible: true
      },
      {
        assetCode: 'AST0011',
        name: 'Dell UltraSharp 34 Curved USB-C Monitor',
        category: 'Equipment',
        description: '3440x1440 WQHD Hub display',
        serialNumber: 'U3423WE-77610',
        status: 'Assigned',
        assignedEmployeeId: employees[3]._id, // Elena Rostova
        assignedLocationId: null,
        isPublicVisible: true
      },
      {
        assetCode: 'AST0012',
        name: 'Steelcase Gesture Conference Table',
        category: 'Furniture',
        description: '10-person conference table with built-in power outlets',
        serialNumber: 'STC-GST-2023-01',
        status: 'Available',
        assignedEmployeeId: null,
        assignedLocationId: null,
        isPublicVisible: true
      }
    ];

    for (const item of assetsData) {
      const qrToken = QRService.generateToken();
      const asset = await Asset.create({
        tenantId: tenant._id,
        qrToken,
        assetCode: item.assetCode,
        name: item.name,
        category: item.category,
        description: item.description,
        serialNumber: item.serialNumber,
        status: item.status,
        assignedEmployeeId: item.assignedEmployeeId,
        assignedLocationId: item.assignedLocationId,
        isPublicVisible: item.isPublicVisible
      });

      // Created History Event
      await AssetHistory.create({
        tenantId: tenant._id,
        assetId: asset._id,
        eventType: 'Created',
        previousValue: {},
        newValue: {
          assetCode: asset.assetCode,
          name: asset.name,
          status: 'Available'
        },
        performedBy: adminUser._id,
        note: 'Initial asset cataloging'
      });

      // Additional history event for assigned/repair/retired items
      if (item.assignedEmployeeId) {
        await AssetHistory.create({
          tenantId: tenant._id,
          assetId: asset._id,
          eventType: 'AssignedToEmployee',
          previousValue: { assignedEmployeeId: null, assignedLocationId: null },
          newValue: { assignedEmployeeId: item.assignedEmployeeId.toString(), assignedLocationId: null },
          performedBy: adminUser._id,
          note: 'Assigned during onboarding deployment'
        });
      } else if (item.assignedLocationId) {
        await AssetHistory.create({
          tenantId: tenant._id,
          assetId: asset._id,
          eventType: 'AssignedToLocation',
          previousValue: { assignedEmployeeId: null, assignedLocationId: null },
          newValue: { assignedEmployeeId: null, assignedLocationId: item.assignedLocationId.toString() },
          performedBy: adminUser._id,
          note: 'Deployed to site facility'
        });
      } else if (item.status === 'In Repair') {
        await AssetHistory.create({
          tenantId: tenant._id,
          assetId: asset._id,
          eventType: 'StatusChange',
          previousValue: { status: 'Available' },
          newValue: { status: 'In Repair' },
          performedBy: adminUser._id,
          note: 'Sent to vendor for power supply replacement'
        });
      } else if (item.status === 'Retired') {
        await AssetHistory.create({
          tenantId: tenant._id,
          assetId: asset._id,
          eventType: 'StatusChange',
          previousValue: { status: 'Available' },
          newValue: { status: 'Retired' },
          performedBy: adminUser._id,
          note: 'End of lifecycle decommissioning'
        });
      }
    }

    console.log('----------------------------------------------------');
    console.log(' SEED COMPLETED SUCCESSFULLY!                      ');
    console.log(' Tenant: Vision71 Corporation (slug: vision71)     ');
    console.log(' Admin:  admin@vision71.com  /  AdminPass123!      ');
    console.log(' Viewer: viewer@vision71.com /  ViewerPass123!     ');
    console.log(' Assets Created: 12 (Across 5 categories & statuses)');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedDatabase();
