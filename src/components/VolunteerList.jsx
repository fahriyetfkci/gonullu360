import React, { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 5;

export default function VolunteerList({
  volunteers: initialVolunteers = [],
  pagination: initialPagination = { total: 0 },
}) {
  const [volunteers, setVolunteers] = useState(initialVolunteers);

  const [searchText, setSearchText] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedAge, setSelectedAge] = useState('');

  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    setVolunteers(initialVolunteers || []);
  }, [initialVolunteers]);

  const handleShowAll = () => {
    window.location.hash = 'volunteers';
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedCity('');
    setSelectedGender('');
    setSelectedAge('');
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

  const cities = useMemo(() => {
    return [
      ...new Set(
        volunteers
          .map((volunteer) => volunteer.city)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [volunteers]);

  const filteredVolunteers = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLocaleLowerCase('tr-TR');

    return volunteers.filter((volunteer) => {
      const volunteerName = (volunteer.name || '')
        .toLocaleLowerCase('tr-TR');

      const matchesSearch =
        normalizedSearch === '' ||
        volunteerName.includes(normalizedSearch);

      const matchesCity =
        selectedCity === '' ||
        volunteer.city === selectedCity;

      const matchesGender =
        selectedGender === '' ||
        volunteer.gender === selectedGender;

      let matchesAge = true;
      const age = Number(volunteer.age);

      if (selectedAge === '17-25') {
        matchesAge = age >= 17 && age <= 25;
      } else if (selectedAge === '26-35') {
        matchesAge = age >= 26 && age <= 35;
      } else if (selectedAge === '36-45') {
        matchesAge = age >= 36 && age <= 45;
      } else if (selectedAge === '46+') {
        matchesAge = age >= 46;
      }

      return (
        matchesSearch &&
        matchesCity &&
        matchesGender &&
        matchesAge
      );
    });
  }, [
    volunteers,
    searchText,
    selectedCity,
    selectedGender,
    selectedAge,
  ]);

  const visibleVolunteers = filteredVolunteers.slice(0, PAGE_SIZE);

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

          {visibleVolunteers.length === 0 ? (
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
                  {volunteer.date}
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
                    onClick={() =>
                      setActiveMenu(
                        activeMenu === index ? null : index
                      )
                    }
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
                        position: 'absolute',
                        top: 32,
                        right: 0,
                        width: 170,
                        backgroundColor: '#fff',
                        border: '1px solid #eee',
                        borderRadius: 8,
                        boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                        zIndex: 30,
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
                            console.log(
                              `${action}: ${volunteer.name}`
                            );
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
          {initialPagination?.total
            ? ` • Toplam ${initialPagination.total} gönüllü`
            : ''}
        </span>

        <button
          type="button"
          onClick={handleShowAll}
          style={{
            border: '1px solid #00b894',
            borderRadius: 6,
            padding: '6px 10px',
            backgroundColor: '#fff',
            color: '#00a884',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Tüm gönüllüleri aç
        </button>
      </div>
    </div>
  );
}