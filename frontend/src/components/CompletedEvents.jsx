import React, { useState } from 'react';

export default function CompletedEvents({ data }) {
  const [isHovered, setIsHovered] = useState(false);

  const remaining = Math.max(data.target - data.total, 0);

  const yearlyIncrease = data.yearlyIncrease ?? 0;
  const yearlyTrendIcon = yearlyIncrease > 0 ? '↑' : yearlyIncrease < 0 ? '↓' : '—';
  const yearlyTrendText = yearlyIncrease > 0
    ? `Geçen yıla göre ${yearlyIncrease} etkinlik daha fazla tamamlandı.`
    : yearlyIncrease < 0
      ? `Geçen yıla göre ${Math.abs(yearlyIncrease)} etkinlik daha az tamamlandı.`
      : 'Tamamlanan etkinlik sayısı geçen yılla aynı.';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        flex: 1,
         width: '100%',
  height: '100%',
  boxSizing: 'border-box',
        boxShadow: isHovered
          ? '0 10px 24px rgba(0,0,0,0.10)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: isHovered
          ? 'translateY(-3px)'
          : 'translateY(0)',
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <p
        style={{
          color: '#888',
          fontSize: 13,
          margin: '0 0 16px',
          alignSelf: 'flex-start',
        }}
      >
        Tamamlanmış Etkinlikler
      </p>

      {/* Daire grafik */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `conic-gradient(
            #00b894 ${data.rate * 3.6}deg,
            #e9ecef 0deg
          )`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: '50%',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 24,
              color: '#00b894',
            }}
          >
            %{data.rate}
          </span>

          <span
            style={{
              fontSize: 11,
              color: '#999',
            }}
          >
            Başarı
          </span>
        </div>
      </div>

      <p
        style={{
          fontWeight: 600,
          fontSize: 15,
          color: '#333',
          margin: '0 0 6px',
        }}
      >
        {data.rate >= 80
          ? 'Başarılı Görünüyor!'
          : 'Devam Ediyor'}
      </p>

      <p
        style={{
          fontSize: 13,
          color: '#666',
          textAlign: 'center',
          margin: '0 0 12px',
        }}
      >
        {data.total} / {data.target} etkinlik tamamlandı
      </p>

      {/* İlerleme çubuğu */}
      <div
        style={{
          width: '100%',
          height: 8,
          backgroundColor: '#e9ecef',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: `${Math.min(data.rate, 100)}%`,
            height: '100%',
            backgroundColor: '#00b894',
            borderRadius: 10,
          }}
        />
      </div>

      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#777',
          marginBottom: 12,
        }}
      >
        <span>Kalan: {remaining} etkinlik</span>

        <span
          style={{
            color: yearlyIncrease < 0 ? '#e17055' : '#00b894',
            fontWeight: 600,
          }}
        >
          {yearlyTrendIcon} {yearlyIncrease > 0 ? '+' : ''}{yearlyIncrease}
        </span>
      </div>

      <p
        style={{
          fontSize: 11,
          color: '#999',
          textAlign: 'center',
          margin: 0,
        }}
      >
        {yearlyTrendText}
      </p>
    </div>
  );
}
