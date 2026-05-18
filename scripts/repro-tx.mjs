import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({ log: ["error", "warn"] });

const authUserId = process.argv[2] ?? "a237e289-0ed1-43e6-851d-cf1e68896253";
const email = process.argv[3] ?? `e2e-repro-${Date.now()}@aiva-test.local`;

try {
  await prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({
      data: {
        name: "Repro Clinic",
        phone: "+92 300 1112233",
        address: "1 Repro Lane",
        email: "contact@repro.test",
      },
    });
    console.log("clinic:", clinic.id);
    const staff = await tx.clinicStaff.create({
      data: {
        authUserId,
        fullName: "Dr. Repro",
        email,
        role: "Admin",
        jobTitle: "Practice Manager",
        clinicId: clinic.id,
      },
    });
    console.log("staff:", staff.id);
    const ai = await tx.aiSettings.create({ data: { clinicId: clinic.id } });
    console.log("aiSettings:", ai.id);
  });
  console.log("✅ tx ok");
} catch (e) {
  console.error("❌ tx failed:");
  console.error(e);
}

await prisma.$disconnect();
