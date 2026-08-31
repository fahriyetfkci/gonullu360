import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { FieldEditor } from "./components/FieldEditor";
import { FIELD_CATALOG, createEmptyForm, isFormPublishable } from "./model/form.schema";
import { formReducer } from "./model/form.reducer";
import { loadDraft, saveDraft as cacheDraft } from "./services/draftStorage";
import {
  getFormApiErrorMessage,
  getFormDraft,
  getPublishedForm,
  publishFormDraft,
  saveFormDraft
} from "./services/formApi";
const SAVE_LABELS = {
  syncing: "Sunucuyla eşitleniyor...",
  idle: "Haz\u0131r",
  dirty: "Kaydedilmemi\u015F de\u011Fi\u015Fiklikler",
  saving: "Kaydediliyor...",
  saved: "Taslak kaydedildi",
  published: "Form yay\u0131nland\u0131",
  error: "Kay\u0131t ba\u015Far\u0131s\u0131z"
};

function cacheDraftSafely(schema, revision) {
  try {
    cacheDraft(schema, revision);
  } catch {
    // The server remains the source of truth when browser storage is unavailable.
  }
}

function PaletteItem({ type, label, shortLabel, onAdd }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: "palette", fieldType: type, label }
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : void 0;
  return <button
    ref={setNodeRef}
    style={style}
    className={`palette-item ${isDragging ? "is-dragging" : ""}`}
    type="button"
    onClick={onAdd}
    {...listeners}
    {...attributes}
  >
      <span className="palette-icon">{shortLabel}</span>
      {label}
    </button>;
}
function SortableField({
  field,
  sectionId,
  onEdit,
  onRemove
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `field:${field.id}`,
    data: { kind: "field", fieldId: field.id, sectionId, label: field.label }
  });
  return <div
    ref={setNodeRef}
    className={`builder-field ${isDragging ? "is-dragging" : ""}`}
    style={{ transform: CSS.Transform.toString(transform), transition }}
  >
      <button className="drag-handle" type="button" aria-label="Alanı sürükle" {...attributes} {...listeners}>⠿</button>
      <div className="builder-field__content" onClick={onEdit} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onEdit()}>
        <strong>{field.label}</strong>
        <span>{FIELD_CATALOG.find((item) => item.type === field.type)?.label}{field.required ? " \xB7 Zorunlu" : ""}</span>
      </div>
      <button className="field-action" type="button" onClick={onEdit} aria-label="Alanı düzenle">✎</button>
      <button className="field-action danger" type="button" onClick={onRemove} aria-label="Alanı sil">×</button>
    </div>;
}
function BuilderSection({
  section,
  sectionIndex,
  sectionCount,
  onEditField,
  onRemoveField,
  onTitleChange,
  onRemoveSection
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section:${section.id}`,
    data: { kind: "section", sectionId: section.id }
  });
  return <section ref={setNodeRef} className={`builder-section ${isOver ? "is-over" : ""}`}>
      <div className="builder-section__topbar">
        <input
    aria-label={`${sectionIndex + 1}. b\xF6l\xFCm ba\u015Fl\u0131\u011F\u0131`}
    value={section.title ?? ""}
    placeholder={`B\xF6l\xFCm ${sectionIndex + 1} ba\u015Fl\u0131\u011F\u0131 (iste\u011Fe ba\u011Fl\u0131)`}
    onChange={(event) => onTitleChange(event.target.value)}
  />
        {sectionCount > 1 && <button type="button" onClick={onRemoveSection} aria-label="Bölümü sil">×</button>}
      </div>
      <SortableContext items={section.fields.map((field) => `field:${field.id}`)} strategy={verticalListSortingStrategy}>
        <div className="builder-section__fields">
          {section.fields.length === 0 ? <div className="drop-placeholder">
              <span>+</span>
              <strong>Sürükle Bırak</strong>
              <small>Bir alanı buraya sürükleyin</small>
            </div> : section.fields.map((field) => <SortableField
    key={field.id}
    field={field}
    sectionId={section.id}
    onEdit={() => onEditField(field)}
    onRemove={() => onRemoveField(field.id)}
  />)}
        </div>
      </SortableContext>
    </section>;
}
function FormBuilderPage({ onPreview, onOpenPublished, onBack }) {
  const initialDraft = useMemo(() => loadDraft(), []);
  const initialSchema = useMemo(() => initialDraft?.schema ?? createEmptyForm(), [initialDraft]);
  const [schema, dispatch] = useReducer(formReducer, initialSchema);
  const revision = useRef(0);
  const lastSavedSchema = useRef(JSON.stringify(initialSchema));
  const saveQueue = useRef(Promise.resolve());
  const autoSaveTimer = useRef(null);
  const [saveState, setSaveState] = useState("syncing");
  const [published, setPublished] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [activeLabel, setActiveLabel] = useState(null);
  const [message, setMessage] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedField = schema.sections.flatMap((section) => section.fields).find((field) => field.id === selectedFieldId);

  useEffect(() => {
    let active = true;
    async function hydrateFromServer() {
      try {
        const [remoteDraft, remotePublished] = await Promise.all([
          getFormDraft(),
          getPublishedForm()
        ]);
        if (!active) return;
        if (remoteDraft?.schema) {
          dispatch({ type: "REPLACE_SCHEMA", schema: remoteDraft.schema });
          revision.current = remoteDraft.revision;
          lastSavedSchema.current = JSON.stringify(remoteDraft.schema);
        }
        setPublished(remotePublished);
        setSaveState(remoteDraft ? "saved" : "idle");
      } catch (error) {
        if (!active) return;
        setSaveState("error");
        setMessage(getFormApiErrorMessage(error));
      } finally {
        if (active) setIsHydrated(true);
      }
    }
    void hydrateFromServer();
    return () => {
      active = false;
    };
  }, []);

  const enqueueSave = useCallback((nextSchema) => {
    const task = saveQueue.current.catch(() => undefined).then(async () => {
      const serializedSchema = JSON.stringify(nextSchema);
      if (revision.current > 0 && serializedSchema === lastSavedSchema.current) {
        return { revision: revision.current };
      }

      setSaveState("saving");
      try {
        const saved = await saveFormDraft(nextSchema, revision.current);
        revision.current = saved.revision;
        lastSavedSchema.current = serializedSchema;
        cacheDraftSafely(nextSchema, Math.max(saved.revision - 1, 0));
        setMessage(null);
        setSaveState("saved");
        return saved;
      } catch (error) {
        cacheDraftSafely(nextSchema, revision.current);
        setSaveState("error");
        setMessage(getFormApiErrorMessage(error));
        throw error;
      }
    });
    saveQueue.current = task;
    return task;
  }, []);

  useEffect(() => {
    if (!isHydrated) return undefined;
    if (JSON.stringify(schema) === lastSavedSchema.current) return;
    setSaveState("dirty");
    autoSaveTimer.current = window.setTimeout(() => {
      autoSaveTimer.current = null;
      void enqueueSave(schema).catch(() => undefined);
    }, 900);
    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    };
  }, [enqueueSave, isHydrated, schema]);

  function saveNow() {
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = null;
    return enqueueSave(schema);
  }

  async function handlePublish() {
    setMessage(null);
    if (!isFormPublishable(schema)) {
      setMessage("Yay\u0131nlamak i\xE7in form ad\u0131 ve en az bir form alan\u0131 ekleyin.");
      return;
    }
    try {
      const saved = await saveNow();
      const result = await publishFormDraft(schema.id, saved.revision);
      setPublished(result);
      setSaveState("published");
      setMessage(`S\xFCr\xFCm ${result.version} ba\u015Far\u0131yla yay\u0131nland\u0131.`);
    } catch (error) {
      setSaveState("error");
      setMessage(getFormApiErrorMessage(error));
    }
  }
  function destinationFromEvent(event) {
    const overData = event.over?.data.current;
    if (!event.over || !overData) return null;
    if (overData.kind === "section") {
      const section = schema.sections.find((item) => item.id === overData.sectionId);
      return section ? { sectionId: section.id, index: section.fields.length } : null;
    }
    if (overData.kind === "field") {
      const section = schema.sections.find((item) => item.id === overData.sectionId);
      const index = section?.fields.findIndex((field) => field.id === overData.fieldId) ?? -1;
      return section && index >= 0 ? { sectionId: section.id, index } : null;
    }
    return null;
  }
  function handleDragStart(event) {
    setActiveLabel(String(event.active.data.current?.label ?? "Form alan\u0131"));
  }
  function handleDragEnd(event) {
    setActiveLabel(null);
    const destination = destinationFromEvent(event);
    if (!destination) return;
    const activeData = event.active.data.current;
    if (activeData?.kind === "palette") {
      dispatch({ type: "ADD_FIELD", sectionId: destination.sectionId, fieldType: activeData.fieldType, index: destination.index });
    } else if (activeData?.kind === "field") {
      dispatch({ type: "MOVE_FIELD", fieldId: String(activeData.fieldId), sectionId: destination.sectionId, index: destination.index });
    }
  }
  function addToFirstSection(fieldType) {
    const firstSection = schema.sections[0];
    if (firstSection) dispatch({ type: "ADD_FIELD", sectionId: firstSection.id, fieldType });
  }
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragCancel={() => setActiveLabel(null)} onDragEnd={handleDragEnd}>
      <div className="builder-layout">
        <main className="builder-main">
          <div className="builder-content">
            <header className="builder-heading">
              <span>FORM YÖNETİMİ</span>
              <h1>Form Oluştur</h1>
              <p>Alanları sürükleyip bölümlere bırakarak formunuzu hazırlayın.</p>
            </header>

            <div className="form-name-card">
              <div>
                <label htmlFor="form-title">FORM ADI</label>
                <input id="form-title" value={schema.title} onChange={(event) => dispatch({ type: "SET_TITLE", title: event.target.value })} />
              </div>
              <span>＋</span>
            </div>

            <label className="form-description-control">
              <span>FORM AÇIKLAMASI</span>
              <input
    value={schema.description ?? ""}
    placeholder="Form hakkında kısa bir açıklama ekleyin (isteğe bağlı)"
    onChange={(event) => dispatch({ type: "SET_DESCRIPTION", description: event.target.value })}
  />
            </label>

            <div className="field-palette" aria-label="Form alanları">
              {FIELD_CATALOG.map((item) => <PaletteItem key={item.type} {...item} onAdd={() => addToFirstSection(item.type)} />)}
            </div>

            <div className="section-list">
              {schema.sections.map((section, index) => <BuilderSection
    key={section.id}
    section={section}
    sectionIndex={index}
    sectionCount={schema.sections.length}
    onEditField={(field) => setSelectedFieldId(field.id)}
    onRemoveField={(fieldId) => dispatch({ type: "REMOVE_FIELD", fieldId })}
    onTitleChange={(title) => dispatch({ type: "UPDATE_SECTION", sectionId: section.id, title })}
    onRemoveSection={() => dispatch({ type: "REMOVE_SECTION", sectionId: section.id })}
  />)}
            </div>

            <button className="add-section-button" type="button" onClick={() => dispatch({ type: "ADD_SECTION" })} aria-label="Yeni bölüm ekle">
              <span>＋</span>
              Yeni bölüm ekle
            </button>
          </div>
        </main>

        <aside className="action-panel">
          <div className={`save-indicator save-indicator--${saveState}`}>
            <i />
            <div><small>TASLAK DURUMU</small><strong>{SAVE_LABELS[saveState]}</strong></div>
          </div>

          {published && <div className="published-info">
              <small>YAYINDAKİ SÜRÜM</small>
              <strong>Sürüm {published.version}</strong>
              <span>{new Date(published.publishedAt).toLocaleString("tr-TR")}</span>
            </div>}

          {message && <p className={`panel-message ${saveState === "error" ? "is-error" : ""}`}>{message}</p>}

          <nav className="panel-actions">
            <button type="button" onClick={handlePublish} disabled={!isHydrated || saveState === "saving"}>
              <span>✓</span><div><strong>Kaydet ve Yayınla</strong><small>Yeni bir sabit sürüm oluştur</small></div><b>›</b>
            </button>
            <button type="button" disabled={!isHydrated || saveState === "saving"} onClick={async () => {
    try {
      await saveNow();
      onPreview(schema);
    } catch {
      // saveNow already exposes the server error in the action panel.
    }
  }}>
              <span>◉</span><div><strong>Form Önizleme</strong><small>Sabit kullanıcı görünümünü aç</small></div><b>›</b>
            </button>
            {published && <button type="button" onClick={() => onOpenPublished(published)}>
                <span>↗</span><div><strong>Yayındaki Form</strong><small>Sürüm {published.version} görünümünü aç</small></div><b>›</b>
              </button>}
            <button type="button" onClick={onBack}>
              <span>←</span><div><strong>Geri Dön</strong><small>Önceki sayfaya dön</small></div><b>›</b>
            </button>
          </nav>

          <div className="panel-tip">
            <span>i</span>
            <p>Taslağınız değişikliklerden sonra otomatik olarak bu tarayıcıya kaydedilir.</p>
          </div>
        </aside>
      </div>

      <DragOverlay>{activeLabel ? <div className="drag-overlay">{activeLabel}</div> : null}</DragOverlay>

      {selectedField && <FieldEditor
    field={selectedField}
    onClose={() => setSelectedFieldId(null)}
    onChange={(changes) => dispatch({ type: "UPDATE_FIELD", fieldId: selectedField.id, changes })}
  />}
    </DndContext>;
}
export {
  FormBuilderPage
};
