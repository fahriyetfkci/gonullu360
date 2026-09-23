import { createEventSchema } from "../event.schema";

const validBody = {
  name: "Gönüllü Buluşması",
  slug: "gonullu-bulusmasi",
  type: "IN_PERSON",
  startsAt: "2026-09-12T07:00:00.000Z",
  endsAt: "2026-09-12T09:00:00.000Z",
  timezone: "Europe/Istanbul",
  address: "İstanbul",
  capacity: 100,
  groupIds: ["group-1"],
};

describe("event schema", () => {
  it("accepts a valid physical event", () => {
    expect(createEventSchema.safeParse({ body: validBody }).success).toBe(true);
  });

  it("rejects an end time before the start time", () => {
    const result = createEventSchema.safeParse({
      body: { ...validBody, endsAt: "2026-09-12T06:00:00.000Z" },
    });
    expect(result.success).toBe(false);
  });

  it("requires an address for physical events", () => {
    const result = createEventSchema.safeParse({ body: { ...validBody, address: "" } });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate target groups", () => {
    const result = createEventSchema.safeParse({
      body: { ...validBody, groupIds: ["group-1", "group-1"] },
    });
    expect(result.success).toBe(false);
  });
});
