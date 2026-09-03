import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "./VolunteerListPage.css";
import { getGroupedVolunteers } from '../services/api';
import './VolunteerPagination.css';

const PAGE_SIZE = 10;


export default function VolunteerListPage() {
  const [volunteerData, setVolunteerData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const [showFilters, setShowFilters] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedEducation, setSelectedEducation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [sortField, setSortField] = useState("applicationDate");
  const [sortDirection, setSortDirection] = useState("desc");

  // Filtreleme artık backend'de yapılıyor - bu state'lerden herhangi biri değişince
  // sadece kriterlere uyan veri çekiliyor, tüm liste indirilmiyor.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getGroupedVolunteers({
          search: searchText,
          status: selectedStatus,
          education: selectedEducation,
          startDate,
          endDate,
          page,
          limit: PAGE_SIZE,
        });
        const mapped = data.volunteers.map(v => ({
          key: v.key,
          id: v.key.startsWith('volunteer_') ? Number(v.key.replace('volunteer_', '')) : null,
          applicationId: v.key.startsWith('application_') ? Number(v.key.replace('application_', '')) : null,
          fullName: v.name,
          applicationDate: v.date,
          educationLevel: v.education,
          status: v.status,
        }));
        setVolunteerData(mapped);
        setTotalCount(data.pagination.total);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [searchText, selectedStatus, selectedEducation, startDate, endDate, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Artık sadece sıralama client-side yapılıyor - filtreleme backend'den geldiği için
  // burada tekrar filtrelemeye gerek yok.
  const sortedVolunteers = useMemo(() => {
    return [...volunteerData].sort((firstVolunteer, secondVolunteer) => {
      let comparison = 0;

      if (sortField === "fullName") {
        comparison = firstVolunteer.fullName.localeCompare(
          secondVolunteer.fullName,
          "tr-TR"
        );
      }

      if (sortField === "applicationDate") {
        comparison = firstVolunteer.applicationDate.localeCompare(
          secondVolunteer.applicationDate
        );
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [volunteerData, sortField, sortDirection]);

  const clearFilters = () => {
    setSearchText("");
    setSelectedStatus("");
    setSelectedEducation("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setActiveMenuId(null);
  };

  const handleSort = (fieldName) => {
    if (sortField === fieldName) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setSortField(fieldName);
      setSortDirection("asc");
    }

    setActiveMenuId(null);
  };

  const getSortIcon = (fieldName) => {
    if (sortField !== fieldName) {
      return "↕";
    }

    return sortDirection === "asc" ? "↑" : "↓";
  };

  const getStatusClass = (status) => {
    if (status === "Aktif Gönüllü") {
      return "status-badge status-active";
    }

    if (status === "Reddedildi") {
      return "status-badge status-rejected";
    }

    return "status-badge status-pending";
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "—";
    const [year, month, day] = String(dateValue).slice(0, 10).split("-");
    if (!year || !month || !day) return String(dateValue);
    return `${day}.${month}.${year}`;
  };

  const getInitials = (fullName) => {
    return fullName
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toLocaleUpperCase("tr-TR");
  };

  const handleAction = (actionName, volunteer) => {
    if (actionName === "Detayları Gör" && volunteer.id) {
      localStorage.setItem("selectedVolunteerId", String(volunteer.id));
      window.location.hash = `#profile/${volunteer.id}`;
    } else if (actionName === "Detayları Gör" && volunteer.applicationId) {
      window.location.hash = `#application/${volunteer.applicationId}`;
    }
    setActiveMenuId(null);
  };

  return (
    <div className="volunteer-page" onClick={() => setActiveMenuId(null)}>
      <Sidebar />

      <div className="volunteer-content">
        <Navbar />

        <main className="volunteer-main">
          <h1>Gönüllü Listesi</h1>

          <section className="hero-card">
            <h2>Gönüllü Gruplama</h2>

            <p>
              Gönüllü başvurularını inceleyebilir, filtreleyebilir ve
              yönetebilirsiniz.
            </p>

            <div className="volunteer-toolbar">
              <button
                className="filter-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowFilters(!showFilters);
                  setActiveMenuId(null);
                }}
              >
                {showFilters ? "Filtreyi Gizle" : "Filtrele"}
              </button>

              <div className="search-box">
                <span className="search-icon">🔍</span>

                <input
                  type="text"
                  placeholder="İsim, eğitim veya durum ara..."
                  value={searchText}
                  onChange={(event) => {
                    setSearchText(event.target.value);
                    setPage(1);
                    setActiveMenuId(null);
                  }}
                />
              </div>
            </div>
          </section>

          {showFilters && (
            <section className="filter-panel">
              <div className="filter-group">
                <label htmlFor="status-filter">Başvuru Durumu</label>

                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(event) => {
                    setSelectedStatus(event.target.value);
                    setPage(1);
                    setActiveMenuId(null);
                  }}
                >
                  <option value="">Tümü</option>
                  <option value="İşlem Bekliyor">İşlem Bekliyor</option>
                  <option value="Aktif Gönüllü">Aktif Gönüllü</option>
                  <option value="Reddedildi">Reddedildi</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="education-filter">Eğitim Düzeyi</label>

                <select
                  id="education-filter"
                  value={selectedEducation}
                  onChange={(event) => {
                    setSelectedEducation(event.target.value);
                    setPage(1);
                    setActiveMenuId(null);
                  }}
                >
                  <option value="">Tümü</option>
                  <option value="Lise">Lise</option>
                  <option value="Üniversite">Üniversite</option>
                  <option value="Lisans">Lisans</option>
                  <option value="Yüksek Lisans">Yüksek Lisans</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="start-date">Başlangıç Tarihi</label>

                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPage(1);
                    setActiveMenuId(null);
                  }}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="end-date">Bitiş Tarihi</label>

                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setPage(1);
                    setActiveMenuId(null);
                  }}
                />
              </div>

              <div className="filter-actions">
                <button
                  className="clear-filter-button"
                  type="button"
                  onClick={clearFilters}
                >
                  Temizle
                </button>

                <button
                  className="apply-filter-button"
                  type="button"
                  onClick={() => {
                    setShowFilters(false);
                    setActiveMenuId(null);
                  }}
                >
                  Filtreleri Uygula
                </button>
              </div>
            </section>
          )}

          <section className="volunteer-table-card">
            <div className="table-header-area">
              <div>
                <h2>Gönüllüler</h2>

                <p>
                  Toplam {totalCount} gönüllü gösteriliyor.
                </p>
              </div>

              <button
                className="table-clear-button"
                type="button"
                onClick={clearFilters}
              >
                Filtreleri Temizle
              </button>
            </div>

            <div className="table-wrapper">
              <table className="volunteer-table">
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        onClick={() => handleSort("fullName")}
                        style={sortButtonStyle}
                        title="Ad soyada göre sırala"
                      >
                        Adı Soyadı {getSortIcon("fullName")}
                      </button>
                    </th>

                    <th>
                      <button
                        type="button"
                        onClick={() => handleSort("applicationDate")}
                        style={sortButtonStyle}
                        title="Başvuru tarihine göre sırala"
                      >
                        Başvuru Tarihi {getSortIcon("applicationDate")}
                      </button>
                    </th>

                    <th>Eğitim Düzeyi</th>
                    <th>Başvuru Durumu</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedVolunteers.map((volunteer) => (
                    <tr key={volunteer.key}>
                      <td>
                        <div className="volunteer-name-cell">
                          <div className="volunteer-avatar">
                            {getInitials(volunteer.fullName)}
                          </div>

                          <span>{volunteer.fullName}</span>
                        </div>
                      </td>

                      <td>{formatDate(volunteer.applicationDate)}</td>

                      <td>{volunteer.educationLevel}</td>

                      <td>
                        <span className={getStatusClass(volunteer.status)}>
                          <span className="status-dot"></span>
                          {volunteer.status}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            position: "relative",
                            display: "inline-block",
                          }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            aria-label={`${volunteer.fullName} için işlemler`}
                            onClick={(event) => {
                              if (activeMenuId === volunteer.key) {
                                setActiveMenuId(null);
                                setMenuPosition(null);
                                return;
                              }
                              const rect = event.currentTarget.getBoundingClientRect();
                              const menuHeight = 132;
                              const openUpward = window.innerHeight - rect.bottom < menuHeight + 12;
                              setMenuPosition({
                                top: openUpward ? rect.top - menuHeight - 6 : rect.bottom + 6,
                                left: Math.max(8, rect.right - 150),
                              });
                              setActiveMenuId(volunteer.key);
                            }}
                            style={{
                              width: "34px",
                              height: "34px",
                              border: "1px solid #e7e7e7",
                              borderRadius: "8px",
                              backgroundColor:
                                activeMenuId === volunteer.key
                                  ? "#f0faf6"
                                  : "#ffffff",
                              color: "#555",
                              fontSize: "20px",
                              lineHeight: 1,
                              cursor: "pointer",
                            }}
                          >
                            ⋮
                          </button>

                          {activeMenuId === volunteer.key && (
                            <div
                              style={{
                                position: "fixed",
                                top: menuPosition?.top ?? 0,
                                left: menuPosition?.left ?? 0,
                                width: "150px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #eeeeee",
                                borderRadius: "10px",
                                boxShadow:
                                  "0 8px 24px rgba(0, 0, 0, 0.12)",
                                overflow: "hidden",
                                zIndex: 50,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleAction("Detayları Gör", volunteer)
                                }
                                style={menuButtonStyle}
                              >
                                Detayları Gör
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleAction("Düzenle", volunteer)
                                }
                                style={menuButtonStyle}
                              >
                                Düzenle
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleAction("Sil", volunteer)
                                }
                                style={{
                                  ...menuButtonStyle,
                                  color: "#d63031",
                                }}
                              >
                                Sil
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sortedVolunteers.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">🔎</div>

                  <h3>Gönüllü bulunamadı</h3>

                  <p>
                    Arama veya filtreleme şartlarını değiştirerek tekrar
                    deneyebilirsiniz.
                  </p>

                  <button type="button" onClick={clearFilters}>
                    Filtreleri Temizle
                  </button>
                </div>
              )}
            </div>
            {totalCount > PAGE_SIZE && (
              <div className="volunteer-pagination">
                <span>{Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}–{Math.min(page * PAGE_SIZE, totalCount)} / {totalCount} kayıt</span>
                <div className="pagination-controls">
                  <button type="button" disabled={page === 1} onClick={() => setPage(current => current - 1)}>‹ Önceki</button>
                  {getVisiblePages(page, totalPages).map((item, index) => item === 'ellipsis'
                    ? <span className="pagination-ellipsis" key={`ellipsis-${index}`}>…</span>
                    : <button type="button" className={item === page ? 'active' : ''} key={item} onClick={() => setPage(item)}>{item}</button>)}
                  <button type="button" disabled={page === totalPages} onClick={() => setPage(current => current + 1)}>Sonraki ›</button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = [1];
  if (currentPage > 4) pages.push('ellipsis');
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) pages.push(pageNumber);
  if (currentPage < totalPages - 3) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

const sortButtonStyle = {
  border: "none",
  backgroundColor: "transparent",
  padding: 0,
  color: "inherit",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};

const menuButtonStyle = {
  width: "100%",
  border: "none",
  borderBottom: "1px solid #f1f1f1",
  backgroundColor: "#ffffff",
  padding: "11px 13px",
  textAlign: "left",
  color: "#444",
  fontSize: "13px",
  cursor: "pointer",
};
