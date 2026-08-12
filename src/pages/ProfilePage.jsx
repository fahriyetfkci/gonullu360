import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import './ProfilePage.css';

export default function ProfilePage() {
  const savedVolunteer = localStorage.getItem('selectedVolunteer');

  const selectedVolunteer = savedVolunteer
    ? JSON.parse(savedVolunteer)
    : null;

  const getEducationInfo = (educationLevel) => {
    switch (educationLevel) {
      case 'Ortaokul':
        return {
          school: 'Atatürk Ortaokulu',
          department: '—',
        };

      case 'Lise':
        return {
          school: 'Kadıköy Anadolu Lisesi',
          department: '—',
        };

      case 'Üniversite':
        return {
          school: 'İstanbul Üniversitesi',
          department: 'Bilgisayar Mühendisliği',
        };

      case 'Mezun':
        return {
          school: 'Marmara Üniversitesi',
          department: 'İşletme',
        };

      default:
        return {
          school: 'Bilgi bulunmuyor',
          department: 'Bilgi bulunmuyor',
        };
    }
  };

  const educationInfo = getEducationInfo(
    selectedVolunteer?.educationLevel
  );

  const volunteer = {
    id: selectedVolunteer?.id || '61003',
    name: selectedVolunteer?.fullName || 'Onur Özbek',
    status: selectedVolunteer?.status || 'Aktif Gönüllü',

    educationLevel:
      selectedVolunteer?.educationLevel || 'Üniversite',

    applicationDate:
      selectedVolunteer?.applicationDate || '2026-06-12',

    school: educationInfo.school,
    schoolDepartment: educationInfo.department,

    city: 'İstanbul',
    department: '#Tanıtım ve Medya',

    birthDate: '19.12.1998',
    age: 28,

    phone: '0532 456 78 90',
    email: 'gonullu@example.com',

    volunteerScore: 82,
    participationScore: 60,

    lastEventDays: 12,
    lastEventDate: '30 Mayıs 2026',

    lastEvent:
      '12 Haziran 2026 Genç İHH Halısaha Turnuvası',

    lastEventCode: '#E12',

    interests: [
      'Psikososyal',
      'Medya',
      'Arama Kurt.',
      'Grafik Tasarım',
    ],

    managerNote:
      'En son 2024 yılında burs verdik. Etkinliklerimize aktif katılım sağlayan biri. Fotoğraf çekme ve grafik tasarım alanında ilgili. Personel olarak daha sonra değerlendirilebilir.',

    managerNoteInfo:
      '19.08.2025 - Yönetici Notu',

    photo: null,
  };

  const [activeSection, setActiveSection] = useState(null);

  const profileSections = [
    'Başvurular',
    'Eğitim Bilgileri',
    'Etkinlik Katılımı',
    'İletişim Bilgileri',
    'Belgeler',
    'Ön Yazı',
    'CV',
    'Görevler',
  ];

  const handleBackToVolunteers = () => {
    window.location.hash = '#volunteers';
  };

  const closeDetailPanel = () => {
    setActiveSection(null);
  };

  const formatDate = (dateValue) => {
    if (!dateValue || !dateValue.includes('-')) {
      return dateValue;
    }

    const [year, month, day] = dateValue.split('-');
    return `${day}.${month}.${year}`;
  };

  return (
    <div className="profile-page">
      <Sidebar />

      <div className="profile-page-content">
        <Navbar />

        <main className="profile-main">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 22,
              gap: 20,
            }}
          >
            <div className="profile-status">
              <span className="profile-status-dot" />
              <span>{volunteer.status}</span>
            </div>

            <button
              type="button"
              onClick={handleBackToVolunteers}
              style={{
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                color: '#555',
                borderRadius: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              ← Gönüllü Listesine Dön
            </button>
          </div>

          <div className="profile-layout">
            <section className="profile-left-column">
              <div className="profile-section-buttons">
                {profileSections.map((section) => (
                  <button
                    type="button"
                    className="profile-section-button"
                    key={section}
                    onClick={() => setActiveSection(section)}
                    style={{
                      borderColor:
                        activeSection === section
                          ? '#00b894'
                          : undefined,
                      color:
                        activeSection === section
                          ? '#00a98f'
                          : undefined,
                      backgroundColor:
                        activeSection === section
                          ? '#f0faf8'
                          : undefined,
                    }}
                  >
                    {section}
                  </button>
                ))}
              </div>

              <div className="profile-last-event">
                <h3>Son Katıldığı Etkinlik</h3>

                <div className="profile-last-event-box">
                  <span>{volunteer.lastEventCode}</span>
                  <p>{volunteer.lastEvent}</p>
                </div>
              </div>

              <div className="profile-interests">
                <h3>İlgi Alanları</h3>

                <div className="profile-interest-list">
                  {volunteer.interests.map((interest) => (
                    <div
                      className="profile-interest-tag"
                      key={interest}
                    >
                      <span />
                      {interest}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="profile-center-column">
              {activeSection ? (
                <DetailPanel
                  section={activeSection}
                  volunteer={volunteer}
                  onClose={closeDetailPanel}
                  formatDate={formatDate}
                />
              ) : (
                <>
                  <h1>{volunteer.name}</h1>

                  <div className="profile-location">
                    <span>{volunteer.city}</span>
                    <p>{volunteer.department}</p>
                  </div>

                  <div className="profile-photo-area">
                    {volunteer.photo ? (
                      <img
                        src={volunteer.photo}
                        alt={volunteer.name}
                      />
                    ) : (
                      <div className="profile-photo-placeholder">
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 70,
                              height: 70,
                              borderRadius: '50%',
                              backgroundColor: '#f1f3f5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 30,
                              color: '#999',
                            }}
                          >
                            👤
                          </div>

                          <span>Profil Fotoğrafı</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="profile-id">
                    #{volunteer.id}
                  </div>

                  <p className="profile-birth-title">
                    Doğum Tarihi
                  </p>

                  <div className="profile-birth-value">
                    {volunteer.birthDate} ({volunteer.age} yaşında)
                  </div>
                </>
              )}
            </section>

            <section className="profile-right-column">
              <div className="profile-score-row">
                <ScoreCard
                  title="Gönüllülük Puanı"
                  value={volunteer.volunteerScore}
                  type="volunteer"
                />

                <ScoreCard
                  title="Katılım Skoru"
                  value={volunteer.participationScore}
                  type="participation"
                />
              </div>

              <div className="profile-small-card">
                <h3>Son Katıldığı Etkinlik</h3>

                <strong>
                  {volunteer.lastEventDays} Gün önce
                </strong>

                <span>{volunteer.lastEventDate}</span>
              </div>

              <div className="profile-manager-note">
                <h3>Yönetici Notu</h3>

                <div className="profile-note-box">
                  {volunteer.managerNote}
                </div>

                <p>{volunteer.managerNoteInfo}</p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function DetailPanel({
  section,
  volunteer,
  onClose,
  formatDate,
}) {
  const getSectionContent = () => {
    switch (section) {
      case 'Başvurular':
        return (
          <>
            <DetailRow
              label="Başvuru No"
              value={`#${volunteer.id}`}
            />

            <DetailRow
              label="Başvuru Tarihi"
              value={formatDate(volunteer.applicationDate)}
            />

            <DetailRow
              label="Başvuru Türü"
              value="Gönüllü Başvurusu"
            />

            <DetailRow
              label="Durum"
              value={volunteer.status}
            />
          </>
        );

      case 'Eğitim Bilgileri':
        return (
          <>
            <DetailRow
              label="Eğitim Düzeyi"
              value={volunteer.educationLevel}
            />

            <DetailRow
              label="Okul"
              value={volunteer.school}
            />

            <DetailRow
              label="Bölüm"
              value={volunteer.schoolDepartment}
            />
          </>
        );

      case 'Etkinlik Katılımı':
        return (
          <>
            <DetailRow
              label="Son Etkinlik"
              value={volunteer.lastEvent}
            />

            <DetailRow
              label="Toplam Katılım"
              value="15 Etkinlik"
            />

            <DetailRow
              label="Katılım Skoru"
              value={`%${volunteer.participationScore}`}
            />

            <DetailRow
              label="Son Katılım Tarihi"
              value={volunteer.lastEventDate}
            />
          </>
        );

      case 'İletişim Bilgileri':
        return (
          <>
            <DetailRow
              label="Telefon"
              value={volunteer.phone}
            />

            <DetailRow
              label="E-posta"
              value={volunteer.email}
            />

            <DetailRow
              label="Şehir"
              value={volunteer.city}
            />
          </>
        );

      case 'Belgeler':
        return (
          <>
            <DetailRow
              label="Kimlik Belgesi"
              value="Yüklendi"
            />

            <DetailRow
              label="Öğrenci Belgesi"
              value="Yüklendi"
            />

            <DetailRow
              label="Adli Sicil Kaydı"
              value="Onaylandı"
            />
          </>
        );

      case 'Ön Yazı':
        return (
          <p
            style={{
              color: '#666',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Sosyal sorumluluk çalışmalarında daha aktif rol almak,
            gönüllülük deneyimimi geliştirmek ve özellikle gençlik,
            organizasyon ve medya alanlarında görev almak istiyorum.
          </p>
        );

      case 'CV':
        return (
          <>
            <DetailRow
              label="CV Durumu"
              value="CV Yüklendi"
            />

            <DetailRow
              label="Son Güncelleme"
              value="10.06.2026"
            />

            <button
              type="button"
              style={{
                marginTop: 14,
                border: 'none',
                borderRadius: 8,
                padding: '9px 14px',
                backgroundColor: '#00b894',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              CV'yi Görüntüle
            </button>
          </>
        );

      case 'Görevler':
        return (
          <>
            <DetailRow
              label="Aktif Görev"
              value="Sosyal Medya İçerik Desteği"
            />

            <DetailRow
              label="Tamamlanan Görev"
              value="8"
            />

            <DetailRow
              label="Bekleyen Görev"
              value="2"
            />

            <DetailRow
              label="Son Görev Tarihi"
              value="18.06.2026"
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#fff',
        border: '1px solid #e5e5e5',
        borderRadius: 18,
        padding: 24,
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 15,
          marginBottom: 22,
        }}
      >
        <h2
          style={{
            margin: 0,
            color: '#444',
            fontSize: 22,
          }}
        >
          {section}
        </h2>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #ddd',
            backgroundColor: '#fff',
            cursor: 'pointer',
            color: '#666',
            fontSize: 18,
          }}
        >
          ×
        </button>
      </div>

      {getSectionContent()}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div
        style={{
          color: '#999',
          fontSize: 11,
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: '#444',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ScoreCard({ title, value, type }) {
  return (
    <div className="profile-score-card">
      <h3>{title}</h3>

      <div
        className={`profile-score-circle profile-score-circle-${type}`}
        style={{
          '--score': `${value * 3.6}deg`,
        }}
      >
        <div>
          <strong>{value}%</strong>
        </div>
      </div>

      <div className="profile-score-footer">
        <span />
        <small>Hedef</small>
        <strong>{value}%</strong>
      </div>
    </div>
  );
}