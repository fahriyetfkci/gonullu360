import request from "supertest";
import { createApp } from "../../../app";
import { signAccessToken } from "../../../utils/token";
import * as authService from "../auth.service";

jest.mock("../../../middleware/rateLimiter", () => {
  const next = (
    _req: unknown,
    _res: unknown,
    callback: (error?: unknown) => void,
  ): void => callback();

  return {
    globalRateLimit: next,
    loginIpRateLimit: next,
    loginTenantRateLimit: next,
    sensitiveEndpointRateLimit: next,
  };
});

jest.mock("../auth.service");

const mockedAuthService = jest.mocked(authService);
const app = createApp();

function getSetCookies(header: string | string[] | undefined): string[] {
  if (!header) {
    return [];
  }

  return Array.isArray(header) ? header : [header];
}

function getCookieValue(cookies: string[], name: string): string {
  const cookie = cookies.find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    throw new Error(`Cookie ${name} not found`);
  }

  return cookie.split(";")[0].split("=")[1] ?? "";
}

describe("auth routes", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("registers on valid payload", async () => {
    mockedAuthService.register.mockResolvedValue({ userId: "user-1" });

    const response = await request(app).post("/api/auth/register").send({
      organizationSlug: "ihh",
      email: "volunteer@example.com",
      password: "Str0ng!Pass1",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.userId).toBe("user-1");
  });

  it("rejects invalid register payloads", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "volunteer@example.com",
    });

    expect(response.status).toBe(422);
  });

  it("logs in, returns an access token, and sets auth cookies", async () => {
    mockedAuthService.login.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      sessionId: "session-1",
    });

    const response = await request(app).post("/api/auth/login").send({
      organizationSlug: "ihh",
      email: "volunteer@example.com",
      password: "Str0ng!Pass1",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBe("access-token");

    const cookies = getSetCookies(response.headers["set-cookie"]);
    expect(cookies.some((entry) => entry.startsWith("rf_token="))).toBe(true);
    expect(cookies.some((entry) => entry.startsWith("csrf_token="))).toBe(true);
  });

  it("refreshes a session from the signed refresh cookie", async () => {
    mockedAuthService.login.mockResolvedValue({
      accessToken: "first-access-token",
      refreshToken: "refresh-token",
      sessionId: "session-1",
    });
    mockedAuthService.refresh.mockResolvedValue({
      accessToken: "second-access-token",
      refreshToken: "rotated-refresh-token",
      sessionId: "session-2",
    });

    const loginResponse = await request(app).post("/api/auth/login").send({
      organizationSlug: "ihh",
      email: "volunteer@example.com",
      password: "Str0ng!Pass1",
    });

    const cookies = getSetCookies(loginResponse.headers["set-cookie"]);
    const refreshCookie = cookies.find((entry) => entry.startsWith("rf_token="));

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", refreshCookie ?? "");

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBe("second-access-token");
    expect(mockedAuthService.refresh).toHaveBeenCalledWith(
      "refresh-token",
      expect.objectContaining({ ipAddress: expect.any(String) }),
    );
  });

  it("requires a valid CSRF token for logout", async () => {
    mockedAuthService.login.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      sessionId: "session-1",
    });
    mockedAuthService.logout.mockResolvedValue(undefined);

    const loginResponse = await request(app).post("/api/auth/login").send({
      organizationSlug: "ihh",
      email: "volunteer@example.com",
      password: "Str0ng!Pass1",
    });

    const cookies = getSetCookies(loginResponse.headers["set-cookie"]);
    const refreshCookie = cookies.find((entry) => entry.startsWith("rf_token="));
    const csrfToken = decodeURIComponent(getCookieValue(cookies, "csrf_token"));

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken);

    expect(refreshCookie).toBeDefined();
    expect(response.status).toBe(200);
    expect(mockedAuthService.logout).toHaveBeenCalledWith(
      "refresh-token",
      expect.objectContaining({ ipAddress: expect.any(String) }),
    );
  });

  it("returns me for a valid access token", async () => {
    mockedAuthService.getMe.mockResolvedValue({
      id: "user-1",
      orgId: "org-1",
      email: "volunteer@example.com",
      role: "VOLUNTEER",
      isVerified: true,
      isActive: true,
      mfaEnabled: false,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const accessToken = signAccessToken({
      sub: "user-1",
      orgId: "org-1",
      email: "volunteer@example.com",
      role: "VOLUNTEER",
      sessionId: "session-1",
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe("volunteer@example.com");
  });
});

