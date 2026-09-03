import { createForm, getForm, getStoredUser, publishForm as publishFormApi, saveFormDraft } from '../../../services/api';

const LEGACY_KEYS = {
  draft: 'gonullu360.form-builder.draft',
  published: 'gonullu360.form-builder.published',
  remoteForm: 'gonullu360.form-builder.remote-id',
  remoteRevision: 'gonullu360.form-builder.remote-revision',
};

function scopedKey(name) {
  const user = getStoredUser();
  const organizationId = user?.organizationId ?? 'unknown-organization';
  const userId = user?.id ?? 'unknown-manager';
  return `gonullu360.form-builder.${organizationId}.${userId}.${name}`;
}

const keys = () => ({
  draft: scopedKey('draft'),
  published: scopedKey('published'),
  remoteForm: scopedKey('remote-id'),
  remoteRevision: scopedKey('remote-revision'),
});

function migrateLegacyDraftOnce() {
  const current = keys();
  Object.entries(LEGACY_KEYS).forEach(([name, legacyKey]) => {
    const scoped = current[name];
    if (localStorage.getItem(scoped) === null) {
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null) localStorage.setItem(scoped, legacyValue);
    }
    localStorage.removeItem(legacyKey);
  });
  return current;
}

function loadDraft() {
  try { const raw=localStorage.getItem(migrateLegacyDraftOnce().draft); return raw?JSON.parse(raw):null; } catch { return null; }
}

function storeRemote(formId, revision) {
  const current=keys();
  localStorage.setItem(current.remoteForm,String(formId));
  localStorage.setItem(current.remoteRevision,String(revision));
}

async function ensureRemoteForm(schema) {
  const current=migrateLegacyDraftOnce();
  const existingId=Number(localStorage.getItem(current.remoteForm));
  if(existingId){
    try {
      const remote=await getForm(existingId);
      storeRemote(remote.id,remote.revision);
      return {id:remote.id,revision:remote.revision,created:false};
    } catch(error) {
      if(error.response?.status!==404)throw error;
      localStorage.removeItem(current.remoteForm);
      localStorage.removeItem(current.remoteRevision);
    }
  }
  const created=await createForm(schema);
  storeRemote(created.id,created.revision);
  return {id:created.id,revision:created.revision,created:true};
}

async function saveRemoteSchema(schema) {
  const remote=await ensureRemoteForm(schema);
  if(remote.created)return remote;
  const saved=await saveFormDraft(remote.id,schema,remote.revision);
  storeRemote(saved.id,saved.revision);
  return {id:saved.id,revision:saved.revision,created:false};
}

async function saveDraft(schema, previousRevision) {
  const remote=await saveRemoteSchema(schema);
  const draft={schema,revision:previousRevision+1,remoteRevision:remote.revision,updatedAt:new Date().toISOString()};
  localStorage.setItem(keys().draft,JSON.stringify(draft));
  return {...draft,formId:remote.id};
}

function loadPublishedForm() {
  try { const raw=localStorage.getItem(migrateLegacyDraftOnce().published); return raw?JSON.parse(raw):null; } catch { return null; }
}

function selectFormForEditing(form) {
  const schema=structuredClone(form.schema);
  const draft={schema,revision:0,remoteRevision:form.revision,updatedAt:new Date().toISOString()};
  const current=keys();
  localStorage.setItem(current.draft,JSON.stringify(draft));
  storeRemote(form.id,form.revision);
  if(form.status==='published'){
    localStorage.setItem(current.published,JSON.stringify({schema:structuredClone(schema),formId:form.id,version:form.currentVersion,publishedAt:form.publishedAt}));
  }else{
    localStorage.removeItem(current.published);
  }
}

function clearSelectedForm(formId) {
  const current=keys();
  if(Number(localStorage.getItem(current.remoteForm))!==Number(formId))return;
  localStorage.removeItem(current.draft);
  localStorage.removeItem(current.published);
  localStorage.removeItem(current.remoteForm);
  localStorage.removeItem(current.remoteRevision);
}

async function publishForm(schema) {
  const previous=loadPublishedForm();
  const remote=await saveRemoteSchema(schema);
  const result=await publishFormApi(remote.id,remote.revision);
  const published={schema:structuredClone(schema),formId:remote.id,version:result.version??(previous?.version??0)+1,publishedAt:result.publishedAt??new Date().toISOString()};
  localStorage.setItem(keys().published,JSON.stringify(published));
  return published;
}

export { clearSelectedForm, loadDraft, loadPublishedForm, publishForm, saveDraft, selectFormForEditing };
