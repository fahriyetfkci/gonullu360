import prisma from '../db/prisma';
import { config } from '../config';
import { educationInstitutionStats, EDUCATION_INSTITUTION_PERIOD } from '../data/educationInstitutionStats';
import { logger } from './logger';
import * as XLSX from 'xlsx';

const MEB_SOURCE = 'https://sgb.meb.gov.tr/web/istatistik.html';
const YOK_SOURCE = 'https://istatistik.yok.gov.tr/';
const YOK_AU_SOURCE = 'https://istatistik.yok.gov.tr/zkau';
const YOK_CITIES = 'https://yokatlas.yok.gov.tr/api/tercih-kilavuz/universite-iller';
const EXPECTED_CITY_COUNT = 81;
const MAX_YOK_REPORT_BYTES = 5 * 1024 * 1024;
const MAX_MEB_REPORT_BYTES = 10 * 1024 * 1024;

type InstitutionCounts = typeof educationInstitutionStats[string] & {
  studentCount: number;
  mebStudentCount: number;
  higherEducationStudentCount: number;
};
type YokCity = { ilAdi: string; ilKodu: number };
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

function requiredMatch(value: string, pattern: RegExp, description: string) {
  const match = value.match(pattern)?.[1];
  if (!match) throw new Error(`Resmî istatistik kaynağında ${description} bulunamadı`);
  return match;
}

function uuidById(value: string, id: string) {
  return requiredMatch(value, new RegExp(`\\['[^']+','([^']+)',\\{id:'${id}'`), `${id} bileşeni`);
}

async function postZkEvent(dtid: string, cookie: string, command: string, uuid: string, data: Record<string, unknown>) {
  const body = new URLSearchParams({
    dtid,
    cmd_0: command,
    uuid_0: uuid,
    data_0: JSON.stringify(data),
  });
  const response = await fetchWithTimeout(YOK_AU_SOURCE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: YOK_SOURCE,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body,
  });
  return response.text();
}

const htmlEntities: Record<string, string> = { amp: '&', quot: '"', apos: "'", nbsp: ' ' };
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

