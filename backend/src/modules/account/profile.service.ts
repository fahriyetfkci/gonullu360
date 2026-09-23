import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { ProfileInput } from "./profile.schema";

const profileSelect = {
  id: true, orgId: true, name: true, email: true, role: true, isVerified: true,
  phone: true, jobTitle: true, about: true, address: true, website: true, photo: true,
  organization: { select: { name: true } },
} satisfies Prisma.UserSelect;
type AccountProfile = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

export async function getProfile(userId: string, orgId: string): Promise<AccountProfile> {
  const user = await prisma.user.findFirst({
    where: { id: userId, orgId, isActive: true, organization: { isActive: true } }, select: profileSelect,
  });
  if (!user) throw new NotFoundError("Kullanıcı bulunamadı.");
  return user;
}

export async function updateProfile(userId: string, orgId: string, input: ProfileInput): Promise<AccountProfile> {
  const current = await getProfile(userId, orgId);
  try {
    return await prisma.user.update({
      where: { id: userId, orgId, isActive: true },
      data: {
        name: input.name, email: input.email, phone: input.phone, jobTitle: input.jobTitle,
        about: input.about, address: input.address, website: input.website, photo: input.photo,
        ...(current.email !== input.email ? { isVerified: false } : {}),
      },
      select: profileSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Bu e-posta adresi kurumunuzda zaten kullanılıyor.");
    }
    throw error;
  }
}
