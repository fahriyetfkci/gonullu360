import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL ve SEED_ADMIN_PASSWORD zorunludur");
  }

  const organization = await prisma.organization.upsert({
    where: { slug: "ihh" },
    update: { name: "İHH", isActive: true },
    create: { name: "İHH", slug: "ihh" },
  });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { orgId_email: { orgId: organization.id, email } },
    update: { passwordHash, role: "ADMIN", isVerified: true, isActive: true },
    create: {
      orgId: organization.id,
      email,
      passwordHash,
      role: "ADMIN",
      isVerified: true,
      isActive: true,
    },
  });

  const defaultGroups = [
    { name: "Genel", color: "#665cf6", memberCount: 150 },
    { name: "Üniversite", color: "#16a5f7", memberCount: 40 },
    { name: "Lise", color: "#20c997", memberCount: 16 },
    { name: "Ortaokul", color: "#f5a623", memberCount: 56 },
    { name: "Çocuk", color: "#7b8794", memberCount: 124 },
    { name: "Çalışan Gençlik", color: "#f43f6e", memberCount: 3 },
  ];

  for (const group of defaultGroups) {
    await prisma.eventGroup.upsert({
      where: { orgId_name: { orgId: organization.id, name: group.name } },
      update: { color: group.color, memberCount: group.memberCount },
      create: { orgId: organization.id, ...group },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
