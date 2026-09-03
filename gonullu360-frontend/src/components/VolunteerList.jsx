import { getVolunteers } from '../services/api';
import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return '—';
  const datePart = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : String(value);
};

export default function VolunteerList({
  volunteers: initialVolunteers = [],
  pagination: initialPagination = { total: 0 },
}) {
  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [pagination, setPagination] = useState(initialPagination);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedAge, setSelectedAge] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);

  useEffect(() => {
    const fetchVolunteers = async () => {
      setLoading(true);
      try {
        const data = await getVolunteers({
          page,
          limit: PAGE_SIZE,
          search: searchText,
          city: selectedCity,
          gender: selectedGender,
          ageRange: selectedAge,
        });
        setVolunteers(data.volunteers);
        setPagination(data.pagination);
        setCities(data.filterOptions?.cities || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchVolunteers();
  }, [page, searchText, selectedCity, selectedGender, selectedAge]);

  const handleShowAll = () => {
    window.location.hash = 'volunteers';
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedCity('');
    setSelectedGender('');
    setSelectedAge('');
    setPage(1);
    setActiveMenu(null);
  };

  const getInitials = (name = '') => {
    return name
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  };

  const visibleVolunteers = volunteers;

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              color: '#333',
              fontWeight: 600,
              fontSize: 14,
              margin: 0,
            }}
          >
            Gönüllü Gruplama
          </p>

          <span
            style={{
              color: '#999',
              fontSize: 11,
            }}
          >
            Gönüllüleri arayın ve filtreleyin
          </span>
        </div>

        <button
          type="button"
          onClick={handleShowAll}
          style={{
            backgroundColor: '#00b894',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '7px 16px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Tümünü Gör
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 18,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value);
            setPage(1);
            setActiveMenu(null);
          }}
          placeholder="İsim ara..."
          style={{
            minWidth: 190,
            flex: '1 1 190px',
            border: '1px solid #ddd',
            borderRadius: 7,
            padding: '8px 10px',
            fontSize: 13,
            outline: 'none',
          }}
        />

        <select
          value={selectedCity}
          onChange={(event) => {
            setSelectedCity(event.target.value);
            setPage(1);
            setActiveMenu(null);
          }}
          style={{
            border: '1px solid #ddd',
            borderRadius: 7,
            padding: '8px 10px',
            fontSize: 13,
            color: '#555',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          <option value="">Tüm bölgeler</option>

          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <select
          value={selectedGender}
          onChange={(event) => {
            setSelectedGender(event.target.value);
            setPage(1);
            setActiveMenu(null);
          }}
          style={{
            border: '1px solid #ddd',
            borderRadius: 7,
            padding: '8px 10px',
            fontSize: 13,
            color: '#555',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          <option value="">Tüm cinsiyetler</option>
          <option value="Kadın">Kadın</option>
          <option value="Erkek">Erkek</option>
        </select>

        <select
          value={selectedAge}
          onChange={(event) => {
            setSelectedAge(event.target.value);
            setPage(1);
            setActiveMenu(null);
          }}
          style={{
            border: '1px solid #ddd',
            borderRadius: 7,
            padding: '8px 10px',
            fontSize: 13,
            color: '#555',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          <option value="">Tüm yaşlar</option>
          <option value="17-25">17–25</option>
          <option value="26-35">26–35</option>
          <option value="36-45">36–45</option>
          <option value="46+">46+</option>
        </select>

        <button
          type="button"
          onClick={handleClearFilters}
          style={{
            border: '1px solid #ddd',
            borderRadius: 7,
            padding: '8px 12px',
            backgroundColor: '#fff',
            color: '#666',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Temizle
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 760 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '120px minmax(190px, 1fr) 120px 100px 70px 50px',
              gap: 8,
              padding: '9px 0',
              borderBottom: '1px solid #f0f0f0',
              color: '#aaa',
              fontSize: 13,
            }}
          >
            <span>Tarih</span>
            <span>İsim</span>
            <span>Bölge</span>
            <span>Cinsiyet</span>
            <span>Yaş</span>
            <span />
          </div>

          {loading ? (
            <div style={{padding:'40px 16px',textAlign:'center',color:'#888'}}>
              <p style={{margin:0,fontSize:13}}>Gönüllüler yükleniyor...</p>
            </div>
          ) : visibleVolunteers.length === 0 ? (
            <div
              style={{
                padding: '40px 16px',
                textAlign: 'center',
                color: '#888',
              }}
            >
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#555',
                }}
              >
                Gönüllü kaydı bulunamadı.
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                }}
              >
                Arama veya filtre seçeneklerini değiştirin.
              </p>
            </div>
          ) : (
            visibleVolunteers.map((volunteer, index) => (
              <div
                key={volunteer.id || `${volunteer.name}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '120px minmax(190px, 1fr) 120px 100px 70px 50px',
                  gap: 8,
                  padding: '12px 0',
                  borderBottom: '1px solid #f7f7f7',
                  alignItems: 'center',
                  fontSize: 14,
                  position: 'relative',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = '#fafdfc';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span
                  style={{
                    color: '#888',
                    fontSize: 13,
                  }}
                >
                  {formatDate(volunteer.date)}
                </span>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor:
                        volunteer.gender === 'Kadın'
                          ? '#fde6f0'
                          : '#e3f0ff',
                      color:
                        volunteer.gender === 'Kadın'
                          ? '#d63384'
                          : '#1971c2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {volunteer.photo ? (
                      <img
                        src={volunteer.photo}
                        alt={volunteer.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      getInitials(volunteer.name)
                    )}
                  </div>

                  <span
                    style={{
                      color: '#333',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {volunteer.name}
                  </span>
                </div>

                <span style={{ color: '#555' }}>
                  {volunteer.city}
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'fit-content',
                    padding: '4px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                    color:
                      volunteer.gender === 'Kadın'
                        ? '#b52b67'
                        : '#1769aa',
                    backgroundColor:
                      volunteer.gender === 'Kadın'
                        ? '#fff0f6'
                        : '#edf6ff',
                  }}
                >
                  {volunteer.gender}
                </span>

                <span style={{ color: '#555' }}>
                  {volunteer.age}
                </span>

                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <button
                    type="button"
                    aria-label="Gönüllü işlemleri"
                    onClick={(event) => {
                      if (activeMenu === index) {
                        setActiveMenu(null);
                        setMenuPosition(null);
                        return;
                      }
                      const rect = event.currentTarget.getBoundingClientRect();
                      const menuHeight = 166;
                      const openUpward = window.innerHeight - rect.bottom < menuHeight + 12;
                      setMenuPosition({
                        top: openUpward ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
                        left: Math.max(8, rect.right - 170),
                      });
                      setActiveMenu(index);
                    }}
                    style={{
                      width: 30,
                      height: 30,
                      border: 'none',
                      borderRadius: 6,
                      backgroundColor:
                        activeMenu === index
                          ? '#f0faf8'
                          : 'transparent',
                      cursor: 'pointer',
                      color: '#777',
                      fontSize: 19,
                      lineHeight: 1,
                    }}
                  >
                    ⋮
                  </button>

                  {activeMenu === index && (
                    <div
                      style={{
                        position: 'fixed',
                        top: menuPosition?.top ?? 0,
                        left: menuPosition?.left ?? 0,
                        width: 170,
                        backgroundColor: '#fff',
                        border: '1px solid #eee',
                        borderRadius: 8,
                        boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                        zIndex: 200,
                        overflow: 'hidden',
                      }}
                    >
                      {[
                        'Detayları Gör',
                        'Düzenle',
                        'Etkinlik Geçmişi',
                        'Mesaj Gönder',
                      ].map((action) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => {
                            if (action === 'Detayları Gör') {
                              localStorage.setItem('selectedVolunteerId', String(volunteer.id));
                              window.location.hash = `#profile/${volunteer.id}`;
                            }
                            setActiveMenu(null);
                          }}
                          style={{
                            width: '100%',
                            border: 'none',
                            backgroundColor: '#fff',
                            padding: '10px 12px',
                            textAlign: 'left',
                            fontSize: 12,
                            color: '#555',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.backgroundColor =
                              '#f7f9f9';
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.backgroundColor =
                              '#fff';
                          }}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            color: '#aaa',
            fontSize: 13,
          }}
        >
          {visibleVolunteers.length} kayıt gösteriliyor
          {pagination?.total !== undefined
            ? ` • Toplam ${pagination.total} gönüllü`
            : ''}
        </span>
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <button type="button" disabled={page === 1 || loading} onClick={() => setPage(current => current - 1)} style={paginationButtonStyle}>‹ Önceki</button>
            <span style={{ color: '#777', fontSize: 12 }}>{page} / {pagination.totalPages}</span>
            <button type="button" disabled={page === pagination.totalPages || loading} onClick={() => setPage(current => current + 1)} style={paginationButtonStyle}>Sonraki ›</button>
          </div>
        )}
      </div>
    </div>
  );
}

const paginationButtonStyle = {
  padding: '7px 11px',
  border: '1px solid #ddd',
  borderRadius: 7,
  backgroundColor: '#fff',
  color: '#555',
  cursor: 'pointer',
  fontSize: 12,
};
