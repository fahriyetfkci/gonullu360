import fs from 'fs';
import path from 'path';
import { Role } from '@prisma/client';
import { config } from '../config';
import prisma from './prisma';

type SnapshotVolunteer = {
  id: number; name: string; city: string; gender: string; age: number; education: string; active: boolean; createdAt: string;
  profile: null | { volunteerCode: string | null; birthDate: string | null; department: string | null; phone: string | null; email: string | null; address: string | null; photoUrl: string | null; managerNote: string | null; coverLetter: string | null; volunteeringTarget: number; participationTarget: number; managerNoteAuthorId: string | null; managerNoteUpdatedAt: string | null };
  interests: Array<{ interest: string }>;
  educations: Array<{ level: string; school: string; department: string | null; startYear: number | null; endYear: number | null; current: boolean }>;
};

type SnapshotApplication = { name: string; city: string; gender: string; age: number; education: string; status: string; phone: string | null; email: string | null; address: string | null; interests: string | null; coverLetter: string | null; evaluationNote: string | null; createdAt: string };

type SnapshotEvent = {
  id: number; name: string; date: string; target: number; completed: boolean; time: string | null; groupName: string | null; imageUrl: string | null; notes: string | null;
  participants: Array<{ volunteerId: number }>;
  tasks: Array<{ title: string; completed: boolean; position: number; createdAt: string }>;
  report: null | { summary: string; achievements: string; issues: string; managerEvaluation: string; createdAt: string; updatedAt: string };
};

type DemoSnapshot = {
  version: number;
  organization: { slug: string };
  volunteers: SnapshotVolunteer[];
  applications: SnapshotApplication[];
  events: SnapshotEvent[];
  notifications: Array<{ message: string; read: boolean; createdAt: string; user: { email: string } }>;
  educationStats: Array<{ city: string; studentCount: number; universities: number; middleSchools: number; highSchools: number; vocationalHighSchools: number; period: string; mebSource: string; yokSource: string; syncStatus: string; syncError: string | null; lastAttemptAt: string | null; syncedAt: string }>;
  uploadedFiles: unknown[];
};

const asDate = (value: string) => new Date(value);
const asOptionalDate = (value: string | null) => value ? new Date(value) : null;

function readSnapshot(): DemoSnapshot {
  const snapshotPath = path.resolve(process.cwd(), 'prisma', 'demo-snapshot.json');
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as DemoSnapshot;
  if (snapshot.version !== 1 || !Array.isArray(snapshot.volunteers) || !Array.isArray(snapshot.events)) throw new Error('Demo snapshot biçimi desteklenmiyor.');
  if (snapshot.uploadedFiles.length) throw new Error('Snapshot dosya yüklemeleri içeriyor; dosyalar ayrıca sağlanmadan içe aktarılamaz.');
  return snapshot;
}

async function clearOrganizationData(organizationId: string) {
  const events = await prisma.event.findMany({ where: { organizationId }, select: { id: true } });
  const volunteers = await prisma.volunteer.findMany({ where: { organizationId }, select: { id: true } });
  const eventIds = events.map(event => event.id);
  const volunteerIds = volunteers.map(volunteer => volunteer.id);
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { organizationId } }),
    prisma.eventParticipant.deleteMany({ where: { OR: [{ eventId: { in: eventIds } }, { volunteerId: { in: volunteerIds } }] } }),
    prisma.eventReport.deleteMany({ where: { eventId: { in: eventIds } } }),
    prisma.eventTask.deleteMany({ where: { eventId: { in: eventIds } } }),
    prisma.event.deleteMany({ where: { organizationId } }),
    prisma.volunteerInterest.deleteMany({ where: { volunteerId: { in: volunteerIds } } }),
    prisma.volunteerEducation.deleteMany({ where: { volunteerId: { in: volunteerIds } } }),
    prisma.volunteerProfile.deleteMany({ where: { volunteerId: { in: volunteerIds } } }),
    prisma.volunteer.deleteMany({ where: { organizationId } }),
    prisma.application.deleteMany({ where: { organizationId } }),
    prisma.educationInstitutionStat.deleteMany(),
  ]);
}

