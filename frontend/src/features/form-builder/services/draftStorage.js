const DRAFT_KEY = "gonullu360.form-builder.draft";
const PUBLISHED_KEY = "gonullu360.form-builder.published";
function loadDraft(scope) {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}:${scope}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveDraft(schema, revision, scope) {
  const draft = {
    schema,
    revision,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  localStorage.setItem(`${DRAFT_KEY}:${scope}`, JSON.stringify(draft));
  return draft;
}
function loadPublishedForm() {
  try {
    const raw = localStorage.getItem(PUBLISHED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function publishForm(schema) {
  const previous = loadPublishedForm();
  const published = {
    schema: structuredClone(schema),
    version: (previous?.version ?? 0) + 1,
    publishedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(published));
  return published;
}
export {
  loadDraft,
  loadPublishedForm,
  publishForm,
  saveDraft
};
