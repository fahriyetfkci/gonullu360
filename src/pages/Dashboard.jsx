import React, { useEffect, useState } from 'react';

import {
  getDashboardStats,
  getNotifications,
  getUser,
  getAllYearsStats,
} from '../services/api';

import ActiveVolunteers from '../components/ActiveVolunteers';
import CompletedEvents from '../components/CompletedEvents';
import MonthlyChart from '../components/MonthlyChart';
import EventParticipation from '../components/EventParticipation';
import DemographicChart from '../components/DemographicChart';
import VolunteerList from '../components/VolunteerList';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const demoStats = {
  activeVolunteers: {
    total: 567,
    regular: 420,
    lowParticipation: 147,
  },

  completedEvents: {
    rate: 88,
    target: 17,
    total: 15,
  },

  monthlyVolunteers: {
    data: [
      {
        month: 'Ocak',
        genel: 35,
        bölge: {
          İstanbul: 15,
          Ankara: 8,
          İzmir: 6,
        },
        cinsiyet: {
          Erkek: 18,
          Kadın: 17,
        },
      },
      {
        month: 'Şubat',
        genel: 42,
        bölge: {
          İstanbul: 19,
          Ankara: 10,
          İzmir: 7,
        },
        cinsiyet: {
          Erkek: 20,
          Kadın: 22,
        },
      },
      {
        month: 'Mart',
        genel: 55,
        bölge: {
          İstanbul: 25,
          Ankara: 12,
          İzmir: 10,
        },
        cinsiyet: {
          Erkek: 26,
          Kadın: 29,
        },
      },
      {
        month: 'Nisan',
        genel: 48,
        bölge: {
          İstanbul: 21,
          Ankara: 11,
          İzmir: 9,
        },
        cinsiyet: {
          Erkek: 23,
          Kadın: 25,
        },
      },
      {
        month: 'Mayıs',
        genel: 64,
        bölge: {
          İstanbul: 30,
          Ankara: 14,
          İzmir: 11,
        },
        cinsiyet: {
          Erkek: 31,
          Kadın: 33,
        },
      },
      {
        month: 'Haziran',
        genel: 72,
        bölge: {
          İstanbul: 34,
          Ankara: 16,
          İzmir: 12,
        },
        cinsiyet: {
          Erkek: 35,
          Kadın: 37,
        },
      },
      {
        month: 'Temmuz',
        genel: 58,
        bölge: {
          İstanbul: 26,
          Ankara: 13,
          İzmir: 10,
        },
        cinsiyet: {
          Erkek: 28,
          Kadın: 30,
        },
      },
      {
        month: 'Ağustos',
        genel: 67,
        bölge: {
          İstanbul: 31,
          Ankara: 15,
          İzmir: 12,
        },
        cinsiyet: {
          Erkek: 32,
          Kadın: 35,
        },
      },
      {
        month: 'Eylül',
        genel: 80,
        bölge: {
          İstanbul: 38,
          Ankara: 18,
          İzmir: 14,
        },
        cinsiyet: {
          Erkek: 39,
          Kadın: 41,
        },
      },
      {
        month: 'Ekim',
        genel: 74,
        bölge: {
          İstanbul: 35,
          Ankara: 17,
          İzmir: 13,
        },
        cinsiyet: {
          Erkek: 36,
          Kadın: 38,
        },
      },
      {
        month: 'Kasım',
        genel: 88,
        bölge: {
          İstanbul: 42,
          Ankara: 20,
          İzmir: 15,
        },
        cinsiyet: {
          Erkek: 43,
          Kadın: 45,
        },
      },
      {
        month: 'Aralık',
        genel: 95,
        bölge: {
          İstanbul: 45,
          Ankara: 22,
          İzmir: 17,
        },
        cinsiyet: {
          Erkek: 46,
          Kadın: 49,
        },
      },
    ],
  },

  eventParticipation: [
    {
      name: 'Gönüllü Buluşması',
      count: 210,
    },
    {
      name: 'Kitap Tahlili',
      count: 145,
    },
    {
      name: 'STK Zirvesi',
      count: 275,
    },
    {
      name: 'Kahvaltı Buluşması',
      count: 180,
    },
    {
      name: 'Medya Eğitimi',
      count: 235,
    },
  ],

  demographicData: [
    {
      ageGroup: '17-25',
      bölge: 48,
      cinsiyet: {
        Erkek: 25,
        Kadın: 23,
      },
      aktif: 40,
    },
    {
      ageGroup: '25-35',
      bölge: 35,
      cinsiyet: {
        Erkek: 18,
        Kadın: 17,
      },
      aktif: 30,
    },
    {
      ageGroup: '35-45',
      bölge: 22,
      cinsiyet: {
        Erkek: 12,
        Kadın: 10,
      },
      aktif: 18,
    },
    {
      ageGroup: '45+',
      bölge: 12,
      cinsiyet: {
        Erkek: 7,
        Kadın: 5,
      },
      aktif: 9,
    },
  ],

  volunteers: [
    {
      date: '04.12.2024',
      name: 'Fazıl Demir',
      city: 'İzmir',
      gender: 'Erkek',
      age: 21,
    },
    {
      date: '04.12.2024',
      name: 'Erkan Cihan',
      city: 'Sivas',
      gender: 'Erkek',
      age: 22,
    },
    {
      date: '06.12.2024',
      name: 'Ahmet Pak',
      city: 'İstanbul',
      gender: 'Erkek',
      age: 26,
    },
    {
      date: '08.12.2024',
      name: 'Merve Gürel',
      city: 'Kocaeli',
      gender: 'Kadın',
      age: 22,
    },
    {
      date: '08.12.2024',
      name: 'Kazım Sorguç',
      city: 'Ankara',
      gender: 'Erkek',
      age: 28,
    },
    {
      date: '08.12.2024',
      name: 'Ali Yürekli',
      city: 'İstanbul',
      gender: 'Erkek',
      age: 24,
    },
  ],

  pagination: {
    total: 6,
  },
};

