import { useState } from "react";
import { FormRenderer } from "./components/FormRenderer";
import { createEmptyForm } from "./model/form.schema";
import { FormBuilderPage } from "./FormBuilderPage";
import { loadDraft, loadPublishedForm } from "./services/draftStorage";
import "./form-builder.css";

export default function FormBuilderFeature() {
  const [view, setView] = useState("builder");
  const [previewSchema, setPreviewSchema] = useState(
    () => loadDraft()?.schema ?? createEmptyForm(),
  );
  const [published, setPublished] = useState(() => loadPublishedForm());

  function backToDashboard() {
    window.location.hash = "dashboard";
  }

  if (view === "preview" || view === "published") {
    const schema = view === "preview" ? previewSchema : published?.schema;

    return (
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
    );
  }

  return (
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
  );
}
