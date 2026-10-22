import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getFormAnalytics } from "../../services/api";

const FIELD_LABELS = {
  full_name: "Ad Soyad",
  email: "E-posta",
  phone: "Telefon",
  multiple_choice: "Çoktan Seçmeli",
  date: "Tarih",
  file: "Dosya",
  long_text: "Açık Uçlu",
};
const CHART_COLORS = ["#08b485", "#5f65e8", "#2b8de9", "#f39a18", "#ef4770", "#8a5cf5", "#31b6c8"];
const monthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit", timeZone: "UTC" });

function formatMonth(period) {
  return monthFormatter.format(new Date(`${period}-01T00:00:00.000Z`)).replace(" ", " '");
}

function EmptyChart({ children }) {
  return <div className="form-analysis-empty">{children}</div>;
}

export default function FormAnalysisView({ onBack }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getFormAnalytics()
      .then(result => { if (active) setAnalytics(result); })
      .catch(requestError => { if (active) setError(requestError.response?.data?.error || "Form analizleri yüklenemedi."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const monthlyData = useMemo(() => (analytics?.submissionsByMonth || []).map(item => ({
    ...item,
    label: formatMonth(item.period),
  })), [analytics]);
  const fieldTypeData = useMemo(() => (analytics?.fieldTypes || []).map(item => ({
    ...item,
    label: FIELD_LABELS[item.type] || item.type,
  })), [analytics]);
  const hasMonthlyResponses = monthlyData.some(item => item.count > 0);
  const hasFormResponses = (analytics?.formsPerformance || []).some(item => item.submissionCount > 0);

  return (
    <main className="form-builder-feature form-analysis-view">
      <header className="form-analysis-header">
        <div><span>FORM YÖNETİMİ</span><h1>Form Analizi</h1><p>Formların performansını ve gelen yanıtları gerçek veriler üzerinden inceleyin.</p></div>
        <button className="form-tools-back" type="button" onClick={onBack}>← Form Araçlarına Dön</button>
      </header>

      {loading && <div className="forms-management-empty">Analiz verileri yükleniyor...</div>}
      {error && <p className="forms-management-error" role="alert">{error}</p>}
      {analytics && <>
        <section className="form-analysis-summary" aria-label="Form analiz özeti">
          <article><span>Toplam Form</span><strong>{analytics.summary.totalForms}</strong><small>{analytics.summary.publishedForms} yayında · {analytics.summary.draftForms} taslak</small></article>
          <article><span>Toplam Yanıt</span><strong>{analytics.summary.totalSubmissions}</strong><small>Tüm formlardan gelen cevaplar</small></article>
          <article><span>Son 30 Gün</span><strong>{analytics.summary.submissionsLast30Days}</strong><small>Yeni form yanıtı</small></article>
          <article><span>Form Başına Ortalama</span><strong>{analytics.summary.averageResponsesPerPublishedForm}</strong><small>Yayımlanmış form başına yanıt</small></article>
        </section>

        <section className="form-analysis-grid">
          <article className="form-analysis-card form-analysis-card--wide">
            <div className="form-analysis-card__heading"><div><h2>Yanıt Eğilimi</h2><p>Son 12 ayda alınan form yanıtları</p></div></div>
            {!hasMonthlyResponses ? <EmptyChart>Son 12 ay için yanıt verisi bulunmuyor.</EmptyChart> : <ResponsiveContainer width="100%" height={270}>
              <LineChart data={monthlyData} margin={{ top: 14, right: 18, left: -18, bottom: 4 }}>
                <CartesianGrid stroke="#edf0f2" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8995a5", fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8995a5", fontSize: 11 }} />
                <Tooltip formatter={value => [`${value} yanıt`, "Yanıt"]} />
                <Line type="monotone" dataKey="count" stroke="#08b485" strokeWidth={3} dot={{ r: 4, fill: "#08b485", strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>}
          </article>

          <article className="form-analysis-card">
            <div className="form-analysis-card__heading"><div><h2>Alan Dağılımı</h2><p>Formlarda kullanılan soru türleri</p></div></div>
            {fieldTypeData.length === 0 ? <EmptyChart>Henüz analiz edilecek form alanı yok.</EmptyChart> : <div className="form-analysis-pie">
              <ResponsiveContainer width="55%" height={240}>
                <PieChart><Pie data={fieldTypeData} dataKey="count" nameKey="label" innerRadius={54} outerRadius={86} paddingAngle={3}>
                  {fieldTypeData.map((item, index) => <Cell key={item.type} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie><Tooltip formatter={value => [`${value} alan`, "Kullanım"]} /></PieChart>
              </ResponsiveContainer>
              <div className="form-analysis-legend">{fieldTypeData.map((item, index) => <div key={item.type}><i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><span>{item.label}</span><strong>{item.count}</strong></div>)}</div>
            </div>}
          </article>

          <article className="form-analysis-card form-analysis-card--full">
            <div className="form-analysis-card__heading"><div><h2>Form Performansı</h2><p>Yanıt sayısına göre en aktif formlar</p></div></div>
            {!hasFormResponses ? <EmptyChart>Henüz form yanıtı bulunmuyor.</EmptyChart> : <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.formsPerformance} layout="vertical" margin={{ top: 8, right: 30, left: 15, bottom: 0 }}>
                <CartesianGrid stroke="#edf0f2" horizontal={false} />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="title" width={150} axisLine={false} tickLine={false} tick={{ fill: "#566474", fontSize: 11 }} />
                <Tooltip formatter={value => [`${value} yanıt`, "Yanıt"]} />
                <Bar dataKey="submissionCount" fill="#5f65e8" radius={[0, 7, 7, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>}
          </article>
        </section>
      </>}
    </main>
  );
}
