import { useState } from "react";
import { deleteForm, downloadSubmissionFile, getForms, getFormSubmissions } from "../../services/api";
import { FormRenderer } from "./components/FormRenderer";
import { createEmptyForm } from "./model/form.schema";
import { FormBuilderPage } from "./FormBuilderPage";
import { clearSelectedForm, loadDraft, loadPublishedForm, selectFormForEditing } from "./services/draftStorage";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import "./form-builder.css";

export default function FormBuilderFeature() {
  const [view, setView] = useState("builder");
  const [previewSchema, setPreviewSchema] = useState(
    () => loadDraft()?.schema ?? createEmptyForm(),
  );
  const [published, setPublished] = useState(() => loadPublishedForm());
  const [returnView, setReturnView] = useState("builder");
  const [builderKey, setBuilderKey] = useState(0);
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState(null);
  const [responses, setResponses] = useState([]);
  const [responsesPagination, setResponsesPagination] = useState(null);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);

  async function openManagement() {
    setView("manage");
    setFormsLoading(true);
    setFormsError(null);
    try {
      const result = await getForms();
      setForms(result.forms ?? []);
    } catch (error) {
      setFormsError(error.response?.data?.error || "Formlar yüklenirken bir hata oluştu.");
    } finally {
      setFormsLoading(false);
    }
  }

  function editManagedForm(form) {
    selectFormForEditing(form);
    setPublished(loadPublishedForm());
    setBuilderKey((value) => value + 1);
    setView("builder");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeManagedForm(form) {
    const accepted = window.confirm(`“${form.title}” formunu silmek istediğinize emin misiniz? Formun sürümleri ve cevapları da silinecek.`);
    if (!accepted) return;
    try {
      await deleteForm(form.id);
      clearSelectedForm(form.id);
      setForms((items) => items.filter((item) => item.id !== form.id));
      if (published?.formId === form.id) setPublished(null);
    } catch (error) {
      setFormsError(error.response?.data?.error || "Form silinirken bir hata oluştu.");
    }
  }

  async function openResponses(form, page = 1) {
    setSelectedForm(form);
    setView("responses");
    setResponsesLoading(true);
    setFormsError(null);
    try {
      const result = await getFormSubmissions(form.id, page, 20);
      setResponses(result.submissions ?? []);
      setResponsesPagination(result.pagination ?? null);
    } catch (error) {
      setFormsError(error.response?.data?.error || "Form cevapları yüklenirken bir hata oluştu.");
    } finally {
      setResponsesLoading(false);
    }
  }

  function fieldLabel(fieldId) {
    return selectedForm?.schema?.sections
      ?.flatMap((section) => section.fields)
      .find((field) => field.id === fieldId)?.label ?? fieldId;
  }

  async function downloadResponseFile(response, file) {
    try {
      await downloadSubmissionFile(selectedForm.id, response.id, file);
    } catch (error) {
      window.alert(error.response?.data?.error || "Dosya indirilemedi.");
    }
  }

  function backToDashboard() {
    window.location.hash = "dashboard";
  }

  let content;

  if (view === "preview" || view === "published") {
    const schema = view === "preview" ? previewSchema : published?.schema;

    content = (
      <div className="form-builder-feature">
        <div className="preview-page">
          <div className="preview-toolbar">
            <button type="button" onClick={() => setView(returnView)}>
              ← {returnView === "manage" ? "Form listesine dön" : "Düzenleyiciye dön"}
            </button>
            <div>
              <strong>
                {view === "preview"
                  ? "Taslak Önizlemesi"
                  : `Yayındaki Form · Sürüm ${published?.version ?? "-"}`}
              </strong>
              <span>
                {view === "preview"
                  ? "Bu görünüm henüz yayınlanmadı."
                  : "Kullanıcıların göreceği sabit form."}
              </span>
            </div>
          </div>
          <div className="preview-canvas">
            {schema ? (
              <FormRenderer schema={schema} preview={view === "preview"} formId={published?.formId} />
            ) : (
              <div className="missing-form">Yayınlanmış bir form bulunamadı.</div>
            )}
          </div>
        </div>
      </div>
    );
  } else if (view === "responses") {
    content = (
      <div className="form-builder-feature forms-management-view">
        <header className="forms-management-header">
          <div><span>FORM CEVAPLARI</span><h1>{selectedForm?.title}</h1><p>Gönderilen cevapları ve eklenen dosyaları görüntüleyin.</p></div>
          <button type="button" onClick={() => setView("manage")}>← Form listesine dön</button>
        </header>
        {formsError && <p className="forms-management-error">{formsError}</p>}
        {responsesLoading ? <div className="forms-management-empty">Cevaplar yükleniyor...</div> : responses.length === 0 ? <div className="forms-management-empty">Bu forma henüz cevap gönderilmemiş.</div> : (
          <div className="form-responses-list">
            {responses.map((response) => <article className="form-response-card" key={response.id}>
              <div className="form-response-card__heading"><strong>Cevap #{response.id}</strong><time>{new Date(response.submittedAt).toLocaleString("tr-TR")}</time></div>
              <dl>{Object.entries(response.answers ?? {}).map(([fieldId, value]) => <div key={fieldId}><dt>{fieldLabel(fieldId)}</dt><dd>{String(value || "—")}</dd></div>)}</dl>
              {response.files?.length > 0 && <div className="form-response-files">
                {response.files.map((file) => <button type="button" key={file.id} onClick={() => downloadResponseFile(response, file)}>
                  İndir · {fieldLabel(file.fieldId)} · {file.originalName} ({Math.max(1, Math.round(file.size / 1024))} KB)
                </button>)}
              </div>}
            </article>)}
            {responsesPagination?.totalPages > 1 && <div className="form-responses-pagination">
              <button type="button" disabled={responsesPagination.page <= 1} onClick={() => openResponses(selectedForm, responsesPagination.page - 1)}>Önceki</button>
              <span>{responsesPagination.page} / {responsesPagination.totalPages}</span>
              <button type="button" disabled={responsesPagination.page >= responsesPagination.totalPages} onClick={() => openResponses(selectedForm, responsesPagination.page + 1)}>Sonraki</button>
            </div>}
          </div>
        )}
      </div>
    );
  } else if (view === "manage") {
    content = (
      <div className="form-builder-feature forms-management-view">
        <header className="forms-management-header">
          <div><span>FORM YÖNETİMİ</span><h1>Formlar</h1><p>Taslak ve yayındaki formlarınızı buradan yönetin.</p></div>
          <button type="button" onClick={() => setView("builder")}>← Düzenleyiciye dön</button>
        </header>
        {formsError && <p className="forms-management-error">{formsError}</p>}
        {formsLoading ? <div className="forms-management-empty">Formlar yükleniyor...</div> : forms.length === 0 ? <div className="forms-management-empty">Henüz kaydedilmiş bir form yok.</div> : (
          <div className="forms-management-list">
            {forms.map((form) => <article className="managed-form-card" key={form.id}>
              <div className="managed-form-card__info">
                <div><h2>{form.title}</h2><span className={`form-status form-status--${form.status}`}>{form.status === "published" ? "Yayında" : "Taslak"}</span></div>
                <p>{form.description || "Açıklama eklenmemiş."}</p>
                <small>Son güncelleme: {new Date(form.updatedAt).toLocaleString("tr-TR")} · {form.submissionCount ?? 0} cevap</small>
              </div>
              <div className="managed-form-card__actions">
                <button type="button" onClick={() => openResponses(form)}>Cevaplar</button>
                <button type="button" onClick={() => { setPreviewSchema(structuredClone(form.schema)); setReturnView("manage"); setView("preview"); }}>Önizle</button>
                <button type="button" onClick={() => editManagedForm(form)}>Düzenle</button>
                <button className="danger" type="button" onClick={() => removeManagedForm(form)}>Sil</button>
              </div>
            </article>)}
          </div>
        )}
      </div>
    );
  } else {
    content = (
      <div className="form-builder-feature">
        <FormBuilderPage
          key={builderKey}
          onBack={backToDashboard}
          onManageForms={openManagement}
          onPreview={(schema) => {
            setPreviewSchema(structuredClone(schema));
            setReturnView("builder");
            setView("preview");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onOpenPublished={(nextPublished) => {
            setPublished(nextPublished);
            setReturnView("builder");
            setView("published");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    );
  }

  return (
    <div className="form-management-shell">
      <Sidebar />
      <div className="form-management-page">
        <Navbar />
        <div className="form-management-heading">
          <strong>Anasayfa</strong>
          <span>| Hoş Geldin!</span>
        </div>
        {content}
      </div>
    </div>
  );
}
