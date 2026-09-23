import { formDefinitionSchema, isFormDefinitionPublishable, saveDraftRequestSchema } from "../form.schema";

const validForm = {
  schemaVersion: 1 as const,
  id: "form-1",
  title: "Gönüllü Başvuru Formu",
  description: "Başvuru bilgileri",
  sections: [{
    id: "section-1",
    title: "Kişisel Bilgiler",
    fields: [{ id: "field-1", type: "email" as const, label: "E-posta", required: true }],
  }],
};

describe("form schemas", () => {
  it("accepts the frontend form shape", () => {
    expect(formDefinitionSchema.parse(validForm)).toEqual(validForm);
  });

  it("rejects duplicate ids", () => {
    const duplicate = { ...validForm, sections: [{ ...validForm.sections[0], id: "field-1" }] };
    expect(formDefinitionSchema.safeParse(duplicate).success).toBe(false);
  });

  it("requires the initial revision when a draft is first saved", () => {
    const result = saveDraftRequestSchema.parse({
      body: { organizationSlug: "ihh", expectedRevision: 0, schema: validForm },
    });
    expect(result.body.expectedRevision).toBe(0);
  });

  it("allows incomplete drafts but does not mark them publishable", () => {
    const draft = { ...validForm, title: "", sections: [{ ...validForm.sections[0], fields: [] }] };
    expect(formDefinitionSchema.safeParse(draft).success).toBe(true);
    expect(isFormDefinitionPublishable(draft)).toBe(false);
  });
});
