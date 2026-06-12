# 美发店预约系统后端设计

日期：2026-06-12

## 目标

搭建单门店美发店预约系统的第一阶段后端基础。这个阶段只覆盖数据库模型和 HTTP API，供后续管理后台网站和微信小程序调用。

后端需要支持服务项目配置、员工配置、员工排班、可预约时间计算、预约订单状态流转。这个阶段不包含管理后台页面、小程序页面、在线支付、会员卡、优惠券、多门店、营销活动等功能。

## 技术栈

- 运行环境：Node.js
- 后端框架：NestJS
- 数据库：SQLite，适合 MVP 阶段
- ORM 和数据库迁移：Prisma
- API 风格：JSON REST API
- 时间存储：通过 Prisma 统一保存 ISO datetime，后端按固定时区处理

NestJS 只负责后端 API，不负责页面渲染。后续管理后台网站和微信小程序都会通过 HTTPS 调用这套后端接口。

## 项目结构

后端代码放在 `server/` 目录下。

```text
server/
  src/
    app.module.ts
    main.ts
    common/
      errors/
      validation/
    prisma/
      prisma.module.ts
      prisma.service.ts
    modules/
      auth/
      service-categories/
      service-items/
      staff/
      schedules/
      appointments/
      availability/
  prisma/
    schema.prisma
    migrations/
    dev.db
```

## 领域模型

### ServiceCategory

服务分类，比如洗护、剪发、护理、染发、烫发。

初始分类：

- 洗护
- 剪发
- 护理
- 染发
- 烫发

字段：

- `id`
- `name`
- `sortOrder`
- `isActive`
- `createdAt`
- `updatedAt`

### ServiceItem

可被预约的具体服务项目，比如洗剪吹、染发。

初始服务：

- 洗吹
- 洗剪吹
- 基础护理
- 染发
- 烫发

字段：

- `id`
- `categoryId`
- `name`
- `description`
- `durationMinutes`
- `priceCents`
- `originalPriceCents`
- `sortOrder`
- `isActive`
- `createdAt`
- `updatedAt`

价格用分保存，比如 99 元保存为 `9900`，避免小数金额计算误差。

### Staff

员工或发型师。

字段：

- `id`
- `name`
- `title`
- `phone`
- `avatarUrl`
- `bio`
- `isActive`
- `createdAt`
- `updatedAt`

### StaffService

员工和服务项目的多对多关系。一个员工可以提供多个服务，一个服务也可以由多个员工提供。

字段：

- `id`
- `staffId`
- `serviceItemId`
- `sortOrder`
- `createdAt`

唯一约束：

- `(staffId, serviceItemId)`

### StaffWeeklySchedule

员工每周重复排班。

字段：

- `id`
- `staffId`
- `dayOfWeek`
- `startTime`
- `endTime`
- `isWorking`
- `createdAt`
- `updatedAt`

`dayOfWeek` 使用 1 到 7，1 表示周一，7 表示周日。

`startTime` 和 `endTime` 使用本地时间字符串，比如 `09:00`、`18:00`。

### StaffTimeOff

员工一次性的不可预约时间，比如请假、临时休息、手动锁定时间段。

字段：

- `id`
- `staffId`
- `startAt`
- `endAt`
- `reason`
- `createdAt`
- `updatedAt`

### Customer

预约客户，可以来自微信小程序，也可以由后台手动录入。

字段：

- `id`
- `wechatOpenId`
- `name`
- `phone`
- `createdAt`
- `updatedAt`

第一阶段 `wechatOpenId` 可以为空，这样在小程序登录还没接入前，也可以通过后台创建测试预约。

### Appointment

预约订单。

字段：

- `id`
- `customerId`
- `serviceItemId`
- `staffId`
- `customerNameSnapshot`
- `customerPhoneSnapshot`
- `serviceNameSnapshot`
- `serviceDurationMinutesSnapshot`
- `servicePriceCentsSnapshot`
- `staffNameSnapshot`
- `startAt`
- `endAt`
- `status`
- `remark`
- `cancelReason`
- `createdAt`
- `updatedAt`

状态值：

- `PENDING`：已预约，待服务
- `COMPLETED`：已完成服务
- `CANCELED`：已取消
- `EXPIRED`：已过期

订单里保存客户、服务、价格、员工的快照。这样即使后续修改了服务价格或员工资料，历史订单仍然能正确展示当时的信息。

索引：

- `(staffId, startAt, endAt)`
- `(customerId, createdAt)`
- `(status, startAt)`

## 可预约时间规则

可预约时间必须由后端计算，不能交给前端自己生成。

输入条件：

- 服务项目
- 员工，或者在预览可预约时间时不指定员工
- 目标日期
- 已有预约
- 员工每周排班
- 员工不可预约时间

规则：

1. 服务项目必须处于启用状态。
2. 员工必须处于启用状态。
3. 员工必须能提供该服务，也就是存在 `StaffService` 关系。
4. 预约时间段必须完全落在员工工作时间内。
5. 预约时间段不能和员工不可预约时间重叠。
6. 预约时间段不能和同一员工已有的 `PENDING` 预约重叠。
7. 已取消和已完成的预约不再占用时间。
8. MVP 阶段的时间粒度是 30 分钟。

时间冲突判断：

```text
newStart < existingEnd AND newEnd > existingStart
```

第一阶段创建预约时必须传入明确的 `staffId`。可预约时间接口允许不传 `staffId`，此时按员工分组返回可预约时间，方便后续小程序做“到店安排”的交互，但真正提交预约时仍然要落到一个具体员工。

## API 设计

所有 API 使用统一响应格式：

```json
{
  "data": {},
  "error": null
}
```

