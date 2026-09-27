import fs from 'fs';
import path from 'path';
import prisma from '../src/db/prisma';

const outputPath = path.resolve(process.cwd(), 'prisma', 'demo-snapshot.json');

async function main() {
  const organization = await prisma.organization.findFirst({
    where: { slug: 'gonullu360' },
    select: { id: true, name: true, slug: true },
  });
  if (!organization) throw new Error('gonullu360 demo organizasyonu bulunamadı.');

  const [volunteers, applications, events, notifications, educationStats] = await Promise.all([
    prisma.volunteer.findMany({
      where: { organizationId: organization.id },
      orderBy: { id: 'asc' },
      include: { profile: true, interests: true, educations: true },
    }),
    prisma.application.findMany({
      where: { organizationId: organization.id },
      orderBy: { id: 'asc' },
    }),
    prisma.event.findMany({
      where: { organizationId: organization.id },
      orderBy: { id: 'asc' },
      include: { tasks: { orderBy: { position: 'asc' } }, report: true, participants: true },
    }),
    prisma.notification.findMany({
      where: { organizationId: organization.id },
      orderBy: { id: 'asc' },
      include: { user: { select: { email: true } } },
    }),
    prisma.educationInstitutionStat.findMany({ orderBy: { city: 'asc' } }),
  ]);

  const snapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    organization,
    counts: {
      volunteers: volunteers.length,
      applications: applications.length,
      events: events.length,
      participants: events.reduce((total, event) => total + event.participants.length, 0),
      eventTasks: events.reduce((total, event) => total + event.tasks.length, 0),
      eventReports: events.filter(event => event.report).length,
      notifications: notifications.length,
      educationStats: educationStats.length,
      uploadedFiles: 0,
    },
    volunteers,
    applications,
    events,
    notifications,
    educationStats,
    uploadedFiles: [],
  };

  await fs.promises.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Demo snapshot oluşturuldu: ${outputPath}`);
  console.log(snapshot.counts);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
