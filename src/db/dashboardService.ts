import prisma from './prisma';

const toNumber = (value: unknown): number => Number(value ?? 0);
const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const defaultCities = ['İstanbul', 'Ankara', 'İzmir', 'Kocaeli', 'Bursa', 'Sivas', 'Antalya', 'Konya'];

type MonthlyRow = { month: number; city: string; gender: string; count: bigint };
type DemographicRow = { ageGroup: string; city: string; gender: string; activeCount: bigint; totalCount: bigint };

export async function getDashboardStats(year: number, organizationId: string) {
  const [activeRows, eventRows, previousRows, monthlyRows, participationRows, demographicRows, latest, totalVolunteers] = await Promise.all([
    prisma.$queryRaw<Array<{ totalActive: bigint; lowParticipation: bigint }>>`
      SELECT COUNT(*) AS "totalActive",
             COUNT(*) FILTER (WHERE participation_count <= 1) AS "lowParticipation"
      FROM (
        SELECT v.id, COUNT(ep.id) AS participation_count
        FROM volunteers v
        LEFT JOIN event_participants ep ON ep.volunteer_id = v.id
        WHERE v.active = true AND v.organization_id = ${organizationId}
        GROUP BY v.id
      ) AS active_volunteers`,
    prisma.$queryRaw<Array<{ totalEvents: bigint; completedEvents: bigint }>>`
      SELECT COUNT(*) AS "totalEvents",
             COUNT(*) FILTER (WHERE completed = true) AS "completedEvents"
      FROM events
      WHERE organization_id = ${organizationId} AND EXTRACT(YEAR FROM date) = ${year}`,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS "count"
      FROM events
      WHERE organization_id = ${organizationId} AND completed = true AND EXTRACT(YEAR FROM date) = ${year - 1}`,
    prisma.$queryRaw<MonthlyRow[]>`
      SELECT EXTRACT(MONTH FROM created_at)::int AS "month",
             city, gender, COUNT(*) AS "count"
      FROM volunteers
      WHERE organization_id = ${organizationId} AND EXTRACT(YEAR FROM created_at) = ${year}
      GROUP BY 1, 2, 3`,
    prisma.$queryRaw<Array<{ name: string; count: bigint; target: number }>>`
      SELECT e.name, COUNT(ep.id) AS "count", e.target
      FROM events e
      LEFT JOIN event_participants ep ON ep.event_id = e.id
      WHERE e.organization_id = ${organizationId} AND EXTRACT(YEAR FROM e.date) = ${year}
      GROUP BY e.id
      ORDER BY e.date`,
    prisma.$queryRaw<DemographicRow[]>`
      SELECT CASE
               WHEN age BETWEEN 17 AND 25 THEN '17-25'
               WHEN age BETWEEN 26 AND 35 THEN '25-35'
               WHEN age BETWEEN 36 AND 45 THEN '35-45'
               ELSE '45+'
             END AS "ageGroup",
             city, gender,
             COUNT(*) FILTER (WHERE active = true) AS "activeCount",
             COUNT(*) AS "totalCount"
      FROM volunteers
      WHERE organization_id = ${organizationId}
      GROUP BY 1, 2, 3`,
    prisma.volunteer.findMany({
      where: { organizationId }, orderBy: { id: 'desc' },
      take: 10,
      select: { name: true, city: true, gender: true, age: true, createdAt: true },
    }),
    prisma.volunteer.count({ where: { organizationId } }),
  ]);

  const totalActive = toNumber(activeRows[0]?.totalActive);
  const lowParticipation = toNumber(activeRows[0]?.lowParticipation);
  const totalEvents = toNumber(eventRows[0]?.totalEvents);
  const completedEvents = toNumber(eventRows[0]?.completedEvents);
  const previousCompleted = toNumber(previousRows[0]?.count);
  const cities = [...new Set([...defaultCities, ...monthlyRows.map((row: MonthlyRow) => row.city)])];

  const monthlyData = monthNames.map((month: string, index: number) => {
    const selected = monthlyRows.filter((row: MonthlyRow) => row.month === index + 1);
    const bölge = Object.fromEntries(cities.map(city => [city, 0])) as Record<string, number>;
    const cinsiyet: Record<string, number> = { Erkek: 0, Kadın: 0 };
    let genel = 0;
    for (const row of selected) {
      const count = toNumber(row.count);
      genel += count;
      bölge[row.city] = (bölge[row.city] ?? 0) + count;
      cinsiyet[row.gender] = (cinsiyet[row.gender] ?? 0) + count;
    }
    return { month, genel, bölge, cinsiyet };
  });

  const latestMonthIndex = monthlyData.reduce((last: number, item, index) => item.genel > 0 ? index : last, -1);
  const latestTotal = latestMonthIndex >= 0 ? monthlyData[latestMonthIndex].genel : 0;
  const previousTotal = latestMonthIndex > 0 ? monthlyData[latestMonthIndex - 1].genel : 0;
  const monthlyIncrease = previousTotal > 0
    ? Math.round((latestTotal - previousTotal) / previousTotal * 100)
    : latestTotal > 0 ? 100 : 0;

  const demographicData = ['17-25', '25-35', '35-45', '45+'].map((ageGroup: string) => {
    const rows = demographicRows.filter((row: DemographicRow) => row.ageGroup === ageGroup);
    const cinsiyet: Record<string, number> = { Erkek: 0, Kadın: 0 };
    for (const row of rows) cinsiyet[row.gender] = (cinsiyet[row.gender] ?? 0) + toNumber(row.totalCount);
    return {
      ageGroup,
      bölge: new Set(rows.map((row: DemographicRow) => row.city)).size,
      cinsiyet,
      aktif: rows.reduce((sum: number, row: DemographicRow) => sum + toNumber(row.activeCount), 0),
    };
  });

  return {
    activeVolunteers: { total: totalActive, regular: totalActive - lowParticipation, lowParticipation, monthlyIncrease },
    completedEvents: {
      total: completedEvents,
      target: totalEvents,
      rate: totalEvents ? Math.round(completedEvents / totalEvents * 100) : 0,
      yearlyIncrease: completedEvents - previousCompleted,
    },
    monthlyVolunteers: { year, data: monthlyData },
    eventParticipation: participationRows.map(row => ({ ...row, count: toNumber(row.count) })),
    demographicData,
    volunteers: latest.map(item => ({
      name: item.name,
      city: item.city,
      gender: item.gender,
      age: item.age,
      date: item.createdAt.toISOString().slice(0, 10),
    })),
    pagination: { total: totalVolunteers, page: 1, limit: 10, totalPages: Math.ceil(totalVolunteers / 10) },
  };
}

export async function getDashboardRange(startYear: number, endYear: number, organizationId: string) {
  type RangeRow = { year: number; city: string; gender: string; count: bigint };
  const rows = await prisma.$queryRaw<RangeRow[]>`
    SELECT EXTRACT(YEAR FROM created_at)::int AS "year",
           city, gender, COUNT(*) AS "count"
    FROM volunteers
    WHERE organization_id = ${organizationId} AND EXTRACT(YEAR FROM created_at) <= ${endYear}
    GROUP BY 1, 2, 3
    ORDER BY 1`;

  const byYear = new Map<number, RangeRow[]>();
  for (const row of rows) {
    if (!byYear.has(row.year)) byYear.set(row.year, []);
    byYear.get(row.year)!.push(row);
  }

  const gender: Record<string, number> = { Erkek: 0, Kadın: 0 };
  const region: Record<string, number> = {};
  let total = 0;
  for (const row of rows.filter((item: RangeRow) => item.year < startYear)) {
    const count = toNumber(row.count);
    total += count;
    gender[row.gender] = (gender[row.gender] ?? 0) + count;
    region[row.city] = (region[row.city] ?? 0) + count;
  }

  return {
    startYear,
    endYear,
    data: Array.from({ length: endYear - startYear + 1 }, (_, index: number) => {
      const year = startYear + index;
      for (const row of byYear.get(year) ?? []) {
        const count = toNumber(row.count);
        total += count;
        gender[row.gender] = (gender[row.gender] ?? 0) + count;
        region[row.city] = (region[row.city] ?? 0) + count;
      }
      return { year, total, gender: { ...gender }, region: { ...region } };
    }),
  };
}

export async function getDashboardYearBounds(organizationId: string) {
  const rows = await prisma.$queryRaw<Array<{ minYear: number | null; maxYear: number | null }>>`
    SELECT MIN(EXTRACT(YEAR FROM created_at))::int AS "minYear",
           MAX(EXTRACT(YEAR FROM created_at))::int AS "maxYear"
    FROM volunteers WHERE organization_id = ${organizationId}`;
  const currentYear = new Date().getFullYear();
  return {
    minYear: rows[0]?.minYear ?? currentYear,
    maxYear: rows[0]?.maxYear ?? currentYear,
  };
}
