const FIELD_CATALOG = [
  { type: "full_name", label: "Ad Soyad", shortLabel: "Aa" },
  { type: "email", label: "Email", shortLabel: "@" },
  { type: "phone", label: "Telefon", shortLabel: "\u260E" },
  { type: "multiple_choice", label: "\xC7oktan Se\xE7meli Soru", shortLabel: "\u25CF" },
  { type: "date", label: "Tarih Se\xE7ici", shortLabel: "\u25A3" },
  { type: "file", label: "Dosya Y\xFCkleme (\xF6r. CV y\xFCkleme)", shortLabel: "\u21A5" },
  { type: "long_text", label: "A\xE7\u0131k U\xE7lu Soru", shortLabel: "\xB6" }
];
function createId(prefix) {
  const randomId = window.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${randomId}`;
}
function createField(type) {
  const catalogItem = FIELD_CATALOG.find((item) => item.type === type);
  const base = {
    id: createId("field"),
    type,
    label: catalogItem?.label ?? "Yeni Alan",
    required: false
  };
  if (type === "multiple_choice") {
    return { ...base, options: ["Se\xE7enek 1", "Se\xE7enek 2"] };
  }
  if (type === "file") {
    return {
      ...base,
      fileSettings: {
        acceptedTypes: [".pdf", ".doc", ".docx"],
        maxSizeMb: 10
      }
    };
  }
  return base;
}
function createEmptyForm() {
  return {
    schemaVersion: 1,
    id: createId("form"),
    title: "Yeni Form Olu\u015Ftur",
    description: "",
    sections: [
      { id: createId("section"), title: "", fields: [] },
      { id: createId("section"), title: "", fields: [] }
    ]
  };
}
function isFormPublishable(schema) {
  if (schema.title.trim().length < 2) return false;
  const fields = schema.sections.flatMap((section) => section.fields);
  if (fields.length === 0) return false;
  return fields.every((field) => {
    if (!field.label.trim()) return false;
    if (field.type === "multiple_choice") {
      return field.options?.length > 0 && field.options.every((option) => option.trim().length > 0);
    }
    return field.type !== "file" || Boolean(field.fileSettings);
  });
}
export {
  FIELD_CATALOG,
  createEmptyForm,
  createField,
  createId,
  isFormPublishable
};
