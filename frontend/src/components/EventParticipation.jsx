import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
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
        padding: '10px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <p
        style={{
          margin: '0 0 5px',
          fontSize: 13,
          fontWeight: 600,
          color: '#333',
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: '#6c5ce7',
        }}
      >
        Katılımcı: {payload[0].value}
      </p>
    </div>
  );
}

export default function EventParticipation({ data }) {
  const safeData = data || [];

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
        Etkinlik Katılım Oranları
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={safeData}
          margin={{
            top: 10,
            right: 10,
            left: -15,
            bottom: 10,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f0f0f0"
            vertical={false}
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

          <Tooltip content={<CustomTooltip />} />

          <Bar
            dataKey="count"
            name="Katılımcı"
            fill="#6c5ce7"
            radius={[5, 5, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}