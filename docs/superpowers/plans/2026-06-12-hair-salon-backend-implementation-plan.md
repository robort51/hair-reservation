# 美发店预约系统后端实现计划

> **给执行代理的要求：** 实现本计划时，必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，逐项执行并更新复选框状态。

**目标：** 搭建单门店美发预约系统第一阶段后端，包含 NestJS 服务、SQLite/Prisma 数据模型、种子数据、核心 REST API、可预约时间计算和预约冲突校验。

**架构：** 后端放在 `server/` 目录，使用 NestJS 按业务模块拆分。Prisma 负责 SQLite 数据库模型、迁移和访问；业务层负责服务项目、员工、排班、可预约时间和预约订单。第一阶段本地开发不启用完整登录，但保留 `auth/` 模块边界，上线前再加后台权限。

**技术栈：** Node.js、NestJS、SQLite、Prisma、Jest、Supertest、Bun。

---

## 关键假设

- 时区按 `Asia/Shanghai` 处理。
- 可预约时间粒度为 30 分钟。
- 第一阶段创建预约必须传入明确的 `staffId`。
- 可预约时间查询允许不传 `staffId`，此时按员工分组返回。
- 本阶段不做管理后台页面、小程序页面、支付、短信、会员、优惠券、文件上传。
- SQLite 用于 MVP；后续迁移 MySQL/PostgreSQL 时保持 Prisma 模型尽量平滑。

## 文件结构

```text
server/
  package.json
  tsconfig.json
  nest-cli.json
  .env.example
  src/
    main.ts
    app.module.ts
    common/
      errors/app-error-code.ts
      filters/http-exception.filter.ts
      interceptors/response.interceptor.ts
      pipes/zod-validation.pipe.ts
      time/time.util.ts
    prisma/
      prisma.module.ts
      prisma.service.ts
    modules/
      auth/auth.module.ts
      service-categories/
        service-categories.controller.ts
        service-categories.module.ts
        service-categories.service.ts
        dto/service-category.dto.ts
      service-items/
        service-items.controller.ts
        service-items.module.ts
        service-items.service.ts
        dto/service-item.dto.ts
      staff/
        staff.controller.ts
        staff.module.ts
        staff.service.ts
        dto/staff.dto.ts
      schedules/
        schedules.controller.ts
        schedules.module.ts
        schedules.service.ts
        dto/schedule.dto.ts
      availability/
        availability.controller.ts
        availability.module.ts
        availability.service.ts
        availability.types.ts
      appointments/
        appointments.controller.ts
        appointments.module.ts
        appointments.service.ts
        dto/appointment.dto.ts
  prisma/
    schema.prisma
    seed.ts
  test/
    availability.service.spec.ts
    appointments.e2e-spec.ts
```

## 任务 1：创建 NestJS 后端项目骨架

**文件：**

- 创建：`server/`
- 创建：`server/.env.example`
- 创建：`server/src/common/interceptors/response.interceptor.ts`
- 创建：`server/src/common/filters/http-exception.filter.ts`
- 创建：`server/src/common/errors/app-error-code.ts`
- 创建：`server/src/common/pipes/zod-validation.pipe.ts`
- 创建：`server/src/modules/auth/auth.module.ts`
- 修改：`server/src/main.ts`
- 修改：`server/src/app.module.ts`
- 修改：`.gitignore`

- [ ] **步骤 1：用 NestJS CLI 创建项目**

运行：

```bash
bunx @nestjs/cli new server --package-manager bun --skip-git
```

期望结果：

```text
输出包含 Successfully created project server
```

- [ ] **步骤 2：安装后端依赖**

运行：

```bash
cd server
bun add @prisma/client zod
bun add -d prisma ts-node supertest @types/supertest
```

期望结果：

```text
输出包含 installed
```

- [ ] **步骤 3：创建环境变量示例**

写入 `server/.env.example`：

```env
DATABASE_URL="file:./dev.db"
PORT=3000
TZ=Asia/Shanghai
```

- [ ] **步骤 4：定义统一错误码**

写入 `server/src/common/errors/app-error-code.ts`：

```ts
export enum AppErrorCode {
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  SERVICE_INACTIVE = 'SERVICE_INACTIVE',
  STAFF_NOT_FOUND = 'STAFF_NOT_FOUND',
  STAFF_INACTIVE = 'STAFF_INACTIVE',
  STAFF_SERVICE_UNSUPPORTED = 'STAFF_SERVICE_UNSUPPORTED',
  OUTSIDE_WORKING_HOURS = 'OUTSIDE_WORKING_HOURS',
  STAFF_TIME_OFF = 'STAFF_TIME_OFF',
  APPOINTMENT_CONFLICT = 'APPOINTMENT_CONFLICT',
  APPOINTMENT_NOT_FOUND = 'APPOINTMENT_NOT_FOUND',
  APPOINTMENT_STATUS_INVALID = 'APPOINTMENT_STATUS_INVALID',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
```

- [ ] **步骤 5：创建统一响应拦截器**

写入 `server/src/common/interceptors/response.interceptor.ts`：

```ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => ({
        data,
        error: null,
      })),
    );
  }
}
```

- [ ] **步骤 6：创建异常过滤器**

写入 `server/src/common/filters/http-exception.filter.ts`：

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AppErrorCode } from '../errors/app-error-code';

