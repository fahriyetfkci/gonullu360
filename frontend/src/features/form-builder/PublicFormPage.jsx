import { useEffect, useState } from 'react';
import { getPublishedForm } from './services/formApi';
import { FormRenderer } from './components/FormRenderer';
import './form-builder.css';

export default function PublicFormPage() {
  const clientFormId = decodeURIComponent(window.location.hash.slice('#form/'.length));
  const [form, setForm] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    getPublishedForm(clientFormId).then(result => {
      if (!result) setError('Yayımlanmış form bulunamadı.'); else setForm(result);
    }).catch(() => setError('Form yüklenemedi. Lütfen tekrar deneyin.'));
  }, [clientFormId]);
  return <main style={{ maxWidth: 850, margin: '32px auto', padding: 24 }}>
    {error ? <p role="alert">{error}</p> : form ? <FormRenderer schema={form.schema} formId={form.formId} version={form.version} /> : <p>Form yükleniyor…</p>}
  </main>;
}
