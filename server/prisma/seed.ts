import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from '../src/prisma/prisma-client';

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
});

type SeedService = {
  name: string;
  categoryName: string;
  durationMinutes: number;
  priceCents: number;
  sortOrder: number;
};

type SeedStaff = {
  name: string;
  title: string;
  phone: string;
  priceOffsetCents: number;
};

async function findOrCreateCategory(input: { name: string; sortOrder: number }) {
  const existing = await prisma.serviceCategory.findFirst({
    where: { OR: [{ name: input.name }, { sortOrder: input.sortOrder }] },
    orderBy: { id: 'asc' },
  });

  if (existing) {
    return existing;
  }

  return prisma.serviceCategory.create({
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
    },
  });
}

async function findOrCreateService(
  input: SeedService,
  categoryId: number,
) {
  const existing = await prisma.serviceItem.findFirst({
    where: { name: input.name },
    orderBy: { id: 'asc' },
  });

  if (existing) {
    return existing;
  }

  return prisma.serviceItem.create({
    data: {
      categoryId,
      name: input.name,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      sortOrder: input.sortOrder,
    },
  });
}

async function findOrCreateStaff(input: SeedStaff) {
  const existing = await prisma.staff.findFirst({
    where: { name: input.name },
    orderBy: { id: 'asc' },
  });

  if (existing) {
    return existing;
  }

  return prisma.staff.create({
    data: {
      name: input.name,
      title: input.title,
      phone: input.phone,
    },
  });
}

async function ensureStaffServices(
  staffId: number,
  services: Array<{ id: number; priceCents: number; sortOrder: number }>,
  priceOffsetCents: number,
) {
  const existingCount = await prisma.staffService.count({ where: { staffId } });
  if (existingCount > 0) {
    return;
  }

  await prisma.staffService.createMany({
    data: services.map((service) => ({
      staffId,
      serviceItemId: service.id,
      priceCents: service.priceCents + priceOffsetCents,
      sortOrder: service.sortOrder,
    })),
  });
}

async function ensureWeeklySchedules(staffId: number) {
  const existingCount = await prisma.staffWeeklySchedule.count({
    where: { staffId },
  });
  if (existingCount > 0) {
    return;
  }

  await prisma.staffWeeklySchedule.createMany({
    data: Array.from({ length: 7 }, (_, index) => ({
      staffId,
      dayOfWeek: index + 1,
      startTime: '09:00',
      endTime: '18:00',
      isWorking: true,
    })),
  });
}

async function main() {
  const categories = [
    { name: '洗护', sortOrder: 1 },
    { name: '剪发', sortOrder: 2 },
    { name: '护理', sortOrder: 3 },
    { name: '染发', sortOrder: 4 },
    { name: '烫发', sortOrder: 5 },
  ];

  const categoryByName = new Map<string, { id: number }>();
  for (const category of categories) {
    const savedCategory = await findOrCreateCategory(category);
    categoryByName.set(savedCategory.name, savedCategory);
  }

  const services: SeedService[] = [
    { name: '洗吹', categoryName: '洗护', durationMinutes: 30, priceCents: 3800, sortOrder: 1 },
    { name: '洗剪吹', categoryName: '剪发', durationMinutes: 60, priceCents: 6800, sortOrder: 2 },
    { name: '基础护理', categoryName: '护理', durationMinutes: 60, priceCents: 9800, sortOrder: 3 },
    { name: '染发', categoryName: '染发', durationMinutes: 150, priceCents: 29800, sortOrder: 4 },
    { name: '烫发', categoryName: '烫发', durationMinutes: 180, priceCents: 39800, sortOrder: 5 },
  ];

  const savedServices: Array<{
    id: number;
    priceCents: number;
    sortOrder: number;
  }> = [];
  for (const service of services) {
    const category = categoryByName.get(service.categoryName);
    if (!category) {
      throw new Error(`找不到服务分类：${service.categoryName}`);
    }
    savedServices.push(await findOrCreateService(service, category.id));
  }

  const staffList: SeedStaff[] = [
    { name: 'Tony', title: '资深发型师', phone: '13800000000', priceOffsetCents: 0 },
    { name: 'Jam', title: '总监发型师', phone: '13800000001', priceOffsetCents: 3000 },
  ];

  for (const staff of staffList) {
    const savedStaff = await findOrCreateStaff(staff);
    await ensureStaffServices(
      savedStaff.id,
      savedServices.map((service) => ({
        id: service.id,
        priceCents: service.priceCents,
        sortOrder: service.sortOrder,
      })),
      staff.priceOffsetCents,
    );
    await ensureWeeklySchedules(savedStaff.id);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
