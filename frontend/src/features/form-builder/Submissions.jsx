import { useEffect, useState } from 'react';
import { apiClient } from '../../services/client';

export default function Submissions({ formId, schema }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [page, setPage] = useState(1);
  const labels = Object.fromEntries(schema.sections.flatMap(section => section.fields).map(field => [field.id, field.label]));
  useEffect(() => {
    let active = true;
    apiClient.get(`/forms/${formId}/submissions`, { params: { page } }).then(response => { if (active) setData(response.data.data); }).catch(() => { if (active) setError('Cevaplar yüklenemedi.'); });
    return () => { active = false; };
  }, [formId, page]);
  async function download(submission, file) {
    try {
      const response = await apiClient.get(`/forms/${formId}/submissions/${submission.id}/files/${file.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = file.originalName; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('Dosya indirilemedi.'); }
  }
  return <section><h2>Form Cevapları</h2>{error && <p role="alert">{error}</p>}
    {data?.items.length === 0 && <p>Henüz cevap yok.</p>}
    {data?.items.map(item => <article key={item.id} style={{ padding: 20, borderBottom: '1px solid #ddd' }}><p>{new Date(item.submittedAt).toLocaleString('tr-TR')} · Sürüm {item.formVersion}</p>
      {Object.entries(item.answers).map(([key, value]) => <p key={key}><strong>{labels[key] || key}: </strong>{value}</p>)}
      {item.files.map(file => <button key={file.id} onClick={() => download(item, file)}>{file.originalName}</button>)}
    </article>)}
    <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</button> {page} / {Math.max(1, data?.totalPages || 1)} <button disabled={!data || page >= data.totalPages} onClick={() => setPage(page + 1)}>Sonraki</button>
  </section>;
}
