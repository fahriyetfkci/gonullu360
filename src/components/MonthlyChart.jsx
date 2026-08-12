import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const COLORS = {
  general: '#00b894',
  male: '#0984e3',
  female: '#e84393',
  region: '#6c5ce7',
};

const cities = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Kocaeli',
  'Bursa',
  'Sivas',
  'Antalya',
  'Konya',
];

function CustomTooltip({ active, payload, label, viewMode }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #eee',
        borderRadius: 8,
        padding: '10px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <p
        style={{
          margin: '0 0 6px',
          fontSize: 13,
          fontWeight: 600,
          color: '#333',
        }}
      >
        {viewMode === 'aylık' ? `${label}` : `${label} yılı`}
      </p>

      {payload.map((item) => (
        <p
          key={item.dataKey}
          style={{
            margin: '3px 0',
            fontSize: 12,
            color: item.color,
          }}
        >
          {item.dataKey}: {item.value}
        </p>
      ))}
    </div>
  );
}

export default function MonthlyChart({
  data,
  year,
  onYearChange,
  allYearsData,
}) {
  const [filter, setFilter] = useState('genel');
  const [viewMode, setViewMode] = useState('aylık');
  const [selectedCity, setSelectedCity] = useState('İstanbul');

  const safeMonthlyData = data?.data || [];

  const getMonthlyChartData = () => {
    return safeMonthlyData.map((item) => {
      if (filter === 'genel') {
        return {
          name: item.month,
          Genel: item.genel,
        };
      }

      if (filter === 'bölge') {
        return {
          name: item.month,
          [selectedCity]: item.bölge?.[selectedCity] || 0,
        };
      }

      return {
        name: item.month,
        Erkek: item.cinsiyet?.Erkek || 0,
        Kadın: item.cinsiyet?.Kadın || 0,
      };
    });
  };

  const getYearlyChartData = () => {
    if (!allYearsData) {
      return [];
    }

    return [2024, 2025, 2026].map((selectedYear) => {
      const yearData =
        allYearsData[selectedYear]?.monthlyVolunteers?.data || [];

      if (filter === 'genel') {
        return {
          name: String(selectedYear),
          Genel: yearData.reduce(
            (sum, month) => sum + (month.genel || 0),
            0
          ),
        };
      }

      if (filter === 'bölge') {
        return {
          name: String(selectedYear),
          [selectedCity]: yearData.reduce(
            (sum, month) =>
              sum + (month.bölge?.[selectedCity] || 0),
            0
          ),
        };
      }

      return {
        name: String(selectedYear),
        Erkek: yearData.reduce(
          (sum, month) =>
            sum + (month.cinsiyet?.Erkek || 0),
          0
        ),
        Kadın: yearData.reduce(
          (sum, month) =>
            sum + (month.cinsiyet?.Kadın || 0),
          0
        ),
      };
    });
  };

  const chartData =
    viewMode === 'aylık'
      ? getMonthlyChartData()
      : getYearlyChartData();

  const lines =
    filter === 'genel'
      ? ['Genel']
      : filter === 'bölge'
        ? [selectedCity]
        : ['Erkek', 'Kadın'];

  const getLineColor = (line) => {
    if (line === 'Genel') return COLORS.general;
    if (line === 'Erkek') return COLORS.male;
    if (line === 'Kadın') return COLORS.female;
    return COLORS.region;
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        flex: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            margin: 0,
            color: '#333',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Toplam Gönüllü Sayısı
        </p>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          {viewMode === 'aylık' && (
            <select
              value={year}
              onChange={(event) =>
                onYearChange(Number(event.target.value))
              }
              style={{
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 13,
                color: '#555',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          )}

          <div
            style={{
              display: 'flex',
              border: '1px solid #ddd',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {['aylık', 'yıllık'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor:
                    viewMode === mode ? '#00b894' : '#fff',
                  color:
                    viewMode === mode ? '#fff' : '#555',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {mode === 'aylık' ? 'Aylık' : 'Yıllık'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtre butonları */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            border: '1px solid #00b894',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {[
            { key: 'genel', label: 'Genel' },
            { key: 'bölge', label: 'Bölge' },
            { key: 'cinsiyet', label: 'Cinsiyet' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              style={{
                padding: '6px 16px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor:
                  filter === item.key ? '#00b894' : '#fff',
                color:
                  filter === item.key ? '#fff' : '#00b894',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filter === 'bölge' && (
          <select
            value={selectedCity}
            onChange={(event) =>
              setSelectedCity(event.target.value)
            }
            style={{
              border: '1px solid #ddd',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 13,
              color: '#555',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        )}
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f0f0f0"
          />

          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />

          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />

          <Tooltip
            content={
              <CustomTooltip viewMode={viewMode} />
            }
          />

          {filter !== 'genel' && <Legend />}

          {lines.map((line) => {
            const lineColor = getLineColor(line);

            return (
              <Line
                key={line}
                type="monotone"
                dataKey={line}
                stroke={lineColor}
                strokeWidth={2}
                dot={{
                  r: 3,
                  fill: lineColor,
                }}
                activeDot={{
                  r: 6,
                  fill: '#fff',
                  stroke: lineColor,
                  strokeWidth: 2,
                }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}