import { faker } from '@faker-js/faker';
import { hashPassword } from '../security/password';
import { config } from '../config';
import prisma from './prisma';
import { Role } from '@prisma/client';

if (config.appMode === 'production') {
  throw new Error('Güvenlik nedeniyle production ortamında demo seed çalıştırılamaz.');
}
if (!config.seedUserPassword) {
  throw new Error('Demo kullanıcılarını oluşturmak için SEED_USER_PASSWORD tanımlanmalıdır.');
}
const seedUserPassword = config.seedUserPassword;

const cities = ['İstanbul', 'Ankara', 'İzmir', 'Kocaeli', 'Bursa', 'Sivas', 'Antalya', 'Konya'];
const genders = ['Erkek', 'Kadın'];
const educationLevels = ['Lise', 'Üniversite', 'Lisans', 'Yüksek Lisans'];
const departments = ['Tanıtım ve Medya', 'Gençlik Çalışmaları', 'Sosyal Yardım', 'Eğitim', 'Arama Kurtarma', 'Organizasyon'];
const interests = ['Psikososyal', 'Medya', 'Arama Kurtarma', 'Grafik Tasarım', 'Eğitim', 'Sosyal Yardım', 'Organizasyon', 'Gençlik'];
const schools = ['İstanbul Üniversitesi', 'Marmara Üniversitesi', 'Ankara Üniversitesi', 'Anadolu Üniversitesi', 'Karadeniz Teknik Üniversitesi', 'Yıldız Teknik Üniversitesi'];
const schoolDepartments = ['İşletme', 'Bilgisayar Mühendisliği', 'Sosyoloji', 'Psikoloji', 'İletişim', 'Sosyal Hizmet'];
const managerNotes = [
  'Etkinliklere düzenli katılım sağlıyor ve ekip çalışmasına uyumlu.',
  'İletişimi güçlü. Organizasyon görevlerinde değerlendirilebilir.',
  'Eğitim ve gençlik çalışmalarına ilgi gösteriyor.',
  'Medya ve içerik üretimi alanında görev almaya istekli.',
  'Saha çalışmalarında aktif görev alabilir.',
];
const eventNames = [
  'Gönüllü Buluşması', 'Kitap Tahlili', 'STK Zirvesi', 'Kahvaltı Buluşması',
  'Medya Eğitimi', 'Gençlik Kampı', 'Afet Farkındalık Eğitimi', 'Sosyal Yardım Çalışması',
  'Çevre Temizliği', 'Yetim Dayanışma Programı', 'Kan Bağışı Organizasyonu', 'Kariyer Atölyesi',
  'Fotoğrafçılık Eğitimi', 'İlk Yardım Eğitimi', 'Ramazan Yardım Programı', 'Kış Yardımı Dağıtımı',
  'Çocuk Şenliği', 'Spor Turnuvası', 'Teknoloji Atölyesi', 'Gönüllülük Semineri',
  'Kültür Gezisi', 'Fidan Dikim Etkinliği', 'Saha Koordinasyon Eğitimi', 'İletişim Atölyesi',
];
const maleNames = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'İbrahim', 'Hasan', 'Ömer', 'Yusuf', 'Murat', 'Emre', 'Burak', 'Serkan', 'Fatih', 'Kadir'];
const femaleNames = ['Ayşe', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Meryem', 'Şule', 'Merve', 'Esra', 'Büşra', 'Selin', 'Gamze', 'Derya', 'Tuğba'];
const surnames = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Aydın', 'Özdemir', 'Erdoğan', 'Kurt', 'Güneş'];

const randomName = (gender: string) => `${faker.helpers.arrayElement(gender === 'Erkek' ? maleNames : femaleNames)} ${faker.helpers.arrayElement(surnames)}`;
const slugify = (name: string) => name.toLocaleLowerCase('tr-TR')
  .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
  .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

async function clearDemoData() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.refreshSession.deleteMany(),
    prisma.formSubmission.deleteMany(),
    prisma.formVersion.deleteMany(),
    prisma.form.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.eventParticipant.deleteMany(),
    prisma.event.deleteMany(),
    prisma.volunteerInterest.deleteMany(),
    prisma.volunteerEducation.deleteMany(),
    prisma.volunteerProfile.deleteMany(),
    prisma.volunteer.deleteMany(),
    prisma.application.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);
}

