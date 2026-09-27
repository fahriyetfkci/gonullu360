import prisma from '../db/prisma';
import { config } from '../config';
import { educationInstitutionStats, EDUCATION_INSTITUTION_PERIOD } from '../data/educationInstitutionStats';
import { logger } from './logger';

const MEB_SOURCE = 'https://istatistik.meb.gov.tr/kurumsayisi/index';
const MEB_QUERY = 'https://istatistik.meb.gov.tr/kurumsayisi/SorguSonucu';
const MEB_STUDENT_SOURCE = 'https://istatistik.meb.gov.tr/OgrenciSayisi/Index';
const MEB_STUDENT_QUERY = 'https://istatistik.meb.gov.tr/OgrenciSayisi/SorguSonucu';
const YOK_SOURCE = 'https://yokatlas.yok.gov.tr/api/tercih-kilavuz/universiteler';
const YOK_CITIES = 'https://yokatlas.yok.gov.tr/api/tercih-kilavuz/universite-iller';
const EXPECTED_CITY_COUNT = 81;

type InstitutionCounts = typeof educationInstitutionStats[string] & { studentCount: number };
type YokCity = { ilAdi: string; ilKodu: number };
type YokUniversity = { universiteAdi: string };
type EducationStatWrite = InstitutionCounts & {
  city: string;
  period: string;
  mebSource: string;
  yokSource: string;
  syncStatus: string;
  syncError: string | null;
  lastAttemptAt: Date;
  syncedAt: Date;
};
type EducationStatDelegate = {
  count(): Promise<number>;
  deleteMany(args: { where: { city: { notIn: string[] } } }): Promise<unknown>;
  updateMany(args: { data: { syncStatus: string; syncError: string | null; lastAttemptAt: Date } }): Promise<unknown>;
  upsert(args: {
    where: { city: string };
    create: EducationStatWrite;
    update: Omit<EducationStatWrite, 'city'>;
  }): Promise<unknown>;
};
type EducationStatsDatabase = {
  educationInstitutionStat: EducationStatDelegate;
  $transaction<T>(operation: (transaction: { educationInstitutionStat: EducationStatDelegate }) => Promise<T>): Promise<T>;
};

const educationStatsDatabase = prisma as unknown as EducationStatsDatabase;

const htmlEntities: Record<string, string> = { amp: '&', quot: '"', apos: "'" };
const htmlDecode = (value: string) => value
  .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
  .replace(/&([A-Za-z]+);/g, (_match, entity: string) => htmlEntities[entity] ?? _match);

const normalize = (value: string) => value
  .toLocaleUpperCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/İ/g, 'I')
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim();

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function parseMebRows(html: string) {
  const rows = new Map<string, number>();
  const pattern = /<tr\s+title="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const match of html.matchAll(pattern)) {
    const cells = [...match[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(cell => htmlDecode(cell[1].replace(/<[^>]+>/g, '').trim()));
    if (cells.length < 3) continue;
    const city = cells[1].toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g, letter => letter.toLocaleUpperCase('tr-TR'));
    const total = Number(cells[cells.length - 1]?.replace(/\./g, '') ?? NaN);
    if (normalize(city) !== 'TURKIYE' && Number.isFinite(total)) rows.set(city, total);
  }
  if (rows.size !== EXPECTED_CITY_COUNT) throw new Error(`MEB il sayısı beklenen ${EXPECTED_CITY_COUNT}, gelen ${rows.size}`);
  return rows;
}

