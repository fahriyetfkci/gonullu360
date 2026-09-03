import { useEffect, useState } from "react";
function FieldEditor({ field, onClose, onChange }) {
  const [draft, setDraft] = useState(field);
  useEffect(() => setDraft(field), [field]);
  function update(changes) {
    setDraft((current) => ({ ...current, ...changes }));
  }
  function save() {
    onChange(draft);
    onClose();
  }
  function updateOption(index, value) {
    const options = [...draft.options ?? []];
    options[index] = value;
    update({ options });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="field-editor" role="dialog" aria-modal="true" aria-labelledby="field-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="field-editor__header">
          <div>
            <span>ALAN AYARLARI</span>
            <h2 id="field-editor-title">{field.label}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Kapat">×</button>
        </div>

        <label className="editor-control">
          <span>Soru başlığı</span>
          <input value={draft.label} onChange={(event) => update({ label: event.target.value })} />
        </label>

        <label className="editor-control">
          <span>Açıklama</span>
          <textarea rows={3} value={draft.description ?? ""} onChange={(event) => update({ description: event.target.value })} />
        </label>

        {draft.type !== "multiple_choice" && draft.type !== "date" && draft.type !== "file" && <label className="editor-control">
            <span>Placeholder</span>
            <input value={draft.placeholder ?? ""} onChange={(event) => update({ placeholder: event.target.value })} />
          </label>}

        {draft.type === "multiple_choice" && <div className="editor-control">
            <span>Seçenekler</span>
            <div className="option-editor-list">
              {(draft.options ?? []).map((option, index) => <div className="option-editor" key={index}>
                  <input value={option} onChange={(event) => updateOption(index, event.target.value)} />
                  <button
    type="button"
    aria-label="Seçeneği sil"
    onClick={() => update({ options: draft.options?.filter((_, optionIndex) => optionIndex !== index) })}
  >
                    ×
                  </button>
                </div>)}
            </div>
            <button
    type="button"
    className="text-button"
    onClick={() => update({ options: [...draft.options ?? [], `Se\xE7enek ${(draft.options?.length ?? 0) + 1}`] })}
  >
              + Seçenek ekle
            </button>
          </div>}

        {draft.type === "file" && <div className="editor-control editor-grid">
            <label>
              <span>Dosya uzantıları</span>
              <input
    value={draft.fileSettings?.acceptedTypes.join(", ") ?? ""}
    onChange={(event) => update({
      fileSettings: {
        acceptedTypes: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
        maxSizeMb: draft.fileSettings?.maxSizeMb ?? 10
      }
    })}
  />
            </label>
            <label>
              <span>Maksimum boyut (MB)</span>
              <input
    type="number"
    min="1"
    max="100"
    value={draft.fileSettings?.maxSizeMb ?? 10}
    onChange={(event) => update({
      fileSettings: {
        acceptedTypes: draft.fileSettings?.acceptedTypes ?? [],
        maxSizeMb: Number(event.target.value)
      }
    })}
  />
            </label>
          </div>}

        <label className="required-toggle">
          <input type="checkbox" checked={draft.required} onChange={(event) => update({ required: event.target.checked })} />
          <span><strong>Zorunlu alan</strong><small>Kullanıcı bu alanı doldurmadan formu gönderemez.</small></span>
        </label>

        <div className="field-editor__actions">
          <button type="button" className="secondary-button" onClick={onClose}>Vazgeç</button>
          <button type="button" className="primary-button" onClick={save} disabled={!draft.label.trim()}>Değişiklikleri Uygula</button>
        </div>
      </div>
    </div>;
}
export {
  FieldEditor
};
