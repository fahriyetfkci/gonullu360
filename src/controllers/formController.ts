import fs from 'fs';
import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import prisma from '../db/prisma';
import { authMiddleware, AuthRequest, requireManager } from '../middleware/auth';
import { formSchema } from '../schemas/form';
import {
  formFileUpload,
  isAcceptedFile,
  removeStoredFiles,
  removeStoredNames,
  storedFilePath,
} from '../services/formFileStorage';

const router = Router();
const managerOnly = [authMiddleware, requireManager];
const parseSchema = (value: unknown) => formSchema.safeParse(value);
const parseId = (value: string | string[]) => {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const validationMessage = (error: z.ZodError) => error.issues.map(issue => issue.message).join('; ');
const pageParams = (req: AuthRequest, defaultLimit = 20) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

function uploadSubmissionFiles(req: Request, res: Response, next: NextFunction) {
  formFileUpload.any()(req, res, error => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Dosya, izin verilen en yüksek boyutu aşıyor'
        : 'Dosya yükleme sınırı aşıldı';
      return res.status(413).json({ error: message });
    }
    return next(error);
  });
}

function parseAnswers(value: unknown) {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as unknown; } catch { return null; }
  }
  return value;
}

router.get('/published/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz form numarası' });
  const form = await prisma.form.findFirst({ where: { id, status: 'published' } });
  if (!form) return res.status(404).json({ error: 'Yayınlanmış form bulunamadı' });
  const version = await prisma.formVersion.findUnique({ where: { formId_version: { formId: id, version: form.currentVersion } } });
  if (!version) return res.status(404).json({ error: 'Yayınlanmış form sürümü bulunamadı' });
  return res.json({ id, version: version.version, publishedAt: version.publishedAt, schema: version.schema });
});

router.post('/:id/submissions', uploadSubmissionFiles, async (req, res) => {
  const uploadedFiles = (req.files as Express.Multer.File[] | undefined) ?? [];
  const reject = async (status: number, error: string) => {
    await removeStoredFiles(uploadedFiles);
    return res.status(status).json({ error });
  };

  const id = parseId(req.params.id);
  if (!id) return reject(400, 'Geçersiz form numarası');
  const form = await prisma.form.findFirst({ where: { id, status: 'published' } });
  if (!form) return reject(404, 'Yayınlanmış form bulunamadı');
  const version = await prisma.formVersion.findUnique({ where: { formId_version: { formId: id, version: form.currentVersion } } });
  const parsed = parseSchema(version?.schema);
  if (!parsed.success) return reject(500, 'Yayınlanan form şeması geçersiz');

  const answers = parseAnswers(req.body?.answers);
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return reject(400, 'Cevaplar geçersiz');
  const answerRecord = answers as Record<string, unknown>;
  const fields = parsed.data.sections.flatMap(section => section.fields);
  const fieldsById = new Map(fields.map(field => [field.id, field]));
  const filesByField = new Map<string, Express.Multer.File[]>();

  for (const file of uploadedFiles) {
    const field = fieldsById.get(file.fieldname);
    if (!field || field.type !== 'file') return reject(400, 'Formda bulunmayan bir dosya alanı gönderildi');
    const current = filesByField.get(file.fieldname) ?? [];
    current.push(file);
    filesByField.set(file.fieldname, current);
  }

  for (const field of fields) {
    if (field.type === 'file') {
      const files = filesByField.get(field.id) ?? [];
      if (files.length > 1) return reject(400, `${field.label} alanına yalnızca bir dosya yüklenebilir`);
      if (field.required && files.length === 0) return reject(400, `${field.label} alanı zorunludur`);
      if (files[0]) {
        const settings = field.fileSettings!;
        if (files[0].size === 0) return reject(400, `${field.label} alanındaki dosya boş olamaz`);
        if (files[0].size > settings.maxSizeMb * 1024 * 1024) return reject(413, `${field.label} dosyası en fazla ${settings.maxSizeMb} MB olabilir`);
        if (!isAcceptedFile(files[0], settings.acceptedTypes)) return reject(415, `${field.label} için bu dosya türüne izin verilmiyor`);
      }
      delete answerRecord[field.id];
      continue;
    }
    const value = answerRecord[field.id];
    if (field.required && (value === undefined || value === null || value === '')) return reject(400, `${field.label} alanı zorunludur`);
  }

  try {
    const submission = await prisma.$transaction(async tx => {
      const created = await tx.formSubmission.create({
        data: { formId: id, formVersion: form.currentVersion, answers: answerRecord as Prisma.InputJsonValue },
      });
      if (uploadedFiles.length) {
        await tx.formSubmissionFile.createMany({
          data: uploadedFiles.map(file => ({
            submissionId: created.id,
            fieldId: file.fieldname,
            originalName: file.originalname,
            storedName: file.filename,
            mimeType: file.mimetype || 'application/octet-stream',
            size: file.size,
          })),
        });
      }
      return created;
    });
    return res.status(201).json({ id: submission.id, fileCount: uploadedFiles.length, message: 'Form cevabı kaydedildi' });
  } catch (error) {
    await removeStoredFiles(uploadedFiles);
    throw error;
  }
});