function parseLatestMebPeriod(html: string) {
  const options = [...html.matchAll(/<option\s+value=["'](\d+)["'][^>]*>\s*(\d{4}-\d{4})\s*<\/option>/gi)];
  if (options.length === 0) throw new Error('MEB sayfasındaki güncel eğitim dönemi bulunamadı');

  const latest = options.reduce((selected, option) => Number(option[1]) > Number(selected[1]) ? option : selected);
  return { periodId: Number(latest[1]), period: latest[2] };
}

async function fetchMebCategory(
  periodId: number,
  level: number,
  schoolType: number,
  cookie: string,
  queryUrl = MEB_QUERY,
  referer = MEB_SOURCE,
) {
  const body = new URLSearchParams({ egitim_yili_id: String(periodId), egitim_kademesi_id: String(level), okul_turu_id: String(schoolType) });
  for (let plate = 1; plate <= 81; plate += 1) body.append('sehir_id[]', String(plate));
  const response = await fetchWithTimeout(queryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: referer,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body,
  });
  return parseMebRows(await response.text());
}

async function fetchMebStats() {
  const landing = await fetchWithTimeout(MEB_SOURCE);
  const { periodId, period } = parseLatestMebPeriod(await landing.text());
  const cookie = landing.headers.get('set-cookie')?.split(';')[0] ?? '';
  const studentLanding = await fetchWithTimeout(MEB_STUDENT_SOURCE);
  const studentCookie = studentLanding.headers.get('set-cookie')?.split(';')[0] ?? '';
  const [middleSchools, highSchools, vocationalHighSchools, preschoolStudents, primaryStudents, middleSchoolStudents, highSchoolStudents] = await Promise.all([
    fetchMebCategory(periodId, 57, 211, cookie),
    fetchMebCategory(periodId, 58, 217, cookie),
    fetchMebCategory(periodId, 58, 213, cookie),
    fetchMebCategory(periodId, 55, 205, studentCookie, MEB_STUDENT_QUERY, MEB_STUDENT_SOURCE),
    fetchMebCategory(periodId, 56, 206, studentCookie, MEB_STUDENT_QUERY, MEB_STUDENT_SOURCE),
    fetchMebCategory(periodId, 57, 211, studentCookie, MEB_STUDENT_QUERY, MEB_STUDENT_SOURCE),
    fetchMebCategory(periodId, 58, 217, studentCookie, MEB_STUDENT_QUERY, MEB_STUDENT_SOURCE),
  ]);
  const studentCounts = new Map<string, number>();
  for (const city of middleSchools.keys()) {
    studentCounts.set(city,
      (preschoolStudents.get(city) ?? 0)
      + (primaryStudents.get(city) ?? 0)
      + (middleSchoolStudents.get(city) ?? 0)
      + (highSchoolStudents.get(city) ?? 0));
  }
  return { middleSchools, highSchools, vocationalHighSchools, studentCounts, period };
}

function findUniversityCity(universityName: string, cities: string[]) {
  const name = normalize(universityName);
  if (['KKTC', 'AZERBAYCAN', 'KAZAKISTAN', 'KIRGIZISTAN', 'MAKEDONYA', 'BOSNA HERSEK', 'ARNAVUTLUK'].some(country => name.includes(country))) return null;
  if (name.startsWith('GEBZE TEKNIK UNIVERSITESI')) return 'Kocaeli';
  if (name.startsWith('TURK JAPON BILIM VE TEKNOLOJI UNIVERSITESI')) return 'İstanbul';
  if (name.startsWith('ISTANBUL AYDIN UNIVERSITESI')) return 'İstanbul';

  const parenthetical = universityName.match(/\(([^)]+)\)/g)?.join(' ') ?? '';
  const parentheticalNormalized = normalize(parenthetical);
  const parentheticalMatch = cities.find(city => new RegExp(`(^| )${normalize(city)}( |$)`).test(parentheticalNormalized));
  if (parentheticalMatch) return parentheticalMatch;
  return cities.find(city => new RegExp(`(^| )${normalize(city)}( |$)`).test(name)) ?? null;
}

async function fetchUniversityCounts(cities: string[]) {
  const response = await fetchWithTimeout(YOK_SOURCE);
  const universities = await response.json() as YokUniversity[];
  const counts = new Map(cities.map(city => [city, 0]));
  const unmatched: string[] = [];
  for (const university of universities) {
    const city = findUniversityCity(university.universiteAdi, cities);
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
    else if (!normalize(university.universiteAdi).includes('KKTC')) unmatched.push(university.universiteAdi);
  }
  if ([...counts.values()].some(count => count < 1)) throw new Error('YÖK verisinde üniversitesi bulunmayan il oluştu');
  if (unmatched.length > 10) throw new Error(`YÖK eşleştirilemeyen kurum sayısı: ${unmatched.length}`);
  return counts;
}

async function currentTurkishCities() {
  const response = await fetchWithTimeout(YOK_CITIES);
  const cities = (await response.json() as YokCity[])
    .filter(city => city.ilKodu >= 1 && city.ilKodu <= 81)
    .map(city => city.ilAdi.toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g, letter => letter.toLocaleUpperCase('tr-TR')));
  if (cities.length !== EXPECTED_CITY_COUNT) throw new Error(`YÖK il sayısı beklenen ${EXPECTED_CITY_COUNT}, gelen ${cities.length}`);
  return cities;
}