async function main() {
  if (config.appMode === 'production') throw new Error('Production ortamında demo snapshot içe aktarılamaz.');
  const snapshot = readSnapshot();
  const organization = await prisma.organization.findUnique({ where: { slug: snapshot.organization.slug } });
  if (!organization) throw new Error('Demo organizasyonu bulunamadı. Önce npm run seed çalıştırın.');
  const manager = await prisma.user.findFirst({ where: { organizationId: organization.id, role: Role.ADMIN } });
  if (!manager) throw new Error('Demo yöneticisi bulunamadı. Önce npm run seed çalıştırın.');
  await clearOrganizationData(organization.id);

  const volunteerIdMap = new Map<number, number>();
  for (const volunteer of snapshot.volunteers) {
    const created = await prisma.volunteer.create({ data: {
      organizationId: organization.id, name: volunteer.name, city: volunteer.city, gender: volunteer.gender, age: volunteer.age,
      education: volunteer.education, active: volunteer.active, createdAt: asDate(volunteer.createdAt),
      profile: volunteer.profile ? { create: {
        volunteerCode: volunteer.profile.volunteerCode, birthDate: asOptionalDate(volunteer.profile.birthDate), department: volunteer.profile.department,
        phone: volunteer.profile.phone, email: volunteer.profile.email, address: volunteer.profile.address, photoUrl: volunteer.profile.photoUrl,
        managerNote: volunteer.profile.managerNote, coverLetter: volunteer.profile.coverLetter, volunteeringTarget: volunteer.profile.volunteeringTarget,
        participationTarget: volunteer.profile.participationTarget, managerNoteAuthorId: volunteer.profile.managerNoteAuthorId ? manager.id : null,
        managerNoteUpdatedAt: asOptionalDate(volunteer.profile.managerNoteUpdatedAt),
      } } : undefined,
      interests: { create: volunteer.interests.map(item => ({ interest: item.interest })) },
      educations: { create: volunteer.educations.map(item => ({ level: item.level, school: item.school, department: item.department, startYear: item.startYear, endYear: item.endYear, current: item.current })) },
    } });
    volunteerIdMap.set(volunteer.id, created.id);
  }

  await prisma.application.createMany({ data: snapshot.applications.map(application => ({ organizationId: organization.id, ...application, createdAt: asDate(application.createdAt) })) });

  const eventIdMap = new Map<number, number>();
  for (const event of snapshot.events) {
    const created = await prisma.event.create({ data: {
      organizationId: organization.id, name: event.name, date: asDate(event.date), target: event.target, completed: event.completed,
      time: event.time, groupName: event.groupName, imageUrl: event.imageUrl, notes: event.notes,
      tasks: { create: event.tasks.map(task => ({ ...task, createdAt: asDate(task.createdAt) })) },
      report: event.report ? { create: { summary: event.report.summary, achievements: event.report.achievements, issues: event.report.issues, managerEvaluation: event.report.managerEvaluation, createdAt: asDate(event.report.createdAt), updatedAt: asDate(event.report.updatedAt) } } : undefined,
    } });
    eventIdMap.set(event.id, created.id);
  }

  const participantData = snapshot.events.flatMap(event => event.participants.map(participant => ({ eventId: eventIdMap.get(event.id), volunteerId: volunteerIdMap.get(participant.volunteerId) })))
    .filter((item): item is { eventId: number; volunteerId: number } => item.eventId !== undefined && item.volunteerId !== undefined);
  if (participantData.length) await prisma.eventParticipant.createMany({ data: participantData, skipDuplicates: true });

  const users = await prisma.user.findMany({ where: { organizationId: organization.id }, select: { id: true, email: true } });
  const userByEmail = new Map(users.map(user => [user.email, user.id]));
  await prisma.notification.createMany({ data: snapshot.notifications.map(notification => ({ organizationId: organization.id, userId: userByEmail.get(notification.user.email) ?? manager.id, message: notification.message, read: notification.read, createdAt: asDate(notification.createdAt) })) });
  await prisma.educationInstitutionStat.createMany({ data: snapshot.educationStats.map(item => ({ city: item.city, studentCount: item.studentCount, universities: item.universities, middleSchools: item.middleSchools, highSchools: item.highSchools, vocationalHighSchools: item.vocationalHighSchools, period: item.period, mebSource: item.mebSource, yokSource: item.yokSource, syncStatus: item.syncStatus, syncError: item.syncError, lastAttemptAt: asOptionalDate(item.lastAttemptAt), syncedAt: asDate(item.syncedAt) })) });

  console.log('Demo snapshot başarıyla içe aktarıldı.');
  console.log({ volunteers: snapshot.volunteers.length, applications: snapshot.applications.length, events: snapshot.events.length, participants: participantData.length, notifications: snapshot.notifications.length, educationStats: snapshot.educationStats.length });
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