type ErrorResponse = {
  code?: string;
  message?: string | string[];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as ErrorResponse | string;
      const message =
        typeof body === 'string'
          ? body
          : Array.isArray(body.message)
            ? body.message.join('；')
            : body.message || exception.message;

      response.status(status).json({
        data: null,
        error: {
          code:
            typeof body === 'object' && body.code
              ? body.code
              : AppErrorCode.VALIDATION_ERROR,
          message,
        },
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      data: null,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误',
      },
    });
  }
}
```

- [ ] **步骤 7：注册全局拦截器和过滤器**

修改 `server/src/main.ts`：

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

- [ ] **步骤 8：创建 Zod 校验管道**

写入 `server/src/common/pipes/zod-validation.pipe.ts`：

```ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { AppErrorCode } from '../errors/app-error-code';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: AppErrorCode.VALIDATION_ERROR,
        message: result.error.issues.map((issue) => issue.message).join('；'),
      });
    }
    return result.data;
  }
}
```

- [ ] **步骤 9：创建认证模块占位**

写入 `server/src/modules/auth/auth.module.ts`：

```ts
import { Module } from '@nestjs/common';

@Module({})
export class AuthModule {}
```

- [ ] **步骤 10：运行基础测试**

运行：

```bash
cd server
bun test
```

期望结果：

```text
PASS src/app.controller.spec.ts
```

- [ ] **步骤 11：提交项目骨架**

运行：

```bash
git add .gitignore server
git commit -m "chore: scaffold NestJS backend"
```

## 任务 2：建立 Prisma 数据模型和种子数据

**文件：**

- 创建：`server/prisma/schema.prisma`
- 创建：`server/prisma/seed.ts`
- 创建：`server/src/prisma/prisma.module.ts`
- 创建：`server/src/prisma/prisma.service.ts`
- 修改：`server/package.json`
- 修改：`server/src/app.module.ts`

- [ ] **步骤 1：初始化 Prisma**

运行：

```bash
cd server
bunx prisma init --datasource-provider sqlite
```

期望结果：

```text
Your Prisma schema was created at prisma/schema.prisma
```

- [ ] **步骤 2：写入数据库模型**

替换 `server/prisma/schema.prisma`：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum AppointmentStatus {
  PENDING
  COMPLETED
  CANCELED
  EXPIRED
}

model ServiceCategory {
  id        Int           @id @default(autoincrement())
  name      String
  sortOrder Int           @default(0)
  isActive  Boolean       @default(true)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  services  ServiceItem[]
}

model ServiceItem {
  id                 Int             @id @default(autoincrement())
  categoryId         Int
  name               String
  description        String?
  durationMinutes    Int
  priceCents         Int
  originalPriceCents Int?
  sortOrder          Int             @default(0)
  isActive           Boolean         @default(true)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt
  category           ServiceCategory @relation(fields: [categoryId], references: [id])
  staffServices      StaffService[]
  appointments       Appointment[]
}

model Staff {
  id              Int                   @id @default(autoincrement())
  name            String
  title           String?
  phone           String?
  avatarUrl       String?
  bio             String?
  isActive        Boolean               @default(true)
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
  staffServices   StaffService[]
  weeklySchedules StaffWeeklySchedule[]
  timeOffs        StaffTimeOff[]
  appointments    Appointment[]
}

model StaffService {
  id            Int         @id @default(autoincrement())
  staffId       Int
  serviceItemId Int
  sortOrder     Int         @default(0)
  createdAt     DateTime    @default(now())
  staff         Staff       @relation(fields: [staffId], references: [id], onDelete: Cascade)
  serviceItem   ServiceItem @relation(fields: [serviceItemId], references: [id], onDelete: Cascade)

  @@unique([staffId, serviceItemId])
}

model StaffWeeklySchedule {
  id        Int      @id @default(autoincrement())
  staffId   Int
  dayOfWeek Int
  startTime String
  endTime   String
  isWorking Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  staff     Staff    @relation(fields: [staffId], references: [id], onDelete: Cascade)
}

model StaffTimeOff {
  id        Int      @id @default(autoincrement())
  staffId   Int
  startAt   DateTime
  endAt     DateTime
  reason    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  staff     Staff    @relation(fields: [staffId], references: [id], onDelete: Cascade)
}

model Customer {
  id           Int           @id @default(autoincrement())
  wechatOpenId String?       @unique
  name         String
  phone        String        @unique
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  appointments Appointment[]
}

model Appointment {
  id                             Int               @id @default(autoincrement())
  customerId                     Int
  serviceItemId                  Int
  staffId                        Int
  customerNameSnapshot           String
  customerPhoneSnapshot          String
  serviceNameSnapshot            String
  serviceDurationMinutesSnapshot Int
  servicePriceCentsSnapshot      Int
  staffNameSnapshot              String
  startAt                        DateTime
  endAt                          DateTime
  status                         AppointmentStatus @default(PENDING)
  remark                         String?
  cancelReason                   String?
  createdAt                      DateTime          @default(now())
  updatedAt                      DateTime          @updatedAt
  customer                       Customer          @relation(fields: [customerId], references: [id])
  serviceItem                    ServiceItem       @relation(fields: [serviceItemId], references: [id])
  staff                          Staff             @relation(fields: [staffId], references: [id])

  @@index([staffId, startAt, endAt])
  @@index([customerId, createdAt])
  @@index([status, startAt])
}
```

- [ ] **步骤 3：创建 Prisma 服务**

写入 `server/src/prisma/prisma.service.ts`：

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

写入 `server/src/prisma/prisma.module.ts`：

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **步骤 4：注册 PrismaModule**

