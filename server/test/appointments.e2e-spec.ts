import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

type ApiResponse = {
  error: {
    code: string;
  } | null;
};

describe('Appointments', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  const payload = {
    serviceItemId: 2,
    staffId: 1,
    customerName: '张三',
    customerPhone: '13900000000',
    startAt: '2026-06-12T10:00:00+08:00',
    remark: '测试预约',
  };

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { customerPhoneSnapshot: payload.customerPhone },
    });
    await prisma.customer.deleteMany({
      where: { phone: payload.customerPhone },
    });
    await app.close();
  });

  beforeEach(async () => {
    await prisma.appointment.deleteMany({
      where: { customerPhoneSnapshot: payload.customerPhone },
    });
    await prisma.customer.deleteMany({
      where: { phone: payload.customerPhone },
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
});
