import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';
import { authMiddleware, AuthRequest, requireManager } from '../middleware/auth';

const router = Router();
router.use(authMiddleware, requireManager);

const profileSelect = {
  id: true, name: true, email: true, role: true, phone: true, website: true,
  jobTitle: true, about: true, address: true, photoUrl: true,
  emailNotifications: true, systemNotifications: true,
  organization: { select: { id: true, name: true, slug: true } },
} as const;

function validProfilePhoto(value: string) {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return false;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 1024 * 1024 || bytes.length < 8) return false;
  const signature = match[1] === 'png' ? [137, 80, 78, 71, 13, 10, 26, 10] : [255, 216, 255];
  return signature.every((byte, index) => bytes[index] === byte);
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(254).toLowerCase().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  website: z.union([z.literal(''), z.string().trim().url().max(500).refine(value => /^https?:\/\//i.test(value), 'Website http veya https ile başlamalıdır.')]).nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
  about: z.string().trim().max(2000).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  photoUrl: z.string().max(1_400_000).refine(validProfilePhoto, 'En fazla 1 MB boyutunda PNG veya JPEG görsel seçin.').nullable().optional(),
  emailNotifications: z.boolean().optional(),
  systemNotifications: z.boolean().optional(),
}).strict();

router.get('/profile', async (req: AuthRequest, res: Response) => {
  const profile = await prisma.user.findFirst({ where: { id: req.user!.id, organizationId: req.user!.organizationId }, select: profileSelect });
  if (!profile) return res.status(404).json({ error: 'Profil bulunamadı' });
  return res.json(profile);
});

router.put('/profile', async (req: AuthRequest, res: Response) => {
  const data = profileSchema.parse(req.body);
  if (data.email) {
    const duplicate = await prisma.user.count({ where: { organizationId: req.user!.organizationId, email: data.email, id: { not: req.user!.id } } });
    if (duplicate) return res.status(409).json({ error: 'Bu e-posta adresi kurumunuzda zaten kullanılıyor.' });
  }
  const current = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } });
  const profile = await prisma.user.update({ where: { id: req.user!.id }, data: { ...data, ...(data.email && data.email !== current?.email ? { isVerified: false } : {}) }, select: profileSelect });
  return res.json(profile);
});

router.get('/users', async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { organizationId: req.user!.organizationId },
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });
  return res.json({ users });
});

export default router;