修改 `server/src/app.module.ts`：

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
})
export class AppModule {}
```

- [ ] **步骤 5：写入种子数据**

写入 `server/prisma/seed.ts`：

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: '洗护', sortOrder: 1 },
    { name: '剪发', sortOrder: 2 },
    { name: '护理', sortOrder: 3 },
    { name: '染发', sortOrder: 4 },
    { name: '烫发', sortOrder: 5 },
  ];

  for (const category of categories) {
    await prisma.serviceCategory.upsert({
      where: { id: category.sortOrder },
      update: category,
      create: { id: category.sortOrder, ...category },
    });
  }

  const services = [
    { name: '洗吹', categoryId: 1, durationMinutes: 30, priceCents: 3800, sortOrder: 1 },
    { name: '洗剪吹', categoryId: 2, durationMinutes: 60, priceCents: 6800, sortOrder: 2 },
    { name: '基础护理', categoryId: 3, durationMinutes: 60, priceCents: 9800, sortOrder: 3 },
    { name: '染发', categoryId: 4, durationMinutes: 150, priceCents: 29800, sortOrder: 4 },
    { name: '烫发', categoryId: 5, durationMinutes: 180, priceCents: 39800, sortOrder: 5 },
  ];

  for (const service of services) {
    await prisma.serviceItem.upsert({
      where: { id: service.sortOrder },
      update: service,
      create: { id: service.sortOrder, ...service },
    });
  }

  const staff = await prisma.staff.upsert({
    where: { id: 1 },
    update: { name: 'Tony', title: '资深发型师', phone: '13800000000', isActive: true },
    create: { id: 1, name: 'Tony', title: '资深发型师', phone: '13800000000' },
  });

  for (const service of services) {
    await prisma.staffService.upsert({
      where: {
        staffId_serviceItemId: {
          staffId: staff.id,
          serviceItemId: service.sortOrder,
        },
      },
      update: {},
      create: {
        staffId: staff.id,
        serviceItemId: service.sortOrder,
        sortOrder: service.sortOrder,
      },
    });
  }

  for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek += 1) {
    await prisma.staffWeeklySchedule.upsert({
      where: { id: dayOfWeek },
      update: { staffId: staff.id, dayOfWeek, startTime: '09:00', endTime: '18:00', isWorking: true },
      create: { id: dayOfWeek, staffId: staff.id, dayOfWeek, startTime: '09:00', endTime: '18:00', isWorking: true },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **步骤 6：配置 seed 命令**

修改 `server/package.json`，加入：

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "scripts": {
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  }
}
```

保留 CLI 生成的原有 `scripts`，只追加上述命令。

- [ ] **步骤 7：执行迁移和种子数据**

运行：

```bash
cd server
bunx prisma migrate dev --name init
bunx prisma db seed
```

期望结果：

```text
Your database is now in sync with your schema.
The seed command has been executed.
```

- [ ] **步骤 8：提交数据库模型**

运行：

```bash
git add server/prisma server/src/prisma server/package.json server/src/app.module.ts
git commit -m "feat: add Prisma data model"
```

## 任务 3：实现时间工具和可预约时间纯函数

**文件：**

- 创建：`server/src/common/time/time.util.ts`
- 创建：`server/src/modules/availability/availability.types.ts`
- 创建：`server/test/availability.service.spec.ts`

- [ ] **步骤 1：写可预约时间单元测试**

写入 `server/test/availability.service.spec.ts`：

```ts
import {
  addMinutes,
  generateSlots,
  hasOverlap,
  isInsideWindow,
} from '../src/common/time/time.util';

describe('time.util', () => {
  it('根据服务时长和 30 分钟粒度生成可预约时间', () => {
    const slots = generateSlots({
      date: '2026-06-12',
      windowStart: '09:00',
      windowEnd: '11:00',
      durationMinutes: 60,
      stepMinutes: 30,
    });

    expect(slots).toEqual([
      {
        startAt: new Date('2026-06-12T09:00:00+08:00'),
        endAt: new Date('2026-06-12T10:00:00+08:00'),
      },
      {
        startAt: new Date('2026-06-12T09:30:00+08:00'),
        endAt: new Date('2026-06-12T10:30:00+08:00'),
      },
      {
        startAt: new Date('2026-06-12T10:00:00+08:00'),
        endAt: new Date('2026-06-12T11:00:00+08:00'),
      },
    ]);
  });

  it('识别重叠时间段', () => {
    expect(
      hasOverlap(
        new Date('2026-06-12T09:30:00+08:00'),
        new Date('2026-06-12T10:30:00+08:00'),
        new Date('2026-06-12T10:00:00+08:00'),
        new Date('2026-06-12T11:00:00+08:00'),
      ),
    ).toBe(true);

    expect(
      hasOverlap(
        new Date('2026-06-12T09:00:00+08:00'),
        new Date('2026-06-12T10:00:00+08:00'),
        new Date('2026-06-12T10:00:00+08:00'),
        new Date('2026-06-12T11:00:00+08:00'),
      ),
    ).toBe(false);
  });

  it('判断时间段是否完整落在工作窗口内', () => {
    expect(
      isInsideWindow(
        new Date('2026-06-12T09:00:00+08:00'),
        new Date('2026-06-12T10:00:00+08:00'),
        new Date('2026-06-12T09:00:00+08:00'),
        new Date('2026-06-12T18:00:00+08:00'),
      ),
    ).toBe(true);
  });

  it('按分钟增加时间', () => {
    expect(addMinutes(new Date('2026-06-12T09:00:00+08:00'), 90)).toEqual(
      new Date('2026-06-12T10:30:00+08:00'),
    );
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
cd server
bun test -- availability.service.spec.ts
```

期望结果：

```text
FAIL test/availability.service.spec.ts
Cannot find module '../src/common/time/time.util'
```

- [ ] **步骤 3：实现时间工具**

写入 `server/src/common/time/time.util.ts`：

