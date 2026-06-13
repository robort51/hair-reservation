# 美发店预约系统后端

单门店美发预约系统后端，使用 NestJS、Prisma、SQLite 和 Jest。当前阶段包含服务分类、服务项目、员工、排班、可预约时间和预约订单冲突校验。

## 本地启动

以下命令在 `server/` 目录执行：

```bash
bun install
cp .env.example .env
bunx prisma migrate dev
bunx prisma db seed
bun run start:dev
```

默认服务地址：

```text
http://localhost:3001
```

## 常用命令

```bash
bun run start:dev
bun run test
bun run test:e2e
bun run check
bunx prisma migrate dev
bunx prisma db seed
bunx prisma studio
```

说明：

- 普通单元测试使用 `bun run test`。
- 预约接口 e2e 测试使用 `bun run test:e2e`。
- 不要使用 `bun test -- appointments.e2e-spec.ts` 跑预约 e2e。当前项目使用 Jest/Nest 测试栈，且 Prisma 7 的 SQLite adapter 需要 Node 运行时。

## 本地验收

```bash
bun run check
```

`check` 会依次执行：

```bash
bun run lint
bunx tsc --noEmit --pretty false
bun run test
bun run test:e2e
bun run build
bunx prisma validate
```

## 第一阶段接口范围

- 服务分类：`/service-categories`
- 服务项目：`/service-items`
- 员工：`/staff`
- 员工服务能力：`/staff/:id/services`
- 排班：`/staff/:staffId/weekly-schedules`
- 不可预约时间：`/staff/:staffId/time-off`
- 可预约时间：`/availability`
- 预约订单：`/appointments`

## 数据库

本地 SQLite 地址来自 `.env`：

```env
DATABASE_URL="file:./dev.db"
```

Prisma 7 的 datasource URL 配置在 `prisma.config.ts` 中，seed 命令也配置在那里。SQLite 本地数据库文件已加入 `.gitignore`，不要提交 `dev.db`。
