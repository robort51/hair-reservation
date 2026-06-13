import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

type ApiResponse = {
  data?: unknown;
  error: {
    code: string;
    message: string;
  } | null;
};

const TEST_ADMIN_USERNAME = 'test-admin';
const TEST_ADMIN_PASSWORD = 'test-admin-password';
const TEST_ADMIN_TOKEN_SECRET =
  'test-admin-token-secret-with-enough-random-characters';

describe('Appointments', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;
  let adminToken: string;

  const payload = {
    serviceItemId: 2,
    staffId: 1,
    customerName: '张三',
    customerPhone: '13900000000',
    startAt: '2099-06-12T10:00:00+08:00',
    remark: '测试预约',
  };
  const testPhones = [
    payload.customerPhone,
    '13900000001',
    '13900000002',
    '1390000000',
  ];

  async function resetDemoStaffPrices() {
    const serviceItems = await prisma.serviceItem.findMany({
      select: { id: true, priceCents: true },
    });

    for (const service of serviceItems) {
      await prisma.staffService.updateMany({
        where: { staffId: 1, serviceItemId: service.id },
        data: { priceCents: service.priceCents },
      });
      await prisma.staffService.updateMany({
        where: { staffId: 2, serviceItemId: service.id },
        data: { priceCents: service.priceCents + 3000 },
      });
    }
  }

  beforeAll(async () => {
    process.env.ADMIN_USERNAME = TEST_ADMIN_USERNAME;
    process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
    process.env.ADMIN_TOKEN_SECRET = TEST_ADMIN_TOKEN_SECRET;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
    const httpServer: unknown = app.getHttpServer();
    server = httpServer as Server;
    const login = await request(server).post('/admin-auth/login').send({
      username: TEST_ADMIN_USERNAME,
      password: TEST_ADMIN_PASSWORD,
    });
    const loginBody = login.body as ApiResponse;
    const loginData = loginBody.data as { token: string };
    adminToken = loginData.token;
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { customerPhoneSnapshot: { in: testPhones } },
    });
    await prisma.customer.deleteMany({
      where: { phone: { in: testPhones } },
    });
    await resetDemoStaffPrices();
    await app.close();
  });

  beforeEach(async () => {
    await resetDemoStaffPrices();
    await prisma.appointment.deleteMany({
      where: { customerPhoneSnapshot: { in: testPhones } },
    });
    await prisma.customer.deleteMany({
      where: { phone: { in: testPhones } },
    });
  });

  it('同一员工同一时间段不能重复预约', async () => {
    const first = await request(server).post('/appointments').send(payload);
    const firstBody = first.body as ApiResponse;
    expect(first.status).toBe(201);
    expect(firstBody.error).toBeNull();

    const second = await request(server).post('/appointments').send(payload);
    const secondBody = second.body as ApiResponse;
    expect(second.status).toBe(409);
    expect(secondBody.error?.code).toBe('APPOINTMENT_CONFLICT');
  });

  it('后台登录成功后返回访问令牌', async () => {
    const response = await request(server).post('/admin-auth/login').send({
      username: TEST_ADMIN_USERNAME,
      password: TEST_ADMIN_PASSWORD,
    });
    const body = response.body as ApiResponse;
    const data = body.data as { token: string };

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(data.token).toEqual(expect.any(String));
  });

  it('后台接口未登录不能访问', async () => {
    const response = await request(server).get('/appointments');
    const body = response.body as ApiResponse;

    expect(response.status).toBe(401);
    expect(body.error?.code).toBe('ADMIN_UNAUTHORIZED');
  });

  it('用户手机号查单接口不需要后台登录', async () => {
    const response = await request(server)
      .get('/appointments')
      .query({ customerPhone: '13900000001' });
    const body = response.body as ApiResponse;

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
  });

  it('不能创建早于当前时间的预约', async () => {
    const response = await request(server)
      .post('/appointments')
      .send({
        ...payload,
        customerPhone: '13900000001',
        startAt: '2000-01-03T10:00:00+08:00',
      });
    const body = response.body as ApiResponse;

    expect(response.status).toBe(409);
    expect(body.error?.code).toBe('APPOINTMENT_TIME_PASSED');
  });

  it('创建预约时手机号必须是 11 位数字', async () => {
    const response = await request(server)
      .post('/appointments')
      .send({
        ...payload,
        customerPhone: '1390000000',
      });
    const body = response.body as ApiResponse;

    expect(response.status).toBe(400);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
    expect(body.error?.message).toContain('手机号必须为 11 位数字');
  });

  it('用户可以按手机号查询自己的预约订单', async () => {
    await request(server)
      .post('/appointments')
      .send({
        ...payload,
        customerPhone: '13900000000',
        startAt: '2099-06-12T10:00:00+08:00',
      });
    await request(server)
      .post('/appointments')
      .send({
        ...payload,
        customerPhone: '13900000001',
        startAt: '2099-06-12T12:00:00+08:00',
      });

    const response = await request(server)
      .get('/appointments')
      .query({ customerPhone: '13900000001' });
    const body = response.body as ApiResponse;
    const appointments = body.data as Array<{
      customerPhoneSnapshot: string;
      startAt: string;
    }>;

    expect(response.status).toBe(200);
    expect(appointments).toHaveLength(1);
    expect(appointments[0]?.customerPhoneSnapshot).toBe('13900000001');
  });

  it('商家取消预约时必须填写原因，并能被用户查到', async () => {
    const created = await request(server)
      .post('/appointments')
      .send({
        ...payload,
        customerPhone: '13900000001',
      });
    const createdBody = created.body as ApiResponse;
    const appointment = createdBody.data as { id: number };

    const invalidCancel = await request(server)
      .patch(`/appointments/${appointment.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    const invalidBody = invalidCancel.body as ApiResponse;

    expect(invalidCancel.status).toBe(400);
    expect(invalidBody.error?.code).toBe('VALIDATION_ERROR');
    expect(invalidBody.error?.message).toContain('请输入取消原因');

    const cancelReason = '员工临时请假';
    const canceled = await request(server)
      .patch(`/appointments/${appointment.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cancelReason });

    expect(canceled.status).toBe(200);

    const response = await request(server)
      .get('/appointments')
      .query({ customerPhone: '13900000001' });
    const body = response.body as ApiResponse;
    const appointments = body.data as Array<{
      status: string;
      cancelReason: string | null;
    }>;

    expect(appointments).toHaveLength(1);
    expect(appointments[0]?.status).toBe('CANCELED');
    expect(appointments[0]?.cancelReason).toBe(cancelReason);
  });

  it('创建预约时使用员工服务专属价格', async () => {
    const customPriceCents = 4500;
    const servicePrices = [
      { serviceItemId: 1, priceCents: customPriceCents },
      { serviceItemId: 2, priceCents: 6800 },
      { serviceItemId: 3, priceCents: 9800 },
      { serviceItemId: 4, priceCents: 29800 },
      { serviceItemId: 5, priceCents: 39800 },
    ];

    const updated = await request(server)
      .put('/staff/1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ services: servicePrices });
    const updatedBody = updated.body as ApiResponse;
    const staff = updatedBody.data as {
      staffServices: Array<{ serviceItemId: number; priceCents: number }>;
    };

    expect(updated.status).toBe(200);
    expect(
      staff.staffServices.find((item) => item.serviceItemId === 1)?.priceCents,
    ).toBe(customPriceCents);

    const created = await request(server)
      .post('/appointments')
      .send({
        ...payload,
        serviceItemId: 1,
        customerPhone: '13900000002',
        startAt: '2099-06-12T09:00:00+08:00',
      });
    const createdBody = created.body as ApiResponse;
    const appointment = createdBody.data as {
      servicePriceCentsSnapshot: number;
    };

    expect(created.status).toBe(201);
    expect(appointment.servicePriceCentsSnapshot).toBe(customPriceCents);
  });
});