```ts
type GenerateSlotsInput = {
  date: string;
  windowStart: string;
  windowEnd: string;
  durationMinutes: number;
  stepMinutes: number;
};

export type TimeSlot = {
  startAt: Date;
  endAt: Date;
};

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function hasOverlap(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date,
): boolean {
  return newStart < existingEnd && newEnd > existingStart;
}

export function isInsideWindow(
  startAt: Date,
  endAt: Date,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  return startAt >= windowStart && endAt <= windowEnd;
}

export function toShanghaiDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+08:00`);
}

export function generateSlots(input: GenerateSlotsInput): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const windowStart = toShanghaiDateTime(input.date, input.windowStart);
  const windowEnd = toShanghaiDateTime(input.date, input.windowEnd);

  for (
    let startAt = windowStart;
    addMinutes(startAt, input.durationMinutes) <= windowEnd;
    startAt = addMinutes(startAt, input.stepMinutes)
  ) {
    slots.push({
      startAt,
      endAt: addMinutes(startAt, input.durationMinutes),
    });
  }

  return slots;
}
```

- [ ] **步骤 4：创建可预约时间类型**

写入 `server/src/modules/availability/availability.types.ts`：

```ts
export type AvailabilitySlot = {
  startAt: Date;
  endAt: Date;
};

export type StaffAvailability = {
  staffId: number;
  staffName: string;
  slots: AvailabilitySlot[];
};
```

- [ ] **步骤 5：运行测试确认通过**

运行：

```bash
cd server
bun test -- availability.service.spec.ts
```

期望结果：

```text
PASS test/availability.service.spec.ts
```

- [ ] **步骤 6：提交时间工具**

运行：

```bash
git add server/src/common/time server/src/modules/availability/availability.types.ts server/test/availability.service.spec.ts
git commit -m "test: add availability time utilities"
```

## 任务 4：实现服务分类和服务项目 API

**文件：**

- 创建：`server/src/modules/service-categories/dto/service-category.dto.ts`
- 创建：`server/src/modules/service-categories/service-categories.service.ts`
- 创建：`server/src/modules/service-categories/service-categories.controller.ts`
- 创建：`server/src/modules/service-categories/service-categories.module.ts`
- 创建：`server/src/modules/service-items/dto/service-item.dto.ts`
- 创建：`server/src/modules/service-items/service-items.service.ts`
- 创建：`server/src/modules/service-items/service-items.controller.ts`
- 创建：`server/src/modules/service-items/service-items.module.ts`
- 修改：`server/src/app.module.ts`

- [ ] **步骤 1：创建分类 DTO**

写入 `server/src/modules/service-categories/dto/service-category.dto.ts`：

```ts
import { z } from 'zod';

export const serviceCategorySchema = z.object({
  name: z.string().min(1, '请输入分类名称'),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type ServiceCategoryDto = z.infer<typeof serviceCategorySchema>;
```

- [ ] **步骤 2：实现分类服务和控制器**

写入 `server/src/modules/service-categories/service-categories.service.ts`：

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceCategoryDto } from './dto/service-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.serviceCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  create(data: ServiceCategoryDto) {
    return this.prisma.serviceCategory.create({ data });
  }

  update(id: number, data: Partial<ServiceCategoryDto>) {
    return this.prisma.serviceCategory.update({ where: { id }, data });
  }

  async remove(id: number) {
    const serviceCount = await this.prisma.serviceItem.count({
      where: { categoryId: id },
    });

    if (serviceCount > 0) {
      return this.prisma.serviceCategory.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.serviceCategory.delete({ where: { id } });
  }
}
```

写入 `server/src/modules/service-categories/service-categories.controller.ts`：

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ServiceCategoryDto, serviceCategorySchema } from './dto/service-category.dto';

@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(private readonly service: ServiceCategoriesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(serviceCategorySchema)) body: ServiceCategoryDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<ServiceCategoryDto>) {
    return this.service.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
```

- [ ] **步骤 3：创建分类模块**

写入 `server/src/modules/service-categories/service-categories.module.ts`：

```ts
import { Module } from '@nestjs/common';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServiceCategoriesService } from './service-categories.service';

@Module({
  controllers: [ServiceCategoriesController],
  providers: [ServiceCategoriesService],
})
export class ServiceCategoriesModule {}
```

- [ ] **步骤 4：实现服务项目模块**

写入 `server/src/modules/service-items/dto/service-item.dto.ts`：

```ts
import { z } from 'zod';

export const serviceItemSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(1, '请输入服务名称'),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  priceCents: z.number().int().min(0),
  originalPriceCents: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type ServiceItemDto = z.infer<typeof serviceItemSchema>;
```

写入 `server/src/modules/service-items/service-items.service.ts`：

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppErrorCode } from '../../common/errors/app-error-code';
import { ServiceItemDto } from './dto/service-item.dto';

@Injectable()
export class ServiceItemsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.serviceItem.findMany({
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async detail(id: number) {
    const item = await this.prisma.serviceItem.findUnique({
      where: { id },
      include: { category: true, staffServices: true },
    });
    if (!item) {
      throw new NotFoundException({
        code: AppErrorCode.SERVICE_NOT_FOUND,
        message: '服务项目不存在',
      });
    }
    return item;
  }

  create(data: ServiceItemDto) {
    return this.prisma.serviceItem.create({ data });
  }

  update(id: number, data: Partial<ServiceItemDto>) {
    return this.prisma.serviceItem.update({ where: { id }, data });
  }

  updateStatus(id: number, isActive: boolean) {
    return this.prisma.serviceItem.update({ where: { id }, data: { isActive } });
  }

  async remove(id: number) {
    const appointmentCount = await this.prisma.appointment.count({
      where: { serviceItemId: id },
    });
    if (appointmentCount > 0) {
      return this.updateStatus(id, false);
    }
    return this.prisma.serviceItem.delete({ where: { id } });
  }
}
```

写入 `server/src/modules/service-items/service-items.controller.ts`：

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ServiceItemDto, serviceItemSchema } from './dto/service-item.dto';
import { ServiceItemsService } from './service-items.service';

@Controller('service-items')
export class ServiceItemsController {
  constructor(private readonly service: ServiceItemsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(Number(id));
  }

  @Post()
  create(@Body(new ZodValidationPipe(serviceItemSchema)) body: ServiceItemDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<ServiceItemDto>) {
    return this.service.update(Number(id), body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.updateStatus(Number(id), isActive);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
```

写入 `server/src/modules/service-items/service-items.module.ts`：

```ts
import { Module } from '@nestjs/common';
import { ServiceItemsController } from './service-items.controller';
import { ServiceItemsService } from './service-items.service';

@Module({
  controllers: [ServiceItemsController],
  providers: [ServiceItemsService],
  exports: [ServiceItemsService],
})
export class ServiceItemsModule {}
```

- [ ] **步骤 5：注册模块**

修改 `server/src/app.module.ts`：

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ServiceCategoriesModule } from './modules/service-categories/service-categories.module';
import { ServiceItemsModule } from './modules/service-items/service-items.module';

@Module({
  imports: [PrismaModule, ServiceCategoriesModule, ServiceItemsModule],
})
export class AppModule {}
```

- [ ] **步骤 6：运行测试**

运行：

```bash
cd server
bun test
```

期望结果：

```text
PASS
```

- [ ] **步骤 7：提交服务项目 API**

运行：

```bash
git add server/src/modules/service-categories server/src/modules/service-items server/src/app.module.ts
git commit -m "feat: add service catalog APIs"
```

## 任务 5：实现员工、技能绑定和排班 API

**文件：**

- 创建：`server/src/modules/staff/dto/staff.dto.ts`
- 创建：`server/src/modules/staff/staff.service.ts`
- 创建：`server/src/modules/staff/staff.controller.ts`
- 创建：`server/src/modules/staff/staff.module.ts`
- 创建：`server/src/modules/schedules/dto/schedule.dto.ts`
- 创建：`server/src/modules/schedules/schedules.service.ts`
- 创建：`server/src/modules/schedules/schedules.controller.ts`
- 创建：`server/src/modules/schedules/schedules.module.ts`
- 修改：`server/src/app.module.ts`

- [ ] **步骤 1：实现员工 DTO**

写入 `server/src/modules/staff/dto/staff.dto.ts`：

```ts
import { z } from 'zod';

export const staffSchema = z.object({
  name: z.string().min(1, '请输入员工姓名'),
  title: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const staffServicesSchema = z.object({
  serviceItemIds: z.array(z.number().int().positive()),
});

export type StaffDto = z.infer<typeof staffSchema>;
export type StaffServicesDto = z.infer<typeof staffServicesSchema>;
```

- [ ] **步骤 2：实现员工服务和控制器**

写入 `server/src/modules/staff/staff.service.ts`：

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.staff.findMany({
      include: { staffServices: { include: { serviceItem: true } } },
      orderBy: { id: 'asc' },
    });
  }

  detail(id: number) {
    return this.prisma.staff.findUnique({
      where: { id },
      include: { staffServices: { include: { serviceItem: true } } },
    });
  }

  create(data: StaffDto) {
    return this.prisma.staff.create({ data });
  }

  update(id: number, data: Partial<StaffDto>) {
    return this.prisma.staff.update({ where: { id }, data });
  }

  updateStatus(id: number, isActive: boolean) {
    return this.prisma.staff.update({ where: { id }, data: { isActive } });
  }

  async replaceServices(staffId: number, serviceItemIds: number[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.staffService.deleteMany({ where: { staffId } });
      await tx.staffService.createMany({
        data: serviceItemIds.map((serviceItemId, index) => ({
          staffId,
          serviceItemId,
          sortOrder: index,
        })),
      });
      return tx.staff.findUnique({
        where: { id: staffId },
        include: { staffServices: { include: { serviceItem: true } } },
      });
    });
  }
}
```

写入 `server/src/modules/staff/staff.controller.ts`：

```ts
import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  StaffDto,
  StaffServicesDto,
  staffSchema,
  staffServicesSchema,
} from './dto/staff.dto';
import { StaffService } from './staff.service';

@Controller('staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(Number(id));
  }

  @Post()
  create(@Body(new ZodValidationPipe(staffSchema)) body: StaffDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<StaffDto>) {
    return this.service.update(Number(id), body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.updateStatus(Number(id), isActive);
  }

  @Put(':id/services')
  replaceServices(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(staffServicesSchema)) body: StaffServicesDto,
  ) {
    return this.service.replaceServices(Number(id), body.serviceItemIds);
  }
}
```

- [ ] **步骤 3：创建员工模块**

写入 `server/src/modules/staff/staff.module.ts`：

```ts
import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
```

- [ ] **步骤 4：实现排班 DTO**

写入 `server/src/modules/schedules/dto/schedule.dto.ts`：

```ts
import { z } from 'zod';

export const weeklyScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(1).max(7),
      startTime: z.string().regex(/^\\d{2}:\\d{2}$/),
      endTime: z.string().regex(/^\\d{2}:\\d{2}$/),
      isWorking: z.boolean(),
    }),
  ),
});

export const timeOffSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  reason: z.string().optional(),
});

export type WeeklyScheduleDto = z.infer<typeof weeklyScheduleSchema>;
export type TimeOffDto = z.infer<typeof timeOffSchema>;
```

- [ ] **步骤 5：实现排班服务和控制器**

写入 `server/src/modules/schedules/schedules.service.ts`：

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeOffDto, WeeklyScheduleDto } from './dto/schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  listWeekly(staffId: number) {
    return this.prisma.staffWeeklySchedule.findMany({
      where: { staffId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  replaceWeekly(staffId: number, dto: WeeklyScheduleDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.staffWeeklySchedule.deleteMany({ where: { staffId } });
      await tx.staffWeeklySchedule.createMany({
        data: dto.schedules.map((schedule) => ({ staffId, ...schedule })),
      });
      return tx.staffWeeklySchedule.findMany({
        where: { staffId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }

  listTimeOff(staffId: number) {
    return this.prisma.staffTimeOff.findMany({
      where: { staffId },
      orderBy: { startAt: 'asc' },
    });
  }

  createTimeOff(staffId: number, dto: TimeOffDto) {
    return this.prisma.staffTimeOff.create({
      data: {
        staffId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        reason: dto.reason,
      },
    });
  }

  updateTimeOff(id: number, dto: Partial<TimeOffDto>) {
    return this.prisma.staffTimeOff.update({
      where: { id },
      data: {
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        reason: dto.reason,
      },
    });
  }

  removeTimeOff(id: number) {
    return this.prisma.staffTimeOff.delete({ where: { id } });
  }
}
```

写入 `server/src/modules/schedules/schedules.controller.ts`：

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  TimeOffDto,
  WeeklyScheduleDto,
  timeOffSchema,
  weeklyScheduleSchema,
} from './dto/schedule.dto';

@Controller()
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get('staff/:staffId/weekly-schedules')
  listWeekly(@Param('staffId') staffId: string) {
    return this.service.listWeekly(Number(staffId));
  }

  @Put('staff/:staffId/weekly-schedules')
  replaceWeekly(
    @Param('staffId') staffId: string,
    @Body(new ZodValidationPipe(weeklyScheduleSchema)) body: WeeklyScheduleDto,
  ) {
    return this.service.replaceWeekly(Number(staffId), body);
  }

  @Get('staff/:staffId/time-off')
  listTimeOff(@Param('staffId') staffId: string) {
    return this.service.listTimeOff(Number(staffId));
  }

  @Post('staff/:staffId/time-off')
  createTimeOff(
    @Param('staffId') staffId: string,
    @Body(new ZodValidationPipe(timeOffSchema)) body: TimeOffDto,
  ) {
    return this.service.createTimeOff(Number(staffId), body);
  }

  @Patch('time-off/:id')
  updateTimeOff(@Param('id') id: string, @Body() body: Partial<TimeOffDto>) {
    return this.service.updateTimeOff(Number(id), body);
  }

  @Delete('time-off/:id')
  removeTimeOff(@Param('id') id: string) {
    return this.service.removeTimeOff(Number(id));
  }
}
```

- [ ] **步骤 6：创建排班模块并注册**

写入 `server/src/modules/schedules/schedules.module.ts`：

```ts
import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
```

修改 `server/src/app.module.ts`，加入：

```ts
import { StaffModule } from './modules/staff/staff.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
```

并将 `StaffModule`、`SchedulesModule` 放入 `imports`。

- [ ] **步骤 7：运行测试并提交**

运行：

```bash
cd server
bun test
git add server/src/modules/staff server/src/modules/schedules server/src/app.module.ts
git commit -m "feat: add staff and schedule APIs"
```

## 任务 6：实现可预约时间 API

**文件：**

- 创建：`server/src/modules/availability/availability.service.ts`
- 创建：`server/src/modules/availability/availability.controller.ts`
- 创建：`server/src/modules/availability/availability.module.ts`
- 修改：`server/src/app.module.ts`

- [ ] **步骤 1：实现可预约时间服务**

写入 `server/src/modules/availability/availability.service.ts`：

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { AppErrorCode } from '../../common/errors/app-error-code';
import { generateSlots, hasOverlap, toShanghaiDateTime } from '../../common/time/time.util';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailability(serviceItemId: number, date: string, staffId?: number) {
    const service = await this.prisma.serviceItem.findUnique({
      where: { id: serviceItemId },
    });
    if (!service) {
      throw new NotFoundException({
        code: AppErrorCode.SERVICE_NOT_FOUND,
        message: '服务项目不存在',
      });
    }

    const staffList = await this.prisma.staff.findMany({
      where: {
        id: staffId,
        isActive: true,
        staffServices: { some: { serviceItemId } },
      },
      orderBy: { id: 'asc' },
    });

    const grouped = [];
    for (const staff of staffList) {
      const slots = await this.getStaffSlots(staff.id, date, service.durationMinutes);
      grouped.push({ staffId: staff.id, staffName: staff.name, slots });
    }

    if (staffId) {
      return {
        date,
        serviceItemId,
        staffId,
        slots: grouped[0]?.slots ?? [],
      };
    }

    return { date, serviceItemId, staff: grouped };
  }

  private async getStaffSlots(staffId: number, date: string, durationMinutes: number) {
    const dayOfWeek = this.toDayOfWeek(date);
    const schedules = await this.prisma.staffWeeklySchedule.findMany({
      where: { staffId, dayOfWeek, isWorking: true },
    });
    const timeOffs = await this.prisma.staffTimeOff.findMany({
      where: { staffId },
    });
    const appointments = await this.prisma.appointment.findMany({
      where: { staffId, status: AppointmentStatus.PENDING },
    });

    return schedules.flatMap((schedule) => {
      const candidates = generateSlots({
        date,
        windowStart: schedule.startTime,
        windowEnd: schedule.endTime,
        durationMinutes,
        stepMinutes: 30,
      });

      return candidates.filter((slot) => {
        const overlapsTimeOff = timeOffs.some((item) =>
          hasOverlap(slot.startAt, slot.endAt, item.startAt, item.endAt),
        );
        const overlapsAppointment = appointments.some((item) =>
          hasOverlap(slot.startAt, slot.endAt, item.startAt, item.endAt),
        );
        return !overlapsTimeOff && !overlapsAppointment;
      });
    });
  }

  private toDayOfWeek(date: string): number {
    const jsDay = toShanghaiDateTime(date, '00:00').getDay();
    return jsDay === 0 ? 7 : jsDay;
  }
}
```

