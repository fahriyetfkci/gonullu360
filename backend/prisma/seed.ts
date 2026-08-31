import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.organization.upsert({
    where: { slug: "ihh" },
    update: { name: "İHH", isActive: true },
    create: { name: "İHH", slug: "ihh" },
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
