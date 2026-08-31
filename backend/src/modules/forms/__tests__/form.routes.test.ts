import request from "supertest";
import { createApp } from "../../../app";
import * as formService from "../form.service";

jest.mock("../form.service");

const mockedFormService = jest.mocked(formService);
const app = createApp();

const schema = {
  schemaVersion: 1 as const,
  id: "form-1",
  title: "Gönüllü Başvuru Formu",
  description: "",
  sections: [{
    id: "section-1",
    title: "",
    fields: [{ id: "field-1", type: "email" as const, label: "E-posta", required: true }],
  }],
};

describe("form routes", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns the active draft", async () => {
    mockedFormService.getDraft.mockResolvedValue({
      formId: "database-form-1",
      schema,
      revision: 3,
      updatedAt: new Date("2026-08-31T00:00:00.000Z"),
    });

    const response = await request(app).get("/api/forms/draft?organizationSlug=ihh");

    expect(response.status).toBe(200);
    expect(response.body.data.revision).toBe(3);
    expect(mockedFormService.getDraft).toHaveBeenCalledWith({ organizationSlug: "ihh" });
  });

  it("validates a draft before saving", async () => {
    const response = await request(app).put("/api/forms/draft").send({
      organizationSlug: "ihh",
      expectedRevision: 0,
      schema: { ...schema, sections: [] },
    });

    expect(response.status).toBe(422);
    expect(mockedFormService.saveDraft).not.toHaveBeenCalled();
  });

  it("publishes a saved revision", async () => {
    mockedFormService.publish.mockResolvedValue({
      formId: "database-form-1",
      schema,
      version: 2,
      publishedAt: new Date("2026-08-31T00:00:00.000Z"),
    });

    const response = await request(app).post("/api/forms/publish").send({
      organizationSlug: "ihh",
      clientFormId: "form-1",
      expectedRevision: 3,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.version).toBe(2);
  });
});