const demoAllYearsData = {
  2024: demoStats,
  2025: demoStats,
  2026: demoStats,
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [allYearsData, setAllYearsData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [year, setYear] = useState(2026);
  const [loading, setLoading] = useState(true);

  // Kullanıcı, bildirim ve tüm yılların verilerini getirir.
  useEffect(() => {
    const fetchGeneralData = async () => {
      try {
        const [notificationData, userData, yearsData] =
          await Promise.all([
            getNotifications(1),
            getUser(1),
            getAllYearsStats(),
          ]);

        setNotifications(
          notificationData?.notifications || []
        );

        setUser(userData?.user || null);
        setAllYearsData(yearsData || null);
      } catch (error) {
        console.error(
          'Genel veriler alınamadı:',
          error
        );
      }
    };

    fetchGeneralData();
  }, []);

  // Seçilen yıla ait dashboard verilerini getirir.
  useEffect(() => {
    const fetchYearData = async () => {
      setLoading(true);

      try {
        const statsData =
          await getDashboardStats(year);

        setStats(statsData);
      } catch (error) {
        console.error(
          'Dashboard verileri alınamadı:',
          error
        );

        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchYearData();
  }, [year]);

  const displayedStats = stats || demoStats;

  const displayedAllYearsData =
    allYearsData || demoAllYearsData;

  if (loading && !stats) {
    return (
      <div
        style={{
          padding: 40,
          fontFamily: 'Arial, sans-serif',
          color: '#666',
        }}
      >
        Yükleniyor...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#f5f6fa',
        overflow: 'hidden',
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Navbar
          user={user}
          notifications={notifications}
        />

        <main
          style={{
            width: '100%',
            padding: 24,
            boxSizing: 'border-box',
            overflowX: 'hidden',
          }}
        >
          {/* Sayfa başlığı */}
          <div
            style={{
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                margin: 0,
                color: '#333',
                fontSize: 22,
              }}
            >
              Anasayfa

              <span
                style={{
                  marginLeft: 8,
                  fontSize: 14,
                  color: '#888',
                  fontWeight: 400,
                }}
              >
                | Hoş Geldin!
              </span>
            </h2>
          </div>

          {/* Üst kartlar */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginBottom: 24,
              flexWrap: 'wrap',
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                flex: '1 1 240px',
                minWidth: 220,
                display: 'flex',
              }}
            >
              <ActiveVolunteers
                data={
                  displayedStats.activeVolunteers
                }
              />
            </div>

            <div
              style={{
                flex: '1 1 240px',
                minWidth: 220,
                display: 'flex',
              }}
            >
              <CompletedEvents
                data={
                  displayedStats.completedEvents
                }
              />
            </div>

            <div
              style={{
                flex: '2 1 460px',
                minWidth: 300,
              }}
            >
              <MonthlyChart
                data={
                  displayedStats.monthlyVolunteers
                }
                year={year}
                onYearChange={setYear}
                allYearsData={
                  displayedAllYearsData
                }
              />
            </div>
          </div>

          {/* Alt grafikler */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginBottom: 24,
              flexWrap: 'wrap',
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                flex: '1 1 460px',
                minWidth: 300,
              }}
            >
              <EventParticipation
                data={
                  displayedStats.eventParticipation
                }
              />
            </div>

            <div
              style={{
                flex: '1 1 360px',
                minWidth: 300,
              }}
            >
              <DemographicChart
                data={
                  displayedStats.demographicData
                }
              />
            </div>
          </div>

          {/* Gönüllü listesi */}
          <VolunteerList
            volunteers={
              displayedStats.volunteers
            }
            pagination={
              displayedStats.pagination
            }
          />
        </main>
      </div>
    </div>
  );
}