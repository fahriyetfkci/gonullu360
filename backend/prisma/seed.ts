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
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
