import { useState } from 'react';
import axios from 'axios';

function RequiredMark({ field }) {
  return field.required ? <span className="required-mark">*</span> : null;
}
function RenderedField({ field }) {
  const commonProps = {
    id: field.id,
    name: field.id,
    required: field.required
  };
  return <div className="rendered-field">
      <label htmlFor={field.id}>
        {field.label}
        <RequiredMark field={field} />
      </label>
      {field.description && <p className="field-help">{field.description}</p>}

      {field.type === "full_name" && <input {...commonProps} type="text" placeholder={field.placeholder || "Ad\u0131n\u0131z\u0131 ve soyad\u0131n\u0131z\u0131 yaz\u0131n\u0131z"} />}
      {field.type === "email" && <input {...commonProps} type="email" placeholder={field.placeholder || "ornek@email.com"} />}
      {field.type === "phone" && <input {...commonProps} type="tel" placeholder={field.placeholder || "05__ ___ __ __"} />}
      {field.type === "date" && <input {...commonProps} type="date" />}
      {field.type === "long_text" && <textarea {...commonProps} rows={5} placeholder={field.placeholder || "Cevab\u0131n\u0131z\u0131 yaz\u0131n\u0131z"} />}
      {field.type === "file" && <div className="file-input-wrap">
          <input
    {...commonProps}
    type="file"
    accept={field.fileSettings?.acceptedTypes.join(",")}
  />
          <small>
            İzin verilen dosyalar: {field.fileSettings?.acceptedTypes.join(", ") || "T\xFCm\xFC"} · En fazla{" "}
            {field.fileSettings?.maxSizeMb ?? 10} MB
          </small>
        </div>}
      {field.type === "multiple_choice" && <div className="choice-list">
          {(field.options ?? []).map((option, index) => <label className="choice-option" key={`${field.id}-${index}`}>
              <input type="radio" name={field.id} value={option} required={field.required} />
              <span>{option}</span>
            </label>)}
        </div>}
    </div>;
}
function FormRenderer({ schema, preview = false, formId, version }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  async function handleSubmit(event) {
    event.preventDefault();
    if (preview) return;
    setSaving(true); setMessage('');
    try {
      const answers = {}, files = [];
      let size = 0;
      for (const [key, value] of new FormData(event.currentTarget).entries()) {
        if (value instanceof File) {
          if (!value.size) continue;
          size += value.size;
          if (size > 10 * 1024 * 1024) throw new Error('Toplam dosya boyutu en fazla 10 MB olabilir.');
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1]);
            reader.onerror = () => reject(new Error('Dosya okunamadı.'));
            reader.readAsDataURL(value);
          });
          files.push({ fieldId: key, name: value.name, base64 });
        } else answers[key] = value;
      }
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/forms/${formId}/submissions`, { version, answers, files }, { timeout: 30000 });
      setSubmitted(true); setMessage('Formunuz kaydedildi. Teşekkür ederiz.');
    } catch (error) { setMessage(error.response?.data?.error?.message || error.message || 'Form gönderilemedi.'); }
    finally { setSaving(false); }
  }
  return <form className="rendered-form" onSubmit={handleSubmit}>
      <header className="rendered-form__header">
        <span className="rendered-form__eyebrow">GÖNÜLLÜ 360</span>
        <h1>{schema.title || "\u0130simsiz Form"}</h1>
        {schema.description && <p>{schema.description}</p>}
      </header>

      {schema.sections.map((section, sectionIndex) => <section className="rendered-section" key={section.id}>
          {(section.title || schema.sections.length > 1) && <div className="rendered-section__heading">
              <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
              <h2>{section.title || `B\xF6l\xFCm ${sectionIndex + 1}`}</h2>
            </div>}
          {section.description && <p className="section-description">{section.description}</p>}
          {section.fields.length === 0 ? <p className="empty-preview">Bu bölümde henüz bir alan bulunmuyor.</p> : section.fields.map((field) => <RenderedField field={field} key={field.id} />)}
        </section>)}

      {message && <p role="alert">{message}</p>}
      <button className="submit-form-button" type="submit" disabled={preview || saving || submitted}>
        {preview ? "\xD6nizleme Modu" : "Formu G\xF6nder"}
      </button>
    </form>;
}
export {
  FormRenderer
};