- [ ] **步骤 2：实现可预约时间控制器和模块**

写入 `server/src/modules/availability/availability.controller.ts`：

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get()
  getAvailability(
    @Query('serviceItemId') serviceItemId: string,
    @Query('date') date: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.service.getAvailability(
      Number(serviceItemId),
      date,
      staffId ? Number(staffId) : undefined,
    );
  }
}
```

写入 `server/src/modules/availability/availability.module.ts`：

```ts
import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
```

- [ ] **步骤 3：注册模块并测试**

修改 `server/src/app.module.ts`，加入 `AvailabilityModule`。

运行：

```bash
cd server
bun test
```

期望结果：

```text
PASS
```

- [ ] **步骤 4：提交可预约时间 API**

运行：

```bash
git add server/src/modules/availability server/src/app.module.ts
git commit -m "feat: add availability API"
```

## 任务 7：实现预约订单 API 和冲突校验

**文件：**

- 创建：`server/src/modules/appointments/dto/appointment.dto.ts`
- 创建：`server/src/modules/appointments/appointments.service.ts`
- 创建：`server/src/modules/appointments/appointments.controller.ts`
- 创建：`server/src/modules/appointments/appointments.module.ts`
- 创建：`server/test/appointments.e2e-spec.ts`
- 修改：`server/src/app.module.ts`

- [ ] **步骤 1：写预约冲突集成测试**

写入 `server/test/appointments.e2e-spec.ts`：

```ts
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Appointments', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('同一员工同一时间段不能重复预约', async () => {
    const payload = {
      serviceItemId: 2,
      staffId: 1,
      customerName: '张三',
      customerPhone: '13900000000',
      startAt: '2026-06-12T10:00:00+08:00',
      remark: '测试预约',
    };

    const first = await request(app.getHttpServer()).post('/appointments').send(payload);
    expect(first.status).toBe(201);
    expect(first.body.error).toBeNull();

    const second = await request(app.getHttpServer()).post('/appointments').send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('APPOINTMENT_CONFLICT');
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
cd server
bun test -- appointments.e2e-spec.ts
```

期望结果：

```text
FAIL
Cannot POST /appointments
```

- [ ] **步骤 3：实现预约 DTO**

写入 `server/src/modules/appointments/dto/appointment.dto.ts`：

```ts
import { z } from 'zod';

