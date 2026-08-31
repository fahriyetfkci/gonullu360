import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors";
import { DraftQuery, FormDefinition, PublishBody, SaveDraftBody, isFormDefinitionPublishable } from "./form.schema";

interface DraftResult {
  formId: string;
  schema: FormDefinition;
  revision: number;
  updatedAt: Date;
}

interface PublishedResult {
  formId: string;
  schema: FormDefinition;
  version: number;
  publishedAt: Date;
}

async function getOrganization(slug: string): Promise<{ id: string }> {
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!organization?.isActive) {
    throw new NotFoundError("Organizasyon bulunamadı");
  }
  return organization;
}

function asFormDefinition(value: Prisma.JsonValue): FormDefinition {
  return value as unknown as FormDefinition;
}

export async function getDraft(query: DraftQuery): Promise<DraftResult | null> {
  const organization = await getOrganization(query.organizationSlug);
  const form = query.clientFormId
    ? await prisma.form.findUnique({
        where: { orgId_clientFormId: { orgId: organization.id, clientFormId: query.clientFormId } },
      })
    : await prisma.form.findFirst({
        where: { orgId: organization.id },
        orderBy: { updatedAt: "desc" },
      });

  if (!form) return null;
  return { formId: form.id, schema: asFormDefinition(form.draftSchema), revision: form.draftRevision, updatedAt: form.updatedAt };
}

export async function saveDraft(body: SaveDraftBody): Promise<DraftResult> {
  const organization = await getOrganization(body.organizationSlug);
  const key = { orgId: organization.id, clientFormId: body.schema.id };
  const existing = await prisma.form.findUnique({ where: { orgId_clientFormId: key } });
  const jsonSchema = body.schema as unknown as Prisma.InputJsonValue;

  if (!existing) {
    if (body.expectedRevision !== 0) throw new ConflictError();
    const created = await prisma.form.create({
      data: {
        ...key,
        title: body.schema.title,
        description: body.schema.description || null,
        draftSchema: jsonSchema,
        draftRevision: 1,
      },
    });
    return { formId: created.id, schema: body.schema, revision: created.draftRevision, updatedAt: created.updatedAt };
  }

  if (existing.draftRevision !== body.expectedRevision) throw new ConflictError();
  const updated = await prisma.form.updateMany({
    where: { id: existing.id, draftRevision: body.expectedRevision },
    data: {
      title: body.schema.title,
      description: body.schema.description || null,
      draftSchema: jsonSchema,
      draftRevision: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw new ConflictError();

  const saved = await prisma.form.findUniqueOrThrow({ where: { id: existing.id } });
  return { formId: saved.id, schema: asFormDefinition(saved.draftSchema), revision: saved.draftRevision, updatedAt: saved.updatedAt };
}

export async function publish(body: PublishBody): Promise<PublishedResult> {
  const organization = await getOrganization(body.organizationSlug);

  return prisma.$transaction(async (transaction) => {
    const form = await transaction.form.findUnique({
      where: { orgId_clientFormId: { orgId: organization.id, clientFormId: body.clientFormId } },
    });
    if (!form) throw new NotFoundError("Yayınlanacak form bulunamadı");
    if (form.draftRevision !== body.expectedRevision) throw new ConflictError();

    const draftSchema = asFormDefinition(form.draftSchema);
    if (!isFormDefinitionPublishable(draftSchema)) {
      throw new ValidationError("Form adı, alanları ve seçenekleri yayınlanmaya hazır değil");
    }

    const version = form.publishedVersion + 1;
    const versionRecord = await transaction.formVersion.create({
      data: {
        formId: form.id,
        version,
        schema: form.draftSchema as Prisma.InputJsonValue,
      },
    });
    const updated = await transaction.form.updateMany({
      where: { id: form.id, draftRevision: body.expectedRevision, publishedVersion: form.publishedVersion },
      data: { publishedVersion: version, publishedAt: versionRecord.publishedAt },
    });
    if (updated.count !== 1) throw new ConflictError("Form yayınlanırken başka bir işlem tarafından güncellendi");

    return { formId: form.id, schema: draftSchema, version, publishedAt: versionRecord.publishedAt };
  });
}

export async function getPublished(query: DraftQuery): Promise<PublishedResult | null> {
  const organization = await getOrganization(query.organizationSlug);
  const form = query.clientFormId
    ? await prisma.form.findUnique({
        where: { orgId_clientFormId: { orgId: organization.id, clientFormId: query.clientFormId } },
      })
    : await prisma.form.findFirst({
        where: { orgId: organization.id, publishedVersion: { gt: 0 } },
        orderBy: { publishedAt: "desc" },
      });

  if (!form || form.publishedVersion === 0) return null;
  const version = await prisma.formVersion.findUniqueOrThrow({
    where: { formId_version: { formId: form.id, version: form.publishedVersion } },
  });
  return { formId: form.id, schema: asFormDefinition(version.schema), version: version.version, publishedAt: version.publishedAt };
}
