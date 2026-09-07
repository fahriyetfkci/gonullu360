import request from "supertest";
import { createApp } from "../../../app";
import * as eventService from "../event.service";
import * as posterService from "../poster.service";

jest.mock("../../../middleware/authenticate", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void): void => {
    req.user = { id: "admin-1", orgId: "org-1", email: "admin@example.com", role: "ADMIN" };
    next();
  },
}));
jest.mock("../../../middleware/authorize", () => ({
  authorize: (): ((_req: unknown, _res: unknown, next: () => void) => void) =>
    (_req: unknown, _res: unknown, next: () => void): void => next(),
}));
jest.mock("../event.service");
jest.mock("../poster.service");

const mockedEventService = jest.mocked(eventService);
const mockedPosterService = jest.mocked(posterService);
const app = createApp();

const body = {
  name: "Gönüllü Buluşması",
  slug: "gonullu-bulusmasi",
  type: "IN_PERSON" as const,
  startsAt: "2026-09-12T07:00:00.000Z",
  endsAt: "2026-09-12T09:00:00.000Z",
  timezone: "Europe/Istanbul",
  address: "İstanbul",
  capacity: 100,
  registrationFormId: null,
  groupIds: ["group-1"],
};

describe("event routes", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns event management options", async () => {
    mockedEventService.getOptions.mockResolvedValue({ groups: [], forms: [] });
    const response = await request(app).get("/api/events/options");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ groups: [], forms: [] });
    expect(mockedEventService.getOptions).toHaveBeenCalledWith("org-1");
  });

  it("creates an event for the authenticated organization", async () => {
    mockedEventService.createEvent.mockResolvedValue({ id: "event-1", name: body.name } as never);
    const response = await request(app).post("/api/events").send(body);
    expect(response.status).toBe(201);
    expect(mockedEventService.createEvent).toHaveBeenCalledWith(
      "org-1",
      "admin-1",
      expect.objectContaining({ slug: body.slug, groupIds: ["group-1"] }),
    );
  });

  it("validates event dates before calling the service", async () => {
    const response = await request(app).post("/api/events").send({ ...body, endsAt: body.startsAt });
    expect(response.status).toBe(422);
    expect(mockedEventService.createEvent).not.toHaveBeenCalled();
  });

  it("uploads a valid poster body", async () => {
    mockedPosterService.savePoster.mockResolvedValue({
      posterUrl: "/uploads/events/poster.png",
      posterStorageKey: "events/poster.png",
    });
    const response = await request(app)
      .post("/api/events/poster")
      .set("Content-Type", "image/png")
      .send(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(response.status).toBe(201);
    expect(mockedPosterService.savePoster).toHaveBeenCalled();
  });
});
