import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Default Admin User
  const passwordHash = await bcrypt.hash('admin123456', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@pulsetrace.io' },
    update: {},
    create: {
      email: 'admin@pulsetrace.io',
      name: 'PulseTrace Admin',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Created Admin User: ${user.email}`);

  // 2. Create Default Demo Project
  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'PulseTrace Demo Platform',
      description: 'Primary observability project for demo application',
    },
  });
  console.log(`✅ Created Demo Project: ${project.name}`);

  // 3. Create Project Member
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: user.id,
      role: Role.ADMIN,
    },
  });

  // 4. Create Environments
  const prodEnv = await prisma.environment.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'production',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'production',
    },
  });

  const stagingEnv = await prisma.environment.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'staging',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'staging',
    },
  });
  console.log('✅ Created Environments: production, staging');

  // 5. Create Services
  const authService = await prisma.service.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'auth-service',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      environmentId: prodEnv.id,
      name: 'auth-service',
      description: 'Authentication & Identity Service',
    },
  });

  const paymentService = await prisma.service.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'payment-service',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      environmentId: prodEnv.id,
      name: 'payment-service',
      description: 'Billing & Payment Gateway Integration',
    },
  });
  console.log(`✅ Created Services: ${authService.name}, ${paymentService.name}`);

  // 6. Create Endpoints for Auth Service
  const epLogin = await prisma.endpoint.upsert({
    where: {
      serviceId_method_route: {
        serviceId: authService.id,
        method: 'POST',
        route: '/api/v1/auth/login',
      },
    },
    update: {},
    create: {
      serviceId: authService.id,
      method: 'POST',
      path: '/api/v1/auth/login',
      route: '/api/v1/auth/login',
    },
  });

  const epRegister = await prisma.endpoint.upsert({
    where: {
      serviceId_method_route: {
        serviceId: authService.id,
        method: 'POST',
        route: '/api/v1/auth/register',
      },
    },
    update: {},
    create: {
      serviceId: authService.id,
      method: 'POST',
      path: '/api/v1/auth/register',
      route: '/api/v1/auth/register',
    },
  });

  // 7. Create API Key for Demo Project
  // Default raw key: "pt_live_demo12345678901234567890"
  const rawKey = 'pt_live_demo12345678901234567890';
  const keyPrefix = 'pt_live_';
  const keyHash = await bcrypt.hash(rawKey, 10);

  const apiKey = await prisma.apiKey.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      projectId: project.id,
      environmentId: prodEnv.id,
      name: 'Demo Ingestion Key',
      keyPrefix,
      keyHash,
    },
  });
  console.log(`✅ Created API Key: ${apiKey.name} (Prefix: ${apiKey.keyPrefix})`);

  // 8. Create Sample Alert Rule
  await prisma.alertRule.create({
    data: {
      projectId: project.id,
      serviceId: authService.id,
      name: 'High Latency P95 Alert (>500ms)',
      metricType: 'latency_p95',
      operator: 'gt',
      threshold: 500,
      evaluationWindowMinutes: 5,
      severity: 'critical',
      enabled: true,
    },
  });

  // 9. Create Sample Health Check
  await prisma.healthCheck.create({
    data: {
      projectId: project.id,
      serviceId: authService.id,
      name: 'Auth Service Health',
      url: 'http://localhost:4000/health',
      method: 'GET',
      intervalSeconds: 30,
      timeoutMs: 3000,
      expectedStatus: 200,
      status: 'UP',
    },
  });

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
