import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import EventCalendar from "./EventCalendar";
import {
  createEvent,
  createEventGroup,
  getEventApiErrorMessage,
  getEventOptions,
  uploadEventPoster,
} from "./services/eventApi";
import "./event-management.css";

const initialDate = (() => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
})();

const emptyForm = {
  name: "",
  slug: "",
  date: initialDate,
  startTime: "09:00",
  endTime: "10:00",
  type: "IN_PERSON",
  address: "",
  capacity: "",
  registrationFormId: "",
  contactInfo: "",
  description: "",
};

function slugify(value) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function turkeyIso(date, time) {
  return new Date(`${date}T${time}:00+03:00`).toISOString();
}

export default function EventManagementFeature() {
  const [form, setForm] = useState(emptyForm);
  const [groups, setGroups] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    getEventOptions()
      .then((options) => {
        if (!active) return;
        const nextGroups = options?.groups || [];
        setGroups(nextGroups);
        setForms(options?.forms || []);
        if (nextGroups[0]) setSelectedGroupIds([nextGroups[0].id]);
      })
      .catch((error) => active && setMessage({ type: "error", text: getEventApiErrorMessage(error) }))
      .finally(() => active && setLoadingOptions(false));
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (posterPreview) URL.revokeObjectURL(posterPreview);
  }, [posterPreview]);

  const selectedDateLabel = useMemo(
    () => new Date(`${form.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
    [form.date],
  );

  function changeField(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "name" && !slugTouched) next.slug = slugify(value);
      return next;
    });
    setMessage(null);
  }

  function toggleGroup(id) {
    setSelectedGroupIds((current) => (
      current.includes(id) ? current.filter((groupId) => groupId !== id) : [...current, id]
    ));
  }

  function choosePoster(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setMessage({ type: "error", text: "Afiş PNG veya JPEG formatında olmalıdır." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Afiş dosyası en fazla 5 MB olabilir." });
      return;
    }
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
    setMessage(null);
  }

  function validateForm() {
    if (selectedGroupIds.length === 0) return "En az bir grup seçin.";
    if (form.name.trim().length < 2) return "Etkinlik adını girin.";
    if (form.slug.length < 3) return "En az 3 karakterli bir kısa URL girin.";
    if (turkeyIso(form.date, form.endTime) <= turkeyIso(form.date, form.startTime)) {
      return "Bitiş saati başlangıç saatinden sonra olmalıdır.";
    }
    if (form.type === "IN_PERSON" && !form.address.trim()) return "Fiziksel etkinlik adresini girin.";
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setMessage({ type: "error", text: validationMessage });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const poster = posterFile ? await uploadEventPoster(posterFile) : null;
      const saved = await createEvent({
        name: form.name.trim(),
        slug: form.slug,
        type: form.type,
        startsAt: turkeyIso(form.date, form.startTime),
        endsAt: turkeyIso(form.date, form.endTime),
        timezone: "Europe/Istanbul",
        address: form.type === "IN_PERSON" ? form.address.trim() : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        registrationFormId: form.registrationFormId || null,
        contactInfo: form.contactInfo.trim() || null,
        description: form.description.trim() || null,
        posterUrl: poster?.posterUrl || null,
        posterStorageKey: poster?.posterStorageKey || null,
        groupIds: selectedGroupIds,
      });
      setMessage({ type: "success", text: `“${saved.name}” etkinliği başarıyla kaydedildi.` });
      setForm(emptyForm);
      setSlugTouched(false);
      setPosterFile(null);
      if (posterPreview) URL.revokeObjectURL(posterPreview);
      setPosterPreview("");
    } catch (error) {
      setMessage({ type: "error", text: getEventApiErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddGroup(event) {
    event.preventDefault();
    if (newGroupName.trim().length < 2) return;
    setAddingGroup(true);
    try {
      const group = await createEventGroup({ name: newGroupName.trim(), color: "#00a99d" });
      setGroups((current) => [...current, group]);
      setSelectedGroupIds((current) => [...current, group.id]);
      setNewGroupName("");
      setShowNewGroup(false);
    } catch (error) {
      setMessage({ type: "error", text: getEventApiErrorMessage(error) });
    } finally {
      setAddingGroup(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setSlugTouched(false);
    setPosterFile(null);
    setPosterPreview("");
    setMessage(null);
  }

  return (
    <div className="event-shell">
      <Sidebar />
      <div className="event-shell__content">
        <Navbar />
        <main className="event-page">
          <header className="event-page__title">
            <span className="event-page__title-icon">▣</span>
            <h1>Etkinlik Yönetimi</h1>
          </header>

          <div className="event-layout">
            <aside className="event-side-panel">
              <section className="event-card group-card">
                <h2>Grup Seç</h2>
                {loadingOptions ? <p className="event-muted">Gruplar yükleniyor...</p> : groups.map((group) => (
                  <label className="group-option" key={group.id}>
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(group.id)}
                      onChange={() => toggleGroup(group.id)}
                    />
                    <span className="group-option__dot" style={{ borderColor: group.color, color: group.color }} />
                    <span className="group-option__name">{group.name}</span>
                    <span className="group-option__count">{group.memberCount}</span>
                  </label>
                ))}

                {showNewGroup ? (
                  <form className="new-group-form" onSubmit={handleAddGroup}>
                    <input
                      value={newGroupName}
                      onChange={(event) => setNewGroupName(event.target.value)}
                      placeholder="Grup adı"
                      aria-label="Yeni grup adı"
                      autoFocus
                    />
                    <button type="submit" disabled={addingGroup}>{addingGroup ? "..." : "Ekle"}</button>
                  </form>
                ) : (
                  <button type="button" className="new-group-button" onClick={() => setShowNewGroup(true)}>＋ Yeni Grup</button>
                )}
              </section>

              <section className="event-card schedule-card">
                <EventCalendar value={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} />
                <p className="selected-date">{selectedDateLabel}</p>
                <div className="time-row">
                  <label>Başlangıç *</label>
                  <input type="time" name="startTime" value={form.startTime} onChange={changeField} />
                </div>
                <div className="time-row">
                  <label>Bitiş *</label>
                  <input type="time" name="endTime" value={form.endTime} onChange={changeField} />
                </div>
              </section>
            </aside>

            <section className="event-card event-form-card">
              <h2>Yeni Etkinlik Ekle</h2>
              <form onSubmit={handleSubmit} noValidate>
                <label className="field-label">Etkinlik Afişi Ekle</label>
                <div
                  className={`poster-dropzone ${posterPreview ? "has-preview" : ""}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    choosePoster(event.dataTransfer.files[0]);
                  }}
                >
                  {posterPreview ? (
                    <img src={posterPreview} alt="Etkinlik afişi önizlemesi" />
                  ) : (
                    <div className="poster-placeholder" aria-hidden="true">▧</div>
                  )}
                  <div>
                    <strong>Sürükle &amp; Bırak</strong>
                    <span>Veya</span>
                    <button type="button" onClick={() => fileInputRef.current?.click()}>Fotoğraf Yükle</button>
                    <small>Dosya formatı: PNG, JPG · En fazla 5 MB</small>
                    {posterFile && <small className="poster-file-name">{posterFile.name}</small>}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    hidden
                    onChange={(event) => choosePoster(event.target.files[0])}
                  />
                </div>

                <div className="form-grid form-grid--two">
                  <label>
                    <span>Etkinlik Adı *</span>
                    <input name="name" value={form.name} onChange={changeField} maxLength={160} />
                  </label>
                  <label>
                    <span>Kısa URL *</span>
                    <div className="slug-input">
                      <span>/</span>
                      <input
                        name="slug"
                        value={form.slug}
                        onChange={(event) => { setSlugTouched(true); changeField(event); }}
                        placeholder="gonullubulusmasi"
                        maxLength={80}
                      />
                    </div>
                  </label>
                </div>

                <label>
                  <span>Etkinlik Adresi {form.type === "IN_PERSON" ? "*" : ""}</span>
                  <div className="address-input">
                    <span aria-hidden="true">⌖</span>
                    <input
                      name="address"
                      aria-label={`Etkinlik Adresi${form.type === "IN_PERSON" ? " *" : ""}`}
                      value={form.address}
                      onChange={changeField}
                      disabled={form.type === "ONLINE"}
                      placeholder={form.type === "ONLINE" ? "Online etkinlik" : "Adres girin"}
                    />
                  </div>
                </label>

                <div className="form-grid form-grid--three">
                  <fieldset>
                    <legend>Etkinlik Tipi *</legend>
                    <div className="segmented-control">
                      <label><input type="radio" name="type" value="IN_PERSON" checked={form.type === "IN_PERSON"} onChange={changeField} /> Fiziksel</label>
                      <label><input type="radio" name="type" value="ONLINE" checked={form.type === "ONLINE"} onChange={changeField} /> Online</label>
                    </div>
                  </fieldset>
                  <label>
                    <span>Kontenjan</span>
                    <div className="capacity-input">
                      <input type="number" min="1" name="capacity" value={form.capacity} onChange={changeField} placeholder="Sınırsız" />
                      <span>Kişi</span>
                    </div>
                  </label>
                  <label>
                    <span>İletişim Bilgisi</span>
                    <input name="contactInfo" value={form.contactInfo} onChange={changeField} maxLength={250} />
                  </label>
                </div>

                <div className="form-grid form-grid--two form-grid--wide-left">
                  <label>
                    <span>Form Tipi Seç</span>
                    <select name="registrationFormId" value={form.registrationFormId} onChange={changeField}>
                      <option value="">Kayıt formu olmadan</option>
                      {forms.map((publishedForm) => (
                        <option key={publishedForm.id} value={publishedForm.id}>{publishedForm.title}</option>
                      ))}
                    </select>
                  </label>
                  <div className="form-hint">Yalnızca yayımlanmış formlar gösterilir.</div>
                </div>

                <label>
                  <span>Açıklama</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={changeField}
                    rows="5"
                    maxLength={5000}
                    placeholder="Etkinlik hakkında açıklama yazınız..."
                  />
                </label>

                {message && <div role="alert" className={`event-message event-message--${message.type}`}>{message.text}</div>}

                <div className="event-form-actions">
                  <button type="button" className="button-secondary" onClick={resetForm} disabled={submitting}>İptal Et</button>
                  <button type="submit" className="button-primary" disabled={submitting || loadingOptions}>
                    {submitting ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