function visibleText(value: string) {
  return htmlDecode(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function latestMebPublication(indexHtml: string) {
  const publications = [...indexHtml.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => ({ href: match[1], label: visibleText(match[2]) }))
    .map(item => ({ ...item, period: item.label.match(/Örgün Eğitim\s+(\d{4})[-/](\d{4})/i) }))
    .filter((item): item is typeof item & { period: RegExpMatchArray } => Boolean(item.period))
    .sort((left, right) => Number(right.period[1]) - Number(left.period[1]));
  const latest = publications[0];
  if (!latest) throw new Error('MEB resmî yayın listesinde eğitim dönemi bulunamadı');
  return {
    period: `${latest.period[1]}-${latest.period[2]}`,
    url: new URL(latest.href, MEB_SOURCE).toString(),
  };
}

function mebReportFileUrl(reportHtml: string, reportUrl: string, tableNumber: string) {
  const escaped = tableNumber.replace(/\./g, '\\.');
  const relativePath = requiredMatch(
    reportHtml,
    new RegExp(`number:\\s*["']${escaped}["'][\\s\\S]{0,500}?url:\\s*["']([^"']+\\.xls)["']`, 'i'),
    `MEB ${tableNumber} Excel dosyası`,
  );
  return new URL(relativePath, reportUrl).toString();
}

async function fetchWorkbookRows(url: string, maxBytes: number) {
  const response = await fetchWithTimeout(url);
  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (declaredSize > maxBytes) throw new Error(`İstatistik dosyası izin verilen boyutu aşıyor: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > maxBytes) throw new Error(`İstatistik dosyası geçersiz boyutta: ${url}`);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error(`İstatistik dosyasında çalışma sayfası bulunamadı: ${url}`);
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: true, defval: '' });
}

function mebCityRows(rows: unknown[][], period: string) {
  const periodStart = period.slice(0, 4);
  const periodEnd = period.slice(-2);
  const heading = rows.slice(0, 5).flat().map(String).join(' ');
  if (!heading.includes(periodStart) || !heading.includes(`'${periodEnd}`)) {
    throw new Error(`MEB Excel dönemi beklenen ${period} ile eşleşmiyor`);
  }
  const result = rows.filter(row => /^TR[A-Z0-9]{3}\s+\S/.test(String(row[0])) && row[2] === 'Toplam');
  if (result.length !== EXPECTED_CITY_COUNT) throw new Error(`MEB Excel il sayısı beklenen ${EXPECTED_CITY_COUNT}, gelen ${result.length}`);
  return result;
}

function mebNumber(row: unknown[], column: number, city: string, field: string) {
  const value = Number(row[column]);
  if (!Number.isInteger(value) || value < 0) throw new Error(`MEB ${city} ${field} değeri geçersiz`);
  return value;
}

function mebCityName(row: unknown[]) {
  return String(row[0]).replace(/^TR[A-Z0-9]{3}\s+/, '').trim();
}

async function fetchMebStats() {
  const indexHtml = await (await fetchWithTimeout(MEB_SOURCE)).text();
  const publication = latestMebPublication(indexHtml);
  const detailHtml = await (await fetchWithTimeout(publication.url)).text();
  const reportPath = requiredMatch(detailHtml, /<iframe[^>]+src=["']([^"']*resmi_istatistik[^"']*)["']/i, 'MEB resmî istatistik sayfası');
  const reportUrl = new URL(reportPath, publication.url).toString();
  const reportHtml = await (await fetchWithTimeout(reportUrl)).text();
  const [basicRows, highSchoolRows] = await Promise.all([
    fetchWorkbookRows(mebReportFileUrl(reportHtml, reportUrl, '1.17.a'), MAX_MEB_REPORT_BYTES),
    fetchWorkbookRows(mebReportFileUrl(reportHtml, reportUrl, '1.17.b'), MAX_MEB_REPORT_BYTES),
  ]);
  const basicByCity = new Map(mebCityRows(basicRows, publication.period).map(row => [normalize(mebCityName(row)), row]));
  const secondaryByCity = new Map(mebCityRows(highSchoolRows, publication.period).map(row => [normalize(mebCityName(row)), row]));
  const middleSchools = new Map<string, number>();
  const highSchools = new Map<string, number>();
  const vocationalHighSchools = new Map<string, number>();
  const studentCounts = new Map<string, number>();

  for (const row of basicByCity.values()) {
    const city = mebCityName(row);
    const secondary = secondaryByCity.get(normalize(city));
    if (!secondary) throw new Error(`MEB ortaöğretim tablosunda il bulunamadı: ${city}`);
    middleSchools.set(city, mebNumber(row, 28, city, 'ortaokul sayısı'));
    highSchools.set(city, mebNumber(secondary, 4, city, 'lise sayısı'));
    vocationalHighSchools.set(city, mebNumber(secondary, 26, city, 'mesleki lise sayısı'));
    studentCounts.set(city,
      mebNumber(row, 7, city, 'okul öncesi öğrenci sayısı')
      + mebNumber(row, 19, city, 'ilkokul öğrenci sayısı')
      + mebNumber(row, 30, city, 'ortaokul öğrenci sayısı')
      + mebNumber(secondary, 6, city, 'lise öğrenci sayısı'));
  }
  const nationalTotal = [...studentCounts.values()].reduce((sum, count) => sum + count, 0);
  if (nationalTotal < 10_000_000 || nationalTotal > 25_000_000) throw new Error(`MEB öğrenci toplamı beklenen aralığın dışında: ${nationalTotal}`);
  return { middleSchools, highSchools, vocationalHighSchools, studentCounts, period: publication.period, source: reportUrl };
}

async function fetchYokHigherEducationStats(cities: string[], targetPeriod: string) {
  const landing = await fetchWithTimeout(YOK_SOURCE);
  const landingHtml = await landing.text();
  const cookie = landing.headers.get('set-cookie')?.split(';')[0] ?? '';
  const dtid = requiredMatch(landingHtml, /dt:'([^']+)'/, 'oturum kimliği');
  const reportMenuUuid = requiredMatch(
    landingHtml,
    /\['zul\.menu\.Menuitem','([^']+)',\{[^\r\n]*label:'\\xDCniversite Baz\\u0131nda \\xD6\\u011Frenci Say\\u0131lar\\u0131'/,
    'üniversite bazında öğrenci raporu',
  );

  const reportPage = await postZkEvent(dtid, cookie, 'onClick', reportMenuUuid, {
    pageX: 0, pageY: 0, which: 1, x: 0, y: 0,
  });
  const yearButtonUuid = uuidById(reportPage, 'btnYilSeciniz');
  const reportButtonUuid = uuidById(reportPage, 'btnRaporuGetir');
  const excelButtonUuid = uuidById(reportPage, 'btnExcel');

  const yearPage = await postZkEvent(dtid, cookie, 'onClick', yearButtonUuid, {
    pageX: 0, pageY: 0, which: 1, x: 0, y: 0,
  });
  const yearListUuid = uuidById(yearPage, 'lbYillar');
  const yearMatches = [...yearPage.matchAll(
    /\['zul\.sel\.Listitem','([^']+)',\{_loaded:true,_index:\d+\}[\s\S]*?label:'(\d{4}-\d{4})'/g,
  )];
  const selectedYearMatch = yearMatches.find(match => match[2] === targetPeriod);
  if (!selectedYearMatch) throw new Error(`YÖK raporunda ${targetPeriod} öğretim yılı bulunamadı`);
  const [, selectedYearItemUuid, period] = selectedYearMatch;
  const chooseYearButtonUuid = uuidById(yearPage, 'btnSecVeAktar');

  await postZkEvent(dtid, cookie, 'onSelect', yearListUuid, {
    items: [selectedYearItemUuid], reference: selectedYearItemUuid, clearFirst: true,
  });
  await postZkEvent(dtid, cookie, 'onClick', chooseYearButtonUuid, {
    pageX: 0, pageY: 0, which: 1, x: 0, y: 0,
  });
  await postZkEvent(dtid, cookie, 'onClick', reportButtonUuid, {
    pageX: 0, pageY: 0, which: 1, x: 0, y: 0,
  });
  const excelPage = await postZkEvent(dtid, cookie, 'onClick', excelButtonUuid, {
    pageX: 0, pageY: 0, which: 1, x: 0, y: 0,
  });
  const reportPath = requiredMatch(excelPage, /src:'([^']+\.xls)'/, 'Excel dosyası');
  if (!reportPath.startsWith('/zkau/view/')) throw new Error('YÖK Excel dosyası beklenmeyen bir adresten döndü');

  const reportResponse = await fetchWithTimeout(new URL(reportPath, YOK_SOURCE).toString(), {
    headers: {
      Referer: YOK_SOURCE,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  const declaredSize = Number(reportResponse.headers.get('content-length') ?? 0);
  if (declaredSize > MAX_YOK_REPORT_BYTES) throw new Error('YÖK Excel dosyası izin verilen boyutu aşıyor');
  const reportBuffer = Buffer.from(await reportResponse.arrayBuffer());
  if (reportBuffer.length === 0 || reportBuffer.length > MAX_YOK_REPORT_BYTES) throw new Error('YÖK Excel dosyası geçersiz boyutta');

  const workbook = XLSX.read(reportBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('YÖK Excel dosyasında çalışma sayfası bulunamadı');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: true, defval: '' });
  const byNormalizedCity = new Map(cities.map(city => [normalize(city), city]));
  const studentCounts = new Map(cities.map(city => [city, 0]));
  const universities = new Map(cities.map(city => [city, new Set<string>()]));

  for (const row of rows) {
    const universityName = String(row[1] ?? '').trim();
    const cityName = String(row[3] ?? '').trim();
    const educationType = normalize(String(row[4] ?? ''));
    if (!['BIRINCI O', 'IKINCI O'].includes(educationType)) continue;
    const city = byNormalizedCity.get(normalize(cityName));
    if (!city) throw new Error(`YÖK raporundaki il eşleştirilemedi: ${cityName}`);
    const total = Number(row[19]);
    if (!Number.isInteger(total) || total < 0) throw new Error(`YÖK öğrenci sayısı geçersiz: ${cityName}`);
    studentCounts.set(city, (studentCounts.get(city) ?? 0) + total);
    universities.get(city)?.add(universityName);
  }

  if ([...studentCounts.values()].some(count => count < 1)) throw new Error('YÖK raporunda öğrencisi bulunmayan il oluştu');
  const nationalStudentTotal = [...studentCounts.values()].reduce((sum, count) => sum + count, 0);
  if (nationalStudentTotal < 2_000_000 || nationalStudentTotal > 10_000_000) {
    throw new Error(`YÖK öğrenci toplamı beklenen aralığın dışında: ${nationalStudentTotal}`);
  }
  const universityCounts = new Map([...universities].map(([city, names]) => [city, names.size]));
  const nationalUniversityTotal = [...universityCounts.values()].reduce((sum, count) => sum + count, 0);
  if (nationalUniversityTotal < 180 || nationalUniversityTotal > 250) {
    throw new Error(`YÖK üniversite toplamı beklenen aralığın dışında: ${nationalUniversityTotal}`);
  }
  return { studentCounts, universityCounts, period };
}

async function currentTurkishCities() {
  const response = await fetchWithTimeout(YOK_CITIES);
  const cities = (await response.json() as YokCity[])
    .filter(city => city.ilKodu >= 1 && city.ilKodu <= 81)
    .map(city => city.ilAdi.toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g, letter => letter.toLocaleUpperCase('tr-TR')));
  if (cities.length !== EXPECTED_CITY_COUNT) throw new Error(`YÖK il sayısı beklenen ${EXPECTED_CITY_COUNT}, gelen ${cities.length}`);
  return cities;
}

