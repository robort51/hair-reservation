# Hair Salon Reservation Backend Design

Date: 2026-06-12

## Goal

Build the first backend foundation for a single-store hair salon reservation system. The first phase covers the database model and HTTP API needed by a future admin website and WeChat mini program.

The backend will support service setup, staff setup, staff schedules, available time calculation, and reservation lifecycle management. It will not include the admin website UI, mini program UI, online payment, membership cards, coupons, multi-store support, or marketing features in this phase.

## Technical Stack

- Runtime: Node.js
- Backend framework: NestJS
- Database: SQLite for the MVP
- ORM and migrations: Prisma
- API style: JSON REST APIs
- Time storage: ISO datetime values in the server timezone, normalized consistently through Prisma

NestJS is used for the API service, not for page rendering. Admin web pages and WeChat mini program pages will later call this backend over HTTPS after deployment.

## Project Shape

The backend should live under `server/`.

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

## Domain Model

### ServiceCategory

Represents a group of salon services.

Initial categories:

- 洗护
- 剪发
- 护理
- 染发
- 烫发

Fields:

- `id`
- `name`
- `sortOrder`
- `isActive`
- `createdAt`
- `updatedAt`

### ServiceItem

Represents a bookable service, such as 洗剪吹 or 染发.

Initial services:

- 洗吹
- 洗剪吹
- 基础护理
- 染发
- 烫发

Fields:

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

Prices are stored in cents to avoid floating point rounding issues.

### Staff

Represents a stylist or employee who can provide services.

Fields:

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

Many-to-many relation between staff and services. A staff member can provide multiple services, and a service can be provided by multiple staff members.

Fields:

- `id`
- `staffId`
- `serviceItemId`
- `sortOrder`
- `createdAt`

Unique constraint:

- `(staffId, serviceItemId)`

### StaffWeeklySchedule

Represents repeating weekly working hours.

Fields:

- `id`
- `staffId`
- `dayOfWeek`
- `startTime`
- `endTime`
- `isWorking`
- `createdAt`
- `updatedAt`

`dayOfWeek` uses 1 to 7, where 1 is Monday and 7 is Sunday.

`startTime` and `endTime` are local time strings such as `09:00` and `18:00`.

### StaffTimeOff

Represents one-off unavailable periods such as leave, lunch break override, or manual blocks.

Fields:

- `id`
- `staffId`
- `startAt`
- `endAt`
- `reason`
- `createdAt`
- `updatedAt`

### Customer

Represents a customer from a WeChat mini program or manually entered appointment.

Fields:

- `id`
- `wechatOpenId`
- `name`
- `phone`
- `createdAt`
- `updatedAt`

`wechatOpenId` is optional in the first backend phase so that admin-created test appointments can exist before mini program login is implemented.

### Appointment

Represents one reservation.

Fields:

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

Status values:

- `PENDING`: booked and waiting for service
- `COMPLETED`: service completed
- `CANCELED`: canceled by customer or admin
- `EXPIRED`: appointment time passed without completion

Snapshots keep old appointments readable even if services, prices, or staff profiles later change.

Indexes:

- `(staffId, startAt, endAt)`
- `(customerId, createdAt)`
- `(status, startAt)`

## Availability Rules

The backend, not the client, must decide which time slots are available.

Inputs:

- service item
- staff member, or no specific staff member when previewing grouped availability
- target date
- existing appointments
- weekly schedule
- time off blocks

Rules:

1. The requested service must be active.
2. The chosen staff member must be active.
3. The chosen staff member must be linked to the service through `StaffService`.
4. The requested interval must fit inside a working schedule window.
5. The requested interval must not overlap time off.
6. The requested interval must not overlap another `PENDING` appointment for the same staff member.
7. Canceled and completed appointments do not block time.
8. Slot granularity is 30 minutes for the MVP.

Overlap condition:

```text
newStart < existingEnd AND newEnd > existingStart
```

For this backend phase, appointment creation requires an explicit `staffId`. The availability API may omit `staffId` to return available slots grouped by staff, which lets a future mini program present "到店安排" without making appointment creation ambiguous.

## API Design

All API responses should use a consistent envelope:

```json
{
  "data": {},
  "error": null
}
```

Errors should use:

