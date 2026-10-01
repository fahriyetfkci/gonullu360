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

const EVENT_NAME_LINE_LENGTH = 16;

function splitEventName(value) {
  let remaining = String(value ?? '').trim();
  const lines = [];

  while (remaining && lines.length < 2) {
    if (remaining.length <= EVENT_NAME_LINE_LENGTH) {
      lines.push(remaining);
      remaining = '';
      break;
    }

    const candidate = remaining.slice(0, EVENT_NAME_LINE_LENGTH + 1);
    const lastSpace = candidate.lastIndexOf(' ');
    const splitAt = lastSpace > 0 ? lastSpace : EVENT_NAME_LINE_LENGTH;
    lines.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining && lines.length === 2) {
    lines[1] = `${lines[1].slice(0, EVENT_NAME_LINE_LENGTH - 1).trimEnd()}…`;
  }

  return lines;
}

function EventNameTick({ x, y, payload }) {
  const fullName = String(payload?.value ?? '');
  const lines = splitEventName(fullName);

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{fullName}</title>
      <text textAnchor="middle" fill="#666" fontSize={10}>
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 13 : 12}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

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
        {payload[0]?.payload?.name ?? label}
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
  const chartMinWidth = Math.max(420, safeData.length * 92);
  const largestCount = Math.max(...safeData.map((item) => Number(item.count) || 0), 0);
  const yAxisMaximum = Math.max(5, Math.ceil(largestCount / 5) * 5);
  const yAxisTicks = Array.from({ length: Math.floor(yAxisMaximum / 5) + 1 }, (_, index) => index * 5);

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
        Etkinlik Bazında Katılımcı Sayısı
      </p>

      {safeData.length === 0 ? <div className="dashboard-empty-chart"><strong>Katılım verisi bulunamadı</strong><span>Henüz bir etkinliğe katılımcı eklenmemiş.</span></div> : (
        <div style={{ display: 'flex', width: '100%', minWidth: 0 }}>
          <div style={{ width: 36, flex: '0 0 36px' }}>
            <ResponsiveContainer width="100%" height={235}>
              <BarChart data={safeData} margin={{ top: 10, right: 0, left: 0, bottom: 25 }}>
                <XAxis
                  dataKey="name"
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                  height={42}
                />
                <YAxis
                  domain={[0, yAxisMaximum]}
                  ticks={yAxisTicks}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={36}
                />
                <Bar
                  dataKey="count"
                  fill="transparent"
                  stroke="transparent"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }}>
            <div style={{ width: '100%', minWidth: chartMinWidth }}>
              <ResponsiveContainer width="100%" height={235}>
                <BarChart
                  data={safeData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 25,
                  }}
                >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f0f0f0"
            vertical={false}
          />

          <XAxis
            dataKey="name"
            tick={<EventNameTick />}
            axisLine={false}
            tickLine={false}
            interval={0}
            height={42}
          />

          <YAxis
            domain={[0, yAxisMaximum]}
            ticks={yAxisTicks}
            tick={false}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={0}
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
          </div>
        </div>
      )}
    </div>
  );
}
