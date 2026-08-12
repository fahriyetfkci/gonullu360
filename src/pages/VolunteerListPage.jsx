import React, { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "./VolunteerListPage.css";

const volunteerData = [
  {
    id: 4,
    fullName: "Ayşe Yılmaz",
    applicationDate: "2026-06-12",
    educationLevel: "Üniversite",
    status: "İşlem Bekliyor",
  },
  {
    id: 5,
    fullName: "Mehmet Kaya",
    applicationDate: "2026-06-15",
    educationLevel: "Lise",
    status: "İşlem Bekliyor",
  },
  {
    id: 6,
    fullName: "Zeynep Demir",
    applicationDate: "2026-06-18",
    educationLevel: "Mezun",
    status: "Aktif Gönüllü",
  },
  {
    id: 7,
    fullName: "Ali Çetin",
    applicationDate: "2026-06-21",
    educationLevel: "Üniversite",
    status: "Aktif Gönüllü",
  },
  {
    id: 8,
    fullName: "Elif Aydın",
    applicationDate: "2026-06-24",
    educationLevel: "Ortaokul",
    status: "Reddedildi",
  },
  {
    id: 9,
    fullName: "Mert Arslan",
    applicationDate: "2026-07-02",
    educationLevel: "Lise",
    status: "Aktif Gönüllü",
  },
  {
    id: 10,
    fullName: "Sena Koç",
    applicationDate: "2026-07-08",
    educationLevel: "Mezun",
    status: "İşlem Bekliyor",
  },
];

export default function VolunteerListPage() {
  const [showFilters, setShowFilters] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedEducation, setSelectedEducation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [sortField, setSortField] = useState("applicationDate");
  const [sortDirection, setSortDirection] = useState("desc");

  const filteredAndSortedVolunteers = useMemo(() => {
    const filtered = volunteerData.filter((volunteer) => {
      const searchableText = `
        ${volunteer.fullName}
        ${volunteer.educationLevel}
        ${volunteer.status}
      `.toLocaleLowerCase("tr-TR");

      const matchesSearch = searchableText.includes(
        searchText.trim().toLocaleLowerCase("tr-TR")
      );

      const matchesStatus =
        selectedStatus === "" || volunteer.status === selectedStatus;

      const matchesEducation =
        selectedEducation === "" ||
        volunteer.educationLevel === selectedEducation;

      const matchesStartDate =
        startDate === "" || volunteer.applicationDate >= startDate;

      const matchesEndDate =
        endDate === "" || volunteer.applicationDate <= endDate;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesEducation &&
        matchesStartDate &&
        matchesEndDate
      );
    });

    return [...filtered].sort((firstVolunteer, secondVolunteer) => {
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
  }, [
    searchText,
    selectedStatus,
    selectedEducation,
    startDate,
    endDate,
    sortField,
    sortDirection,
  ]);

  const clearFilters = () => {
    setSearchText("");
    setSelectedStatus("");
    setSelectedEducation("");
    setStartDate("");
    setEndDate("");
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
    const [year, month, day] = dateValue.split("-");
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

  const openVolunteerProfile = (volunteer) => {
    localStorage.setItem(
      "selectedVolunteer",
      JSON.stringify(volunteer)
    );

    window.location.hash = "#profile";
  };

  return (
    <div className="volunteer-page">
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
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? "Filtreyi Gizle" : "Filtrele"}
              </button>

              <div className="search-box">
                <span className="search-icon">🔍</span>

                <input
                  type="text"
                  placeholder="İsim, eğitim veya durum ara..."
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(event.target.value)
                  }
                />
              </div>
            </div>
          </section>

          {showFilters && (
            <section className="filter-panel">
              <div className="filter-group">
                <label htmlFor="status-filter">
                  Başvuru Durumu
                </label>

                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value)
                  }
                >
                  <option value="">Tümü</option>
                  <option value="İşlem Bekliyor">
                    İşlem Bekliyor
                  </option>
                  <option value="Aktif Gönüllü">
                    Aktif Gönüllü
                  </option>
                  <option value="Reddedildi">
                    Reddedildi
                  </option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="education-filter">
                  Eğitim Düzeyi
                </label>

                <select
                  id="education-filter"
                  value={selectedEducation}
                  onChange={(event) =>
                    setSelectedEducation(event.target.value)
                  }
                >
                  <option value="">Tümü</option>
                  <option value="Ortaokul">Ortaokul</option>
                  <option value="Lise">Lise</option>
                  <option value="Üniversite">
                    Üniversite
                  </option>
                  <option value="Mezun">Mezun</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="start-date">
                  Başlangıç Tarihi
                </label>

                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                />
              </div>

              <div className="filter-group">
                <label htmlFor="end-date">
                  Bitiş Tarihi
                </label>

                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
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
                  onClick={() => setShowFilters(false)}
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
                  Toplam {filteredAndSortedVolunteers.length} gönüllü
                  gösteriliyor.
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
                        onClick={() =>
                          handleSort("applicationDate")
                        }
                        style={sortButtonStyle}
                        title="Başvuru tarihine göre sırala"
                      >
                        Başvuru Tarihi{" "}
                        {getSortIcon("applicationDate")}
                      </button>
                    </th>

                    <th>Eğitim Düzeyi</th>
                    <th>Başvuru Durumu</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAndSortedVolunteers.map(
                    (volunteer) => (
                      <tr
                        key={volunteer.id}
                        onClick={() =>
                          openVolunteerProfile(volunteer)
                        }
                        style={{
                          cursor: "pointer",
                        }}
                        title={`${volunteer.fullName} profilini görüntüle`}
                      >
                        <td>
                          <div className="volunteer-name-cell">
                            <div className="volunteer-avatar">
                              {getInitials(
                                volunteer.fullName
                              )}
                            </div>

                            <span>
                              {volunteer.fullName}
                            </span>
                          </div>
                        </td>

                        <td>
                          {formatDate(
                            volunteer.applicationDate
                          )}
                        </td>

                        <td>
                          {volunteer.educationLevel}
                        </td>

                        <td>
                          <span
                            className={getStatusClass(
                              volunteer.status
                            )}
                          >
                            <span className="status-dot" />
                            {volunteer.status}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              {filteredAndSortedVolunteers.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    🔎
                  </div>

                  <h3>Gönüllü bulunamadı</h3>

                  <p>
                    Arama veya filtreleme şartlarını
                    değiştirerek tekrar deneyebilirsiniz.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
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