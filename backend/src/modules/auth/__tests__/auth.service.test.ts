jest.mock("../../../database/prisma", () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    refreshSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("../../../database/redis", () => ({
  redis: {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock("../../../utils/email", () => ({
  sendMail: jest.fn(),
  buildVerifyEmailHtml: jest.fn(() => "<p>verify</p>"),
  buildResetPasswordHtml: jest.fn(() => "<p>reset</p>"),
}));

jest.mock("../../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { prisma } from "../../../database/prisma";
import { redis } from "../../../database/redis";
import { sendMail } from "../../../utils/email";
import { hashPassword } from "../../../utils/password";
import {
  forgotPassword,
  login,
  refresh,
  register,
} from "../auth.service";

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedRedis = redis as jest.Mocked<typeof redis>;
const mockedSendMail = jest.mocked(sendMail);
const organizationFindUniqueMock =
  mockedPrisma.organization.findUnique as unknown as jest.Mock;
const userFindUniqueMock =
  mockedPrisma.user.findUnique as unknown as jest.Mock;
const userCreateMock = mockedPrisma.user.create as unknown as jest.Mock;
const userFindUniqueOrThrowMock =
  mockedPrisma.user.findUniqueOrThrow as unknown as jest.Mock;
const refreshSessionFindUniqueMock =
  mockedPrisma.refreshSession.findUnique as unknown as jest.Mock;
const refreshSessionCreateMock =
  mockedPrisma.refreshSession.create as unknown as jest.Mock;
const refreshSessionUpdateMock =
  mockedPrisma.refreshSession.update as unknown as jest.Mock;

const meta = {
  ipAddress: "127.0.0.1",
  userAgent: "jest",
};

describe("auth service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers a user and does not fail when verification email delivery fails", async () => {
    organizationFindUniqueMock.mockResolvedValue({
      id: "org-1",
      name: "IHH",
      slug: "ihh",
      isActive: true,
      createdAt: new Date(),
    });
    userFindUniqueMock.mockResolvedValue(null);
    userCreateMock.mockResolvedValue({
      id: "user-1",
      orgId: "org-1",
      email: "volunteer@example.com",
      passwordHash: "hash",
      role: "VOLUNTEER",
      isVerified: false,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      mfaEnabled: false,
      mfaSecret: null,
      backupCodesHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedRedis.setex.mockResolvedValue("OK");
    mockedSendMail.mockRejectedValue(new Error("smtp down"));

    await expect(
      register(
        {
          organizationSlug: "ihh",
          email: "volunteer@example.com",
          password: "Str0ng!Pass1",
        },
        meta,
      ),
    ).resolves.toEqual({ userId: "user-1" });
  });

  it("rejects login for unverified users after validating the password", async () => {
    const passwordHash = await hashPassword("Str0ng!Pass1");

    organizationFindUniqueMock.mockResolvedValue({
      id: "org-1",
      name: "IHH",
      slug: "ihh",
      isActive: true,
      createdAt: new Date(),
    });
    userFindUniqueMock.mockResolvedValue({
      id: "user-1",
      orgId: "org-1",
      email: "volunteer@example.com",
      passwordHash,
      role: "VOLUNTEER",
      isVerified: false,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      mfaEnabled: false,
      mfaSecret: null,
      backupCodesHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      login(
        {
          organizationSlug: "ihh",
          email: "volunteer@example.com",
          password: "Str0ng!Pass1",
        },
        meta,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(mockedPrisma.refreshSession.create).not.toHaveBeenCalled();
  });

  it("rotates refresh sessions and revokes the old session", async () => {
    refreshSessionFindUniqueMock
      .mockResolvedValueOnce({
        id: "session-1",
        userId: "user-1",
        tokenHash: "old-hash",
        deviceInfo: null,
        ipAddress: "127.0.0.1",
        userAgent: "jest",
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        replacedByTokenId: null,
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: "session-2",
        userId: "user-1",
        tokenHash: "new-hash",
        deviceInfo: null,
        ipAddress: "127.0.0.1",
        userAgent: "jest",
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        replacedByTokenId: null,
        createdAt: new Date(),
      });
    refreshSessionCreateMock.mockResolvedValue({
      id: "session-2",
      userId: "user-1",
      tokenHash: "new-hash",
      deviceInfo: null,
      ipAddress: "127.0.0.1",
      userAgent: "jest",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: new Date(),
    });
    userFindUniqueOrThrowMock.mockResolvedValue({
      id: "user-1",
      orgId: "org-1",
      email: "volunteer@example.com",
      passwordHash: "hash",
      role: "VOLUNTEER",
      isVerified: true,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      mfaEnabled: false,
      mfaSecret: null,
      backupCodesHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    refreshSessionUpdateMock.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      tokenHash: "old-hash",
      deviceInfo: null,
      ipAddress: "127.0.0.1",
      userAgent: "jest",
      expiresAt: new Date(),
      revokedAt: new Date(),
      replacedByTokenId: "session-2",
      createdAt: new Date(),
    });

    const result = await refresh("opaque-refresh-token", meta);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(mockedPrisma.refreshSession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: {
        revokedAt: expect.any(Date),
        replacedByTokenId: "session-2",
      },
    });
  });

  it("swallows forgot-password email failures to preserve uniform responses", async () => {
    organizationFindUniqueMock.mockResolvedValue({
      id: "org-1",
      name: "IHH",
      slug: "ihh",
      isActive: true,
      createdAt: new Date(),
    });
    userFindUniqueMock.mockResolvedValue({
      id: "user-1",
      orgId: "org-1",
      email: "volunteer@example.com",
      passwordHash: "hash",
      role: "VOLUNTEER",
      isVerified: true,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      mfaEnabled: false,
      mfaSecret: null,
      backupCodesHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedRedis.setex.mockResolvedValue("OK");
    mockedSendMail.mockRejectedValue(new Error("smtp down"));

    await expect(
      forgotPassword(
        {
          organizationSlug: "ihh",
          email: "volunteer@example.com",
        },
        meta,
      ),
    ).resolves.toBeUndefined();
  });
});

