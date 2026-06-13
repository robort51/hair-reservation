# 后台排班与导航拆分实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 支持员工每天多个排班时间段，拆分服务/员工/排班管理页面，并隔离客户预约端和后台管理端导航。

**架构：** 后端沿用 `StaffWeeklySchedule` 多行模型，同一天可保存多条排班记录；前端把原 `StoreSettings` 拆成服务管理、员工管理、排班管理三个客户端组件。客户页面只显示首页和预约入口，后台页面内部保留管理导航。

**技术栈：** Next.js、React、TypeScript、NestJS、Prisma、Jest、Bun。

---

### 任务 1：后端多段排班验证

**文件：**
- 修改：`server/test/schedule.dto.spec.ts`
- 修改：`server/test/availability.service.spec.ts`

- [ ] 增加 DTO 测试：同一天提交两段 `09:00-11:00`、`13:00-19:00` 应通过。
- [ ] 增加可用时段测试：同一天两段排班生成时段时，中午空档不出现。
- [ ] 运行 `bun run test -- schedule.dto.spec.ts availability.service.spec.ts`，确认通过。

### 任务 2：拆分后台管理组件

**文件：**
- 新建：`web/components/admin/AdminNav.tsx`
- 新建：`web/components/admin/ServicesManager.tsx`
- 新建：`web/components/admin/StaffManager.tsx`
- 新建：`web/components/admin/SchedulesManager.tsx`
- 修改：`web/components/admin/StoreSettings.tsx`

- [ ] 抽出后台导航组件，只在后台页面使用。
- [ ] 把服务管理逻辑迁到 `ServicesManager`。
- [ ] 把员工管理逻辑迁到 `StaffManager`。
- [ ] 把排班管理逻辑迁到 `SchedulesManager`，支持每天添加/删除多个时间段。
- [ ] `StoreSettings` 改为三个入口卡片。

### 任务 3：新增后台路由并隔离客户端

**文件：**
- 新建：`web/app/admin/services/page.tsx`
- 新建：`web/app/admin/staff/page.tsx`
- 新建：`web/app/admin/schedules/page.tsx`
- 修改：`web/app/page.tsx`
- 修改：`web/components/booking/BookingFlow.tsx`
- 修改：`web/components/admin/AdminAppointments.tsx`
- 修改：`web/app/globals.css`

- [ ] 首页与预约页移除后台入口。
- [ ] 后台导航增加今日预约、全部预约、服务、员工、排班。
- [ ] CSS 增加后台入口卡片、多段排班行样式和移动端布局。

### 任务 4：验证

- [ ] 运行 `web` 的 `bun run typecheck` 与 `bun run build`。
- [ ] 运行 `server` 的 `bun run test`、`bunx tsc --noEmit --pretty false`、`bun run build`。
- [ ] 浏览器检查 `/`、`/book` 不显示后台入口。
- [ ] 浏览器检查 `/admin/services`、`/admin/staff`、`/admin/schedules` 可渲染，排班页可保存多段时间。
