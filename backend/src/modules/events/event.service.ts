import { EventGroup, EventStatus, Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors";
import { CreateEventGroupBody, EventInput, ListEventsQuery } from "./event.schema";

const eventInclude = {
  groups: { include: { group: true } },
  registrationForm: { select: { id: true, title: true, publishedVersion: true } },
} satisfies Prisma.EventInclude;

type EventWithRelations = Prisma.EventGetPayload<{ include: typeof eventInclude }>;
type SerializedEvent = Omit<EventWithRelations, "groups"> & {
  groups: EventWithRelations["groups"][number]["group"][];
};

interface EventRecordData {
  name: string;
  slug: string;
  type: EventInput["type"];
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  address: string | null;
  capacity: number | null;
  contactInfo: string | null;
  description: string | null;
  posterUrl: string | null;
  posterStorageKey: string | null;
  registrationFormId: string | null;
}

function serializeEvent(event: EventWithRelations): SerializedEvent {
  const { groups, ...record } = event;
  return { ...record, groups: groups.map(({ group }) => group) };
}

async function validateReferences(orgId: string, body: EventInput): Promise<void> {
  const groupCount = await prisma.eventGroup.count({
    where: { orgId, id: { in: body.groupIds } },
  });
  if (groupCount !== body.groupIds.length) {
    throw new ValidationError("Seçilen gruplardan biri bu organizasyona ait değil");
  }

  if (body.registrationFormId) {
    const form = await prisma.form.findFirst({
      where: { id: body.registrationFormId, orgId, publishedVersion: { gt: 0 } },
      select: { id: true },
    });
    if (!form) throw new ValidationError("Seçilen kayıt formu bulunamadı veya yayımlanmamış");
  }
}

function eventData(body: EventInput): EventRecordData {
  return {
    name: body.name,
    slug: body.slug,
    type: body.type,
    startsAt: new Date(body.startsAt),
    endsAt: new Date(body.endsAt),
    timezone: body.timezone,
    address: body.type === "ONLINE" ? null : body.address || null,
    capacity: body.capacity ?? null,
    contactInfo: body.contactInfo || null,
    description: body.description || null,
    posterUrl: body.posterUrl || null,
    posterStorageKey: body.posterStorageKey || null,
    registrationFormId: body.registrationFormId || null,
  };
}

function rethrowKnownPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictError("Bu kısa URL başka bir etkinlik tarafından kullanılıyor", "EVENT_SLUG_TAKEN");
  }
  throw error;
}

export async function listEvents(
  orgId: string,
  query: ListEventsQuery,
): Promise<{ items: SerializedEvent[]; pagination: { page: number; limit: number; total: number } }> {
  const where: Prisma.EventWhereInput = {
    orgId,
    ...(query.status ? { status: query.status as EventStatus } : { status: { not: "ARCHIVED" } }),
    ...(query.groupId ? { groups: { some: { groupId: query.groupId } } } : {}),
    ...(query.search
      ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { slug: { contains: query.search, mode: "insensitive" } }] }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: { startsAt: "asc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.event.count({ where }),
  ]);
  return { items: items.map(serializeEvent), pagination: { page: query.page, limit: query.limit, total } };
}

export async function getEvent(orgId: string, id: string): Promise<SerializedEvent> {
  const event = await prisma.event.findFirst({ where: { id, orgId }, include: eventInclude });
  if (!event) throw new NotFoundError("Etkinlik bulunamadı");
  return serializeEvent(event);
}

export async function createEvent(orgId: string, userId: string, body: EventInput): Promise<SerializedEvent> {
  await validateReferences(orgId, body);
  try {
    const event = await prisma.event.create({
      data: {
        orgId,
        createdById: userId,
        ...eventData(body),
        groups: { create: body.groupIds.map((groupId) => ({ groupId })) },
      },
      include: eventInclude,
    });
    return serializeEvent(event);
  } catch (error) {
    rethrowKnownPrismaError(error);
  }
}

export async function updateEvent(orgId: string, id: string, body: EventInput): Promise<SerializedEvent> {
  await getEvent(orgId, id);
  await validateReferences(orgId, body);
  try {
    return await prisma.$transaction(async (transaction) => {
      await transaction.eventGroupAssignment.deleteMany({ where: { eventId: id } });
      const event = await transaction.event.update({
        where: { id },
        data: {
          ...eventData(body),
          groups: { create: body.groupIds.map((groupId) => ({ groupId })) },
        },
        include: eventInclude,
      });
      return serializeEvent(event);
    });
  } catch (error) {
    rethrowKnownPrismaError(error);
  }
}

export async function archiveEvent(orgId: string, id: string): Promise<SerializedEvent> {
  await getEvent(orgId, id);
  const event = await prisma.event.update({
    where: { id },
    data: { status: "ARCHIVED" },
    include: eventInclude,
  });
  return serializeEvent(event);
}

export async function getOptions(orgId: string): Promise<{
  groups: EventGroup[];
  forms: Array<{ id: string; title: string; publishedVersion: number }>;
}> {
  const [groups, forms] = await Promise.all([
    prisma.eventGroup.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } }),
    prisma.form.findMany({
      where: { orgId, publishedVersion: { gt: 0 } },
      select: { id: true, title: true, publishedVersion: true },
      orderBy: { title: "asc" },
    }),
  ]);
  return { groups, forms };
}

export async function createGroup(orgId: string, body: CreateEventGroupBody): Promise<EventGroup> {
  try {
    return await prisma.eventGroup.create({ data: { orgId, ...body } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Bu isimde bir grup zaten var", "EVENT_GROUP_EXISTS");
    }
    throw error;
  }
}