async function persist(stats: Record<string, InstitutionCounts>, period: string, syncedAt: Date) {
  await educationStatsDatabase.$transaction(async transaction => {
    for (const [city, values] of Object.entries(stats)) {
      await transaction.educationInstitutionStat.upsert({
        where: { city },
        create: { city, ...values, period, mebSource: MEB_SOURCE, yokSource: YOK_SOURCE, syncStatus: 'success', syncError: null, lastAttemptAt: syncedAt, syncedAt },
        update: { ...values, period, mebSource: MEB_SOURCE, yokSource: YOK_SOURCE, syncStatus: 'success', syncError: null, lastAttemptAt: syncedAt, syncedAt },
      });
    }
    await transaction.educationInstitutionStat.deleteMany({ where: { city: { notIn: Object.keys(stats) } } });
  });
}

export async function ensureEducationStatsFallback() {
  const count = await educationStatsDatabase.educationInstitutionStat.count();
  if (count === 0) {
    const fallback = Object.fromEntries(Object.entries(educationInstitutionStats).map(([city, values]) => [city, { ...values, studentCount: 0 }]));
    await persist(fallback, EDUCATION_INSTITUTION_PERIOD, new Date(0));
  }
}

let activeSync: Promise<void> | null = null;

async function performEducationInstitutionStatsSync() {
  const startedAt = Date.now();
  const attemptedAt = new Date();
  await educationStatsDatabase.educationInstitutionStat.updateMany({ data: { syncStatus: 'running', syncError: null, lastAttemptAt: attemptedAt } });
  try {
  const [cities, meb] = await Promise.all([currentTurkishCities(), fetchMebStats()]);
  const universities = await fetchUniversityCounts(cities);
  const byNormalizedCity = new Map(cities.map(city => [normalize(city), city]));
  const result: Record<string, InstitutionCounts> = {};

  for (const [mebCity, middleSchools] of meb.middleSchools) {
    const city = byNormalizedCity.get(normalize(mebCity));
    if (!city) throw new Error(`MEB/YÖK il eşleşmesi bulunamadı: ${mebCity}`);
    result[city] = {
      studentCount: meb.studentCounts.get(mebCity) ?? 0,
      universities: universities.get(city) ?? 0,
      middleSchools,
      highSchools: meb.highSchools.get(mebCity) ?? 0,
      vocationalHighSchools: meb.vocationalHighSchools.get(mebCity) ?? 0,
    };
  }
  if (Object.keys(result).length !== EXPECTED_CITY_COUNT) throw new Error('Eksik eğitim istatistiği nedeniyle güncelleme iptal edildi');
  await persist(result, meb.period, new Date());
  logger.info('education_stats.synced', { cities: Object.keys(result).length, durationMs: Date.now() - startedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await educationStatsDatabase.educationInstitutionStat.updateMany({ data: { syncStatus: 'failed', syncError: message.slice(0, 1000), lastAttemptAt: attemptedAt } });
    throw error;
  }
}

export function syncEducationInstitutionStats() {
  if (!activeSync) activeSync = performEducationInstitutionStatsSync().finally(() => { activeSync = null; });
  return activeSync;
}

export function startEducationStatsScheduler() {
  if (!config.educationSync.enabled) return () => undefined;
  const run = () => void syncEducationInstitutionStats().catch(error => logger.warn('education_stats.sync_failed', {
    error: error instanceof Error ? error.message : String(error),
  }));
  const initialTimer = setTimeout(run, 10_000);
  initialTimer.unref();
  const interval = setInterval(run, config.educationSync.intervalHours * 60 * 60 * 1000);
  interval.unref();
  return () => { clearTimeout(initialTimer); clearInterval(interval); };
}