export const createAppointmentSchema = z.object({
  serviceItemId: z.number().int().positive(),
  staffId: z.number().int().positive(),
  customerName: z.string().min(1, '请输入预约人姓名'),
  customerPhone: z.string().min(1, '请输入手机号'),
  startAt: z.string().datetime({ offset: true }),
  remark: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  cancelReason: z.string().optional(),
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;
export type CancelAppointmentDto = z.infer<typeof cancelAppointmentSchema>;
```

- [ ] **步骤 4：实现预约服务**

写入 `server/src/modules/appointments/appointments.service.ts`：

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { AppErrorCode } from '../../common/errors/app-error-code';
import {
  addMinutes,
  hasOverlap,
  isInsideWindow,
  toShanghaiDateTime,
} from '../../common/time/time.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CancelAppointmentDto, CreateAppointmentDto } from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.appointment.findMany({
      orderBy: { startAt: 'desc' },
    });
  }

  async detail(id: number) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new NotFoundException({
        code: AppErrorCode.APPOINTMENT_NOT_FOUND,
        message: '预约不存在',
      });
    }
    return appointment;
  }

  async create(dto: CreateAppointmentDto) {
    const service = await this.prisma.serviceItem.findUnique({ where: { id: dto.serviceItemId } });
    if (!service || !service.isActive) {
      throw new NotFoundException({
        code: AppErrorCode.SERVICE_NOT_FOUND,
        message: '服务项目不存在或已停用',
      });
    }

    const staff = await this.prisma.staff.findUnique({ where: { id: dto.staffId } });
    if (!staff || !staff.isActive) {
      throw new NotFoundException({
        code: AppErrorCode.STAFF_NOT_FOUND,
        message: '员工不存在或已停用',
      });
    }

    const staffService = await this.prisma.staffService.findUnique({
      where: {
        staffId_serviceItemId: {
          staffId: dto.staffId,
          serviceItemId: dto.serviceItemId,
        },
      },
    });
    if (!staffService) {
      throw new ConflictException({
        code: AppErrorCode.STAFF_SERVICE_UNSUPPORTED,
        message: '该员工不能提供此服务',
      });
    }

    const startAt = new Date(dto.startAt);
    const endAt = addMinutes(startAt, service.durationMinutes);
    const date = dto.startAt.slice(0, 10);
    const dayOfWeek = this.toDayOfWeek(date);

    const schedules = await this.prisma.staffWeeklySchedule.findMany({
      where: { staffId: dto.staffId, dayOfWeek, isWorking: true },
    });
    const insideWorkingHours = schedules.some((schedule) =>
      isInsideWindow(
        startAt,
        endAt,
        toShanghaiDateTime(date, schedule.startTime),
        toShanghaiDateTime(date, schedule.endTime),
      ),
    );
    if (!insideWorkingHours) {
      throw new ConflictException({
        code: AppErrorCode.OUTSIDE_WORKING_HOURS,
        message: '预约时间不在员工工作时间内',
      });
    }

    const timeOffs = await this.prisma.staffTimeOff.findMany({
      where: { staffId: dto.staffId },
    });
    const overlapsTimeOff = timeOffs.some((item) =>
      hasOverlap(startAt, endAt, item.startAt, item.endAt),
    );
    if (overlapsTimeOff) {
      throw new ConflictException({
        code: AppErrorCode.STAFF_TIME_OFF,
        message: '该时间段员工不可预约',
      });
    }

    const pendingAppointments = await this.prisma.appointment.findMany({
      where: {
        staffId: dto.staffId,
        status: AppointmentStatus.PENDING,
      },
    });

    const isConflict = pendingAppointments.some((item) =>
      hasOverlap(startAt, endAt, item.startAt, item.endAt),
    );
    if (isConflict) {
      throw new ConflictException({
        code: AppErrorCode.APPOINTMENT_CONFLICT,
        message: '该时间段已被预约',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { phone: dto.customerPhone },
        update: { name: dto.customerName },
        create: { name: dto.customerName, phone: dto.customerPhone },
      });

      return tx.appointment.create({
        data: {
          customerId: customer.id,
          serviceItemId: service.id,
          staffId: staff.id,
          customerNameSnapshot: customer.name,
          customerPhoneSnapshot: customer.phone,
          serviceNameSnapshot: service.name,
          serviceDurationMinutesSnapshot: service.durationMinutes,
          servicePriceCentsSnapshot: service.priceCents,
          staffNameSnapshot: staff.name,
          startAt,
          endAt,
          status: AppointmentStatus.PENDING,
          remark: dto.remark,
        },
      });
    });
  }

  cancel(id: number, dto: CancelAppointmentDto) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
        cancelReason: dto.cancelReason,
      },
    });
  }

  complete(id: number) {
    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.COMPLETED },
    });
  }

  private toDayOfWeek(date: string): number {
    const jsDay = toShanghaiDateTime(date, '00:00').getDay();
    return jsDay === 0 ? 7 : jsDay;
  }
}
```

- [ ] **步骤 5：实现预约控制器和模块**

写入 `server/src/modules/appointments/appointments.controller.ts`：

```ts
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CancelAppointmentDto,
  CreateAppointmentDto,
  cancelAppointmentSchema,
  createAppointmentSchema,
} from './dto/appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(Number(id));
  }

  @Post()
  create(@Body(new ZodValidationPipe(createAppointmentSchema)) body: CreateAppointmentDto) {
    return this.service.create(body);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelAppointmentSchema)) body: CancelAppointmentDto,
  ) {
    return this.service.cancel(Number(id), body);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.service.complete(Number(id));
  }
}
```

写入 `server/src/modules/appointments/appointments.module.ts`：

```ts
import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
```

- [ ] **步骤 6：注册模块并运行测试**

修改 `server/src/app.module.ts`，加入 `AppointmentsModule`。

运行：

```bash
cd server
bun test -- appointments.e2e-spec.ts
```

期望结果：

```text
PASS test/appointments.e2e-spec.ts
```

- [ ] **步骤 7：提交预约 API**

运行：

```bash
git add server/src/modules/appointments server/src/app.module.ts server/test/appointments.e2e-spec.ts
git commit -m "feat: add appointment APIs"
```

## 任务 8：补齐本地验收命令和 README

**文件：**

- 创建：`server/README.md`
- 修改：`server/package.json`

- [ ] **步骤 1：补充 README**

写入 `server/README.md`：

````md
# 美发店预约系统后端

## 本地启动

```bash
bun install
cp .env.example .env
bunx prisma migrate dev
bunx prisma db seed
bun run start:dev
```

默认服务地址：

```text
http://localhost:3000
```

## 常用命令

```bash
bun test
bunx prisma studio
bunx prisma migrate dev
```

## 第一阶段接口范围

- 服务分类：`/service-categories`
- 服务项目：`/service-items`
- 员工：`/staff`
- 排班：`/staff/:staffId/weekly-schedules`
- 不可预约时间：`/staff/:staffId/time-off`
- 可预约时间：`/availability`
- 预约订单：`/appointments`
````

- [ ] **步骤 2：运行完整检查**

运行：

```bash
cd server
bun test
bun run build
```

期望结果：

```text
PASS
```

并且：

```text
Found 0 errors.
```

- [ ] **步骤 3：提交 README**

运行：

```bash
git add server/README.md server/package.json
git commit -m "docs: add backend runbook"
```

## 自查清单

- 设计文档中的服务分类、服务项目、员工、员工技能、排班、不可预约时间、客户、预约订单都有对应任务。
- 可预约时间由后端计算，且包含 30 分钟粒度、排班、不可预约时间、已有预约过滤。
- 预约创建会重新校验冲突，不能只相信可预约时间预览接口。
- 第一阶段保留 `auth/` 模块边界，但不阻塞本地开发。
- `.DS_Store` 和 SQLite 数据库文件不会进入 git。

## 执行方式

计划完成后有两种执行方式：

1. **子代理执行，推荐。** 每个任务派一个新代理执行，我在任务之间审查结果，节奏快且上下文更干净。
2. **当前会话内执行。** 我在当前会话里按计划逐步实现，每完成一批做一次检查。
