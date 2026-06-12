import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from '../src/prisma/prisma-client';

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
});

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
