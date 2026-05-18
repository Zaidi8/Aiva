import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

const email = process.argv[2];
if (!email) {
  console.log("usage: node scripts/db-reactivate.mjs <email>");
  process.exit(1);
}

const updated = await prisma.clinicStaff.update({
  where: { email },
  data: { deactivatedAt: null },
  select: { id: true, email: true, deactivatedAt: true },
});
console.log(JSON.stringify(updated, null, 2));

await prisma.$disconnect();
