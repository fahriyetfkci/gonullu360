import { createApiClient } from '../../../services/client';
const ORGANIZATION_SLUG = process.env.REACT_APP_ORGANIZATION_SLUG || "ihh";
const formClient = createApiClient('/forms');

function unwrap(response) {
  return response.data?.data ?? null;
}

export async function getFormDraft(clientFormId) {
  const response = await formClient.get("/draft", {
    params: clientFormId ? { clientFormId } : {},
  });
  return unwrap(response);
}

export async function saveFormDraft(schema, expectedRevision) {
  const response = await formClient.put("/draft", {
    expectedRevision,
    schema,
  });
  return unwrap(response);
}

export async function publishFormDraft(clientFormId, expectedRevision) {
  const response = await formClient.post("/publish", {
    clientFormId,
    expectedRevision,
  });
  return unwrap(response);
}

export async function getPublishedForm(clientFormId) {
  const response = await formClient.get("/published", {
    params: { organizationSlug: ORGANIZATION_SLUG, ...(clientFormId ? { clientFormId } : {}) },
  });
  return unwrap(response);
}

export function getFormApiErrorMessage(error) {
  if (error?.response?.status === 409) {
    return "Taslak başka bir oturumda güncellendi. Sayfayı yenileyip tekrar deneyin.";
  }
  return error?.response?.data?.error?.message || "Form sunucusuna ulaşılamadı. Değişiklik yerel olarak korundu.";
}