错误响应格式：

```json
{
  "data": null,
  "error": {
    "code": "APPOINTMENT_CONFLICT",
    "message": "该时间段已被预约"
  }
}
```

### 服务分类

- `GET /service-categories`
- `POST /service-categories`
- `PATCH /service-categories/:id`
- `DELETE /service-categories/:id`

如果分类下已经有服务项目，删除时不做物理删除，而是改为停用。

### 服务项目

- `GET /service-items`
- `GET /service-items/:id`
- `POST /service-items`
- `PATCH /service-items/:id`
- `PATCH /service-items/:id/status`
- `DELETE /service-items/:id`

如果服务项目已经有关联预约，删除时不做物理删除，而是改为停用。

### 员工

- `GET /staff`
- `GET /staff/:id`
- `POST /staff`
- `PATCH /staff/:id`
- `PATCH /staff/:id/status`
- `DELETE /staff/:id`
- `PUT /staff/:id/services`

`PUT /staff/:id/services` 用来替换该员工可提供的服务列表。

### 排班

- `GET /staff/:staffId/weekly-schedules`
- `PUT /staff/:staffId/weekly-schedules`
- `GET /staff/:staffId/time-off`
- `POST /staff/:staffId/time-off`
- `PATCH /time-off/:id`
- `DELETE /time-off/:id`

### 可预约时间

- `GET /availability?serviceItemId=...&staffId=...&date=YYYY-MM-DD`
- `GET /availability?serviceItemId=...&date=YYYY-MM-DD`

传入 `staffId` 时，返回某个员工的可预约时间：

```json
{
  "date": "2026-06-12",
  "serviceItemId": "svc_1",
  "staffId": "staff_1",
  "slots": [
    {
      "startAt": "2026-06-12T09:00:00+08:00",
      "endAt": "2026-06-12T10:00:00+08:00"
    }
  ]
}
```

不传 `staffId` 时，按员工分组返回可预约时间：

```json
{
  "date": "2026-06-12",
  "serviceItemId": "svc_1",
  "staff": [
    {
      "staffId": "staff_1",
      "staffName": "Tony",
      "slots": [
        {
          "startAt": "2026-06-12T09:00:00+08:00",
          "endAt": "2026-06-12T10:00:00+08:00"
        }
      ]
    }
  ]
}
```

### 预约订单

- `GET /appointments`
- `GET /appointments/:id`
- `POST /appointments`
- `PATCH /appointments/:id/cancel`
- `PATCH /appointments/:id/complete`

`POST /appointments` 必须在创建订单时重新校验可预约性。可预约时间接口只是预览，不能作为最终可信结果。

## 创建预约流程

1. 校验服务、员工、客户信息和预约开始时间。
2. 读取服务时长。
3. 计算 `endAt = startAt + durationMinutes`。
4. 校验员工是否能提供该服务。
5. 校验员工排班和不可预约时间。
6. 校验同一员工的预约时间冲突。
7. 按手机号或微信 open id 创建/更新客户。
8. 保存预约订单，同时写入服务、员工、客户快照。
9. 返回预约详情。

时间冲突校验和订单创建必须放在同一个事务里。SQLite 的并发模型比 MySQL/PostgreSQL 简单，但代码结构要保持干净，方便未来迁移数据库。

## 错误处理

重要错误码：

- `SERVICE_NOT_FOUND`
- `SERVICE_INACTIVE`
- `STAFF_NOT_FOUND`
- `STAFF_INACTIVE`
- `STAFF_SERVICE_UNSUPPORTED`
- `OUTSIDE_WORKING_HOURS`
- `STAFF_TIME_OFF`
- `APPOINTMENT_CONFLICT`
- `APPOINTMENT_NOT_FOUND`
- `APPOINTMENT_STATUS_INVALID`
- `VALIDATION_ERROR`

## 认证

第一阶段本地开发可以先不做完整的公开认证，但代码结构中保留 `auth/` 模块，方便后续添加：

- 管理后台账号密码登录
- 微信小程序 `code` 登录
- 管理员接口的角色校验

上线到公网前，所有后台写操作接口都必须加权限保护。

## 种子数据

后端需要提供本地开发用的种子数据：

- 上面列出的服务分类
- 五个初始服务项目
- 一到两个员工
- 默认每周排班：09:00 到 18:00

初始服务时长：

- 洗吹：30 分钟
- 洗剪吹：60 分钟
- 基础护理：60 分钟
- 染发：150 分钟
- 烫发：180 分钟

这些默认值后续都可以在管理后台编辑。

## 测试策略

单元测试：

- 可预约时间生成
- 时间冲突判断
- 根据服务时长计算结束时间
- 非法状态流转

集成测试：

- 空闲时间可以创建预约
- 和已有预约重叠时创建失败
- 已取消的预约不再占用时间
- 停用服务不能被预约
- 员工不会该服务时不能被预约

## 部署说明

SQLite 适合单门店 MVP。部署后需要定期备份数据库文件。如果后续需要更高访问量、多设备同时管理、经营分析或多门店支持，再迁移到 MySQL 或 PostgreSQL。

微信小程序正式环境需要通过已备案的 HTTPS 域名访问后端，比如 `api.example.com`。后续管理后台网站可以使用单独域名，比如 `admin.example.com`。

## 本阶段不做

- 管理后台页面
- 微信小程序页面
- 微信支付
- 短信或订阅消息通知
- 会员卡
- 优惠券
- 多门店或多租户支持
- 文件上传和图片管理
- 公开 H5 预约网站

## 审批节点

这份设计确认后，下一步是编写后端基础设施的实现计划。实现计划确认之前，不开始写后端代码。