router.get('/', ...managerOnly, async (req: AuthRequest, res: Response) => {
  const items = await prisma.form.findMany({
    where: { organizationId: req.user!.organizationId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { submissions: true } } },
  });
  return res.json({ forms: items.map(({ _count, ...form }) => ({ ...form, schema: form.draftSchema, draftSchema: undefined, revision: form.draftRevision, submissionCount: _count.submissions })) });
});

router.post('/', ...managerOnly, async (req: AuthRequest, res: Response) => {
  const parsed = parseSchema(req.body?.schema);
  if (!parsed.success) return res.status(422).json({ error: validationMessage(parsed.error) });
  try {
    const form = await prisma.form.create({ data: {
      organizationId: req.user!.organizationId,
      clientFormId: parsed.data.id,
      title: parsed.data.title.trim() || 'İsimsiz Form',
      description: parsed.data.description?.trim() || null,
      draftSchema: parsed.data as Prisma.InputJsonValue,
      createdById: req.user!.id,
    } });
    return res.status(201).json({ id: form.id, schema: parsed.data, status: form.status, currentVersion: 0, revision: form.draftRevision });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'Bu form daha önce oluşturulmuş' });
    throw error;
  }
});

router.get('/:id', ...managerOnly, async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz form numarası' });
  const form = await prisma.form.findFirst({ where: { id, organizationId: req.user!.organizationId } });
  if (!form) return res.status(404).json({ error: 'Form bulunamadı' });
  return res.json({ ...form, schema: form.draftSchema, draftSchema: undefined, revision: form.draftRevision });
});

router.put('/:id', ...managerOnly, async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz form numarası' });
  const parsed = parseSchema(req.body?.schema);
  if (!parsed.success) return res.status(422).json({ error: validationMessage(parsed.error) });
  const expectedRevision = Number(req.body?.expectedRevision);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return res.status(428).json({ error: 'Taslak revision bilgisi gereklidir' });
  const updated = await prisma.form.updateMany({
    where: { id, organizationId: req.user!.organizationId, draftRevision: expectedRevision },
    data: { title: parsed.data.title.trim() || 'İsimsiz Form', description: parsed.data.description?.trim() || null, draftSchema: parsed.data as Prisma.InputJsonValue, draftRevision: { increment: 1 } },
  });
  if (!updated.count) return res.status(409).json({ error: 'Taslak başka bir oturumda güncellendi. Sayfayı yenileyin.' });
  return res.json({ id, schema: parsed.data, revision: expectedRevision + 1, message: 'Taslak kaydedildi' });
});

router.post('/:id/publish', ...managerOnly, async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz form numarası' });
  const expectedRevision = Number(req.body?.expectedRevision);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return res.status(428).json({ error: 'Taslak revision bilgisi gereklidir' });
  try {
    const result = await prisma.$transaction(async tx => {
      const form = await tx.form.findFirst({ where: { id, organizationId: req.user!.organizationId } });
      if (!form) return null;
      if (form.draftRevision !== expectedRevision) throw new Error('REVISION_CONFLICT');
      const parsed = parseSchema(form.draftSchema);
      if (!parsed.success || parsed.data.title.trim().length < 2 || !parsed.data.sections.some(section => section.fields.length)) throw new Error('NOT_PUBLISHABLE');
      const nextVersion = form.currentVersion + 1;
      const published = await tx.formVersion.create({ data: { formId: id, version: nextVersion, schema: form.draftSchema as Prisma.InputJsonValue, publishedById: req.user!.id } });
      await tx.form.update({ where: { id }, data: { status: 'published', currentVersion: nextVersion, publishedAt: published.publishedAt } });
      return { version: nextVersion, schema: parsed.data, publishedAt: published.publishedAt };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!result) return res.status(404).json({ error: 'Form bulunamadı' });
    return res.json({ id, status: 'published', ...result });
  } catch (error) {
    if (error instanceof Error && error.message === 'REVISION_CONFLICT') return res.status(409).json({ error: 'Taslak başka bir oturumda güncellendi. Sayfayı yenileyin.' });
    if (error instanceof Error && error.message === 'NOT_PUBLISHABLE') return res.status(422).json({ error: 'Yayınlamak için form adı ve en az bir geçerli alan gereklidir' });
    throw error;
  }
});

router.get('/:id/submissions', ...managerOnly, async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz form numarası' });
  if (!await prisma.form.count({ where: { id, organizationId: req.user!.organizationId } })) return res.status(404).json({ error: 'Form bulunamadı' });
  const { page, limit, skip } = pageParams(req);
  const [submissions, total] = await Promise.all([
    prisma.formSubmission.findMany({
      where: { formId: id }, orderBy: { submittedAt: 'desc' }, skip, take: limit,
      include: { files: { select: { id: true, fieldId: true, originalName: true, mimeType: true, size: true } } },
    }),
    prisma.formSubmission.count({ where: { formId: id } }),
  ]);
  return res.json({
    submissions: submissions.map(submission => ({
      ...submission,
      files: submission.files.map(file => ({ ...file, downloadUrl: `/forms/${id}/submissions/${submission.id}/files/${file.id}` })),
    })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

router.get('/:formId/submissions/:submissionId/files/:fileId', ...managerOnly, async (req: AuthRequest, res: Response) => {
  const formId = parseId(req.params.formId);
  const submissionId = parseId(req.params.submissionId);
  if (!formId || !submissionId) return res.status(400).json({ error: 'Geçersiz kayıt numarası' });
  const file = await prisma.formSubmissionFile.findFirst({
    where: {
      id: String(req.params.fileId), submissionId,
      submission: { formId, form: { organizationId: req.user!.organizationId } },
    },
  });
  if (!file) return res.status(404).json({ error: 'Dosya bulunamadı' });
  const filePath = storedFilePath(file.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Dosya depolama alanında bulunamadı' });
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.download(filePath, file.originalName);
});

router.delete('/:id', ...managerOnly, async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz form numarası' });
  const form = await prisma.form.findFirst({
    where: { id, organizationId: req.user!.organizationId },
    select: { submissions: { select: { files: { select: { storedName: true } } } } },
  });
  if (!form) return res.status(404).json({ error: 'Form bulunamadı' });
  await prisma.form.delete({ where: { id } });
  await removeStoredNames(form.submissions.flatMap(submission => submission.files.map(file => file.storedName)));
  return res.json({ message: 'Form silindi' });
});

export default router;