async function main() {
  await clearDemoData();

  const organization = await prisma.organization.create({
    data: { name: 'Gönüllü 360', slug: 'gonullu360' },
  });

  const manager = await prisma.user.create({
    data: { organizationId: organization.id, name: 'Enes Acar', email: 'enes@gonullu360.com', password: await hashPassword(seedUserPassword), role: Role.ADMIN },
  });
  await prisma.user.create({
    data: { organizationId: organization.id, name: 'Ayşe Kaya', email: 'ayse@gonullu360.com', password: await hashPassword(seedUserPassword), role: Role.VOLUNTEER },
  });

  const volunteerData = Array.from({ length: 200 }, () => {
    const gender = faker.helpers.arrayElement(genders);
    return {
      organizationId: organization.id,
      name: randomName(gender),
      city: faker.helpers.arrayElement(cities),
      gender,
      age: faker.number.int({ min: 18, max: 55 }),
      education: faker.helpers.arrayElement(educationLevels),
      active: true,
      createdAt: faker.date.between({ from: '2024-01-01', to: '2026-07-01' }),
    };
  });
  await prisma.volunteer.createMany({ data: volunteerData });
  const volunteers = await prisma.volunteer.findMany({ orderBy: { id: 'asc' } });

  const eventIds: number[] = [];
  for (const [index, name] of eventNames.entries()) {
    const year = 2024 + (index % 3);
    const event = await prisma.event.create({
      data: {
        organizationId: organization.id,
        name,
        date: faker.date.between({ from: `${year}-01-01`, to: `${year}-${year === 2026 ? '07-01' : '12-31'}` }),
        target: faker.number.int({ min: 50, max: 200 }),
        completed: faker.helpers.arrayElement([false, true, true, true]),
      },
    });
    eventIds.push(event.id);
  }

  const participantData = volunteers.flatMap(volunteer =>
    faker.helpers.arrayElements(eventIds, faker.number.int({ min: 0, max: 3 }))
      .map(eventId => ({ volunteerId: volunteer.id, eventId })),
  );
  if (participantData.length) await prisma.eventParticipant.createMany({ data: participantData, skipDuplicates: true });

  for (const volunteer of volunteers) {
    const birthYear = 2026 - volunteer.age;
    const birthDate = new Date(`${birthYear}-${String((volunteer.id % 12) + 1).padStart(2, '0')}-${String((volunteer.id % 27) + 1).padStart(2, '0')}T00:00:00Z`);
    const selectedInterests = faker.helpers.arrayElements(interests, { min: 2, max: 4 });
    const startYear = Math.max(2015, 2026 - volunteer.age + 18);
    const current = volunteer.age <= 24;
    await prisma.volunteerProfile.create({
      data: {
        volunteerId: volunteer.id,
        volunteerCode: `#${String(volunteer.id).padStart(5, '0')}`,
        birthDate,
        department: departments[volunteer.id % departments.length],
        phone: `05${String(300000000 + volunteer.id).padStart(9, '0')}`,
        email: `${slugify(volunteer.name)}.${volunteer.id}@demo.gonullu360.local`,
        address: `${volunteer.city} Merkez`,
        managerNote: managerNotes[volunteer.id % managerNotes.length],
        coverLetter: 'Topluma fayda sağlayan çalışmalarda sorumluluk almak, deneyimlerimi paylaşmak ve yeni beceriler kazanmak istiyorum.',
        volunteeringTarget: 75 + (volunteer.id % 4) * 5,
        participationTarget: 60 + (volunteer.id % 5) * 5,
        managerNoteAuthorId: manager.id,
        managerNoteUpdatedAt: new Date(),
      },
    });
    await prisma.volunteerInterest.createMany({ data: selectedInterests.map(interest => ({ volunteerId: volunteer.id, interest })), skipDuplicates: true });
    await prisma.volunteerEducation.create({
      data: {
        volunteerId: volunteer.id,
        level: volunteer.education,
        school: schools[volunteer.id % schools.length],
        department: schoolDepartments[volunteer.id % schoolDepartments.length],
        startYear,
        endYear: current ? null : Math.min(startYear + 4, 2026),
        current,
      },
    });
  }

  const notificationMessages = [
    'Yeni gönüllü kaydı oluşturuldu.', 'Etkinlik katılım oranı güncellendi.',
    'Yeni form başvurusu alındı.', 'Gönüllü profili güncellendi.', 'Etkinlik tamamlandı.',
  ];
  await prisma.notification.createMany({
    data: Array.from({ length: 10 }, () => ({
      organizationId: organization.id,
      userId: manager.id,
      message: faker.helpers.arrayElement(notificationMessages),
      read: faker.helpers.arrayElement([false, false, true]),
      createdAt: faker.date.recent({ days: 7 }),
    })),
  });

  await prisma.application.createMany({
    data: Array.from({ length: 50 }, (_, index) => {
      const gender = faker.helpers.arrayElement(genders);
      const name = randomName(gender);
      const city = faker.helpers.arrayElement(cities);
      return {
        organizationId: organization.id,
        name,
        city,
        gender,
        age: faker.number.int({ min: 18, max: 40 }),
        education: faker.helpers.arrayElement(educationLevels),
        status: faker.helpers.arrayElement(['İşlem Bekliyor', 'İşlem Bekliyor', 'Reddedildi']),
        phone: `05${String(400000000 + index).padStart(9, '0')}`,
        email: `${slugify(name)}.${index + 1}@demo.gonullu360.local`,
        address: `${city} Merkez`,
        interests: JSON.stringify(faker.helpers.arrayElements(interests, { min: 2, max: 4 })),
        coverLetter: 'Sosyal sorumluluk çalışmalarında aktif rol almak ve gönüllülük deneyimimi geliştirmek istiyorum.',
        evaluationNote: index % 3 === 0 ? 'Başvuru bilgileri ön incelemeden geçirildi.' : null,
        createdAt: faker.date.between({ from: '2026-01-01', to: '2026-07-01' }),
      };
    }),
  });

  const [userCount, volunteerCount, applicationCount, eventCount, notificationCount, profileCount] = await Promise.all([
    prisma.user.count(), prisma.volunteer.count(), prisma.application.count(),
    prisma.event.count(), prisma.notification.count(), prisma.volunteerProfile.count(),
  ]);
  console.log('PostgreSQL demo verileri başarıyla hazırlandı.');
  console.log({ userCount, volunteerCount, applicationCount, eventCount, notificationCount, profileCount });
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
