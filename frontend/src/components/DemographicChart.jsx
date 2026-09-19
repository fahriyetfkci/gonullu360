import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #eee',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <p
        style={{
          fontWeight: 600,
          margin: '0 0 6px',
          color: '#333',
        }}
      >
        Yaş grubu: {label}
      </p>

      {payload.map((item) => (
        <p
          key={item.dataKey}
          style={{
            color: item.color,
            margin: '3px 0',
          }}
        >
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  );
}

export default function DemographicChart({ data }) {
  const [filter, setFilter] = useState('genel');

  const safeData = data || [];

  const chartData = safeData.map((item) => ({
    name: item.ageGroup,
    Bölge: item.bölge || 0,
    Erkek: item.cinsiyet?.Erkek || 0,
    Kadın: item.cinsiyet?.Kadın || 0,
    Aktif: item.aktif || 0,
  }));

  const bars =
    filter === 'genel'
      ? ['Bölge', 'Erkek', 'Kadın', 'Aktif']
      : filter === 'Cinsiyet'
        ? ['Erkek', 'Kadın']
        : [filter];

  const colors = {
    Bölge: '#6c5ce7',
    Erkek: '#0984e3',
    Kadın: '#e84393',
    Aktif: '#00b894',
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        flex: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <p
        style={{
          color: '#333',
          fontWeight: 600,
          fontSize: 14,
          margin: '0 0 16px',
        }}
      >
        Demografik Gönüllü Dağılımı
      </p>

      {/* Filtre butonları */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {[
          { key: 'genel', label: 'Genel' },
          { key: 'Bölge', label: 'Bölge' },
          { key: 'Cinsiyet', label: 'Cinsiyet' },
          { key: 'Aktif', label: 'Aktif' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            style={{
              padding: '5px 11px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor:
                filter === item.key ? '#00b894' : '#f0f0f0',
              color:
                filter === item.key ? '#fff' : '#555',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: -20,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f0f0f0"
            vertical={false}
          />

          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{
              fontSize: 12,
              paddingTop: 8,
            }}
          />

          {bars.map((bar) => (
            <Bar
              key={bar}
              dataKey={bar}
              name={bar}
              fill={colors[bar]}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}