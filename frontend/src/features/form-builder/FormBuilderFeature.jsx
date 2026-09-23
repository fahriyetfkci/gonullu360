import { useEffect, useState } from "react";
import { apiClient } from '../../services/client';
import { createId } from './model/form.schema';
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import { FormRenderer } from "./components/FormRenderer";
import { FormBuilderPage } from "./FormBuilderPage";
import Submissions from './Submissions';
import "./form-builder.css";

function FormManagementShell({ children }) {
  return (
    <div className="form-management-shell">
      <Sidebar />

      <div className="form-management-shell__content">
        <Navbar />

        <main className="form-management-shell__main">
          <header className="form-management-shell__welcome">
            <h2>
              Anasayfa
              <span>| Hoş Geldin!</span>
            </h2>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}

export default function FormBuilderFeature() {
  const [view, setView] = useState("builder");
  const [previewSchema, setPreviewSchema] = useState(null);
  const [published, setPublished] = useState(null);
  const [forms, setForms] = useState([]);
  const [clientFormId, setClientFormId] = useState(undefined);
  const [listError, setListError] = useState('');
  useEffect(() => {
    let active = true;
    apiClient.get('/forms').then(response => { if (active) setForms(response.data.data); }).catch(() => { if (active) setListError('Form listesi yüklenemedi.'); });
    return () => { active = false; };
  }, [view, clientFormId]);

  function backToDashboard() {
    window.location.hash = "dashboard";
  }

  if (view === "preview" || view === "published") {
    const schema = view === "preview" ? previewSchema : published?.schema;

    return (
      <FormManagementShell>
        <div className="form-builder-feature">
          <div className="preview-page">
            <div className="preview-toolbar">
              <button type="button" onClick={() => setView("builder")}>
                ← Düzenleyiciye dön
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
                <FormRenderer schema={schema} preview={view === "preview"} formId={published?.formId} version={published?.version} />
              ) : (
                <div className="missing-form">Yayınlanmış bir form bulunamadı.</div>
              )}
            </div>
            {view === 'published' && published && <>
              <p>Paylaşım bağlantısı: <a href={`#form/${encodeURIComponent(published.schema.id)}`} target="_blank" rel="noreferrer">Formu aç</a></p>
              <Submissions formId={published.formId} schema={published.schema} />
            </>}
          </div>
        </div>
      </FormManagementShell>
    );
  }

  return (
    <FormManagementShell>
      <div className="form-builder-feature">
        <div className="preview-toolbar">
          <label>Kayıtlı formlar <select value={clientFormId || ''} onChange={event => setClientFormId(event.target.value || undefined)}><option value="">Son düzenlenen form</option>{forms.map(form => <option key={form.id} value={form.clientFormId}>{form.title}</option>)}</select></label>
          <button onClick={() => setClientFormId(createId('form'))}>Yeni Form</button>
          {listError && <p role="alert">{listError}</p>}
        </div>
        <FormBuilderPage
          key={clientFormId || 'latest'}
          clientFormId={clientFormId}
          onBack={backToDashboard}
          onPreview={(schema) => {
            setPreviewSchema(structuredClone(schema));
            setView("preview");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onOpenPublished={(nextPublished) => {
            setPublished(nextPublished);
            setView("published");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </FormManagementShell>
  );
}
