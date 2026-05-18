import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

const arg = process.argv[2];
const value = process.argv[3];

if (arg === "clinic-by-name") {
  const clinic = await prisma.clinic.findFirst({
    where: { name: value },
    include: { staff: true, aiSettings: true },
  });
  console.log(JSON.stringify(clinic, null, 2));
} else if (arg === "staff-by-email") {
  const staff = await prisma.clinicStaff.findUnique({
    where: { email: value },
    include: { clinic: true },
  });
  console.log(JSON.stringify(staff, null, 2));
} else if (arg === "deactivate-by-email") {
  const updated = await prisma.clinicStaff.update({
    where: { email: value },
    data: { deactivatedAt: new Date() },
    select: { id: true, email: true, deactivatedAt: true },
  });
  console.log(JSON.stringify(updated, null, 2));
} else if (arg === "list-clinics") {
  const list = await prisma.clinic.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      email: true,
      timezone: true,
      createdAt: true,
    },
  });
  console.log(JSON.stringify(list, null, 2));
} else {
  console.log("usage: clinic-by-name|staff-by-email|deactivate-by-email|list-clinics <value>");
}

await prisma.$disconnect();