async function persist(stats: Record<string, InstitutionCounts>, period: string, syncedAt: Date, mebSource = MEB_SOURCE) {
  await educationStatsDatabase.$transaction(async transaction => {
    for (const [city, values] of Object.entries(stats)) {
      await transaction.educationInstitutionStat.upsert({
        where: { city },
        create: { city, ...values, period, mebSource, yokSource: YOK_SOURCE, syncStatus: 'success', syncError: null, lastAttemptAt: syncedAt, syncedAt },
        update: { ...values, period, mebSource, yokSource: YOK_SOURCE, syncStatus: 'success', syncError: null, lastAttemptAt: syncedAt, syncedAt },
      });
    }
    await transaction.educationInstitutionStat.deleteMany({ where: { city: { notIn: Object.keys(stats) } } });
  });
}

export async function ensureEducationStatsFallback() {
  const count = await educationStatsDatabase.educationInstitutionStat.count();
  if (count === 0) {
    const fallback = Object.fromEntries(Object.entries(educationInstitutionStats).map(([city, values]) => [city, {
      ...values,
      studentCount: 0,
      mebStudentCount: 0,
      higherEducationStudentCount: 0,
    }]));
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
  const yok = await fetchYokHigherEducationStats(cities, meb.period);
  if (meb.period !== yok.period) {
    throw new Error(`MEB/YÖK dönemleri eşleşmiyor: MEB ${meb.period}, YÖK ${yok.period}`);
  }
  const byNormalizedCity = new Map(cities.map(city => [normalize(city), city]));
  const result: Record<string, InstitutionCounts> = {};

  for (const [mebCity, middleSchools] of meb.middleSchools) {
    const city = byNormalizedCity.get(normalize(mebCity));
    if (!city) throw new Error(`MEB/YÖK il eşleşmesi bulunamadı: ${mebCity}`);
    const mebStudentCount = meb.studentCounts.get(mebCity) ?? 0;
    const higherEducationStudentCount = yok.studentCounts.get(city) ?? 0;
    result[city] = {
      studentCount: mebStudentCount + higherEducationStudentCount,
      mebStudentCount,
      higherEducationStudentCount,
      universities: yok.universityCounts.get(city) ?? 0,
      middleSchools,
      highSchools: meb.highSchools.get(mebCity) ?? 0,
      vocationalHighSchools: meb.vocationalHighSchools.get(mebCity) ?? 0,
    };
  }
  if (Object.keys(result).length !== EXPECTED_CITY_COUNT) throw new Error('Eksik eğitim istatistiği nedeniyle güncelleme iptal edildi');
  await persist(result, meb.period, new Date(), meb.source);
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
