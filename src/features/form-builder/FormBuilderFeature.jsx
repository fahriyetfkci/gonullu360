import { useState } from "react";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import { FormRenderer } from "./components/FormRenderer";
import { FormBuilderPage } from "./FormBuilderPage";
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
                <FormRenderer schema={schema} preview={view === "preview"} />
              ) : (
                <div className="missing-form">Yayınlanmış bir form bulunamadı.</div>
              )}
            </div>
          </div>
        </div>
      </FormManagementShell>
    );
  }

  return (
    <FormManagementShell>
      <div className="form-builder-feature">
        <FormBuilderPage
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