```json
{
  "data": null,
  "error": {
    "code": "APPOINTMENT_CONFLICT",
    "message": "该时间段已被预约"
  }
}
```

### Service Categories

- `GET /service-categories`
- `POST /service-categories`
- `PATCH /service-categories/:id`
- `DELETE /service-categories/:id`

Deletion should soft-disable categories that already have services.

### Service Items

- `GET /service-items`
- `GET /service-items/:id`
- `POST /service-items`
- `PATCH /service-items/:id`
- `PATCH /service-items/:id/status`
- `DELETE /service-items/:id`

Deletion should soft-disable services that already have appointments.

### Staff

- `GET /staff`
- `GET /staff/:id`
- `POST /staff`
- `PATCH /staff/:id`
- `PATCH /staff/:id/status`
- `DELETE /staff/:id`
- `PUT /staff/:id/services`

`PUT /staff/:id/services` replaces the staff member's service capability list.

### Schedules

- `GET /staff/:staffId/weekly-schedules`
- `PUT /staff/:staffId/weekly-schedules`
- `GET /staff/:staffId/time-off`
- `POST /staff/:staffId/time-off`
- `PATCH /time-off/:id`
- `DELETE /time-off/:id`

### Availability

- `GET /availability?serviceItemId=...&staffId=...&date=YYYY-MM-DD`
- `GET /availability?serviceItemId=...&date=YYYY-MM-DD`

When `staffId` is present, returns available slots for one staff member:

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

When `staffId` is omitted, returns available slots grouped by staff:

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

### Appointments

- `GET /appointments`
- `GET /appointments/:id`
- `POST /appointments`
- `PATCH /appointments/:id/cancel`
- `PATCH /appointments/:id/complete`

`POST /appointments` must re-check availability inside the create operation. The availability API is only a preview and cannot be trusted as final validation.

## Appointment Creation Flow

1. Validate service, staff, customer fields, and requested start time.
2. Load service duration.
3. Calculate `endAt = startAt + durationMinutes`.
4. Check staff can provide the service.
5. Check schedule and time off.
6. Check appointment overlap for the same staff.
7. Create or update the customer by phone or WeChat open id.
8. Save appointment with service, staff, and customer snapshots.
9. Return the appointment detail.

The overlap check and appointment insert must be performed in a transaction. SQLite has simpler concurrency behavior than MySQL/PostgreSQL, but the API should still be written so the future migration path is clean.

## Error Handling

Important error codes:

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

## Authentication

The first backend phase may start with no public authentication for local development, but the module boundaries should include `auth/` so later work can add:

- admin username/password login for the management website
- WeChat `code` login for mini program customers
- role checks for admin-only APIs

Before internet deployment, admin mutation APIs must be protected.

## Seed Data

The backend should include seed data for local development:

- service categories listed above
- five initial services
- one or two staff members
- default weekly schedule from 09:00 to 18:00

Initial service duration defaults:

- 洗吹: 30 minutes
- 洗剪吹: 60 minutes
- 基础护理: 60 minutes
- 染发: 150 minutes
- 烫发: 180 minutes

These defaults can be edited in the admin UI later.

## Testing Strategy

Unit tests:

- availability slot generation
- overlap detection
- service duration to end time calculation
- invalid status transitions

Integration tests:

- create appointment succeeds when a slot is free
- create appointment fails when it overlaps an existing appointment
- canceled appointment no longer blocks time
- inactive service cannot be booked
- staff without service capability cannot be booked

## Deployment Notes

SQLite is acceptable for the single-store MVP. The database file must be backed up regularly after deployment. If the store later needs higher traffic, multi-device concurrent administration, analytics, or multi-store support, migrate to MySQL or PostgreSQL.

For WeChat mini program production use, the backend must be exposed through an ICP-filed HTTPS domain, such as `api.example.com`. The admin website can later use a separate domain such as `admin.example.com`.

## Out of Scope For This Phase

- Admin website pages
- WeChat mini program pages
- WeChat payment
- SMS or subscription message notifications
- Membership cards
- Coupons
- Multi-store or multi-tenant support
- File upload and image management
- Public H5 booking website

## Approval Gate

After this design is reviewed, the next step is to write an implementation plan for the backend foundation. Implementation should not start until the plan is approved.
