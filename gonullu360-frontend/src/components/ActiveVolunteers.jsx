import React, { useState } from 'react';

export default function ActiveVolunteers({ data }) {
  const [isHovered, setIsHovered] = useState(false);

  const percentage = data.total > 0 ? Math.round((data.regular / data.total) * 100) : 0;

  const monthlyIncrease = data.monthlyIncrease ?? 0;
  const trendIcon = monthlyIncrease > 0 ? '↑' : monthlyIncrease < 0 ? '↓' : '—';
  const trendLabel = monthlyIncrease > 0 ? 'Geçen aya göre artış' : monthlyIncrease < 0 ? 'Geçen aya göre düşüş' : 'Geçen aya göre değişim yok';
  const trendColor = monthlyIncrease < 0 ? '#e17055' : '#00b894';

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
          marginBottom: 16,
          alignSelf: 'flex-start',
        }}
      >
        Aktif Gönüllülerde Katılım
      </p>

      {/* Daire */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `conic-gradient(#00b894 ${
            percentage * 3.6
          }deg, #e9ecef 0deg)`,
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
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#333',
            }}
          >
            {data.regular}
          </span>

          <span
            style={{
              fontSize: 11,
              color: '#999',
            }}
          >
            Düzenli
          </span>
        </div>
      </div>

      {/* Karşılaştırma bilgisi */}
      <div
        style={{
          marginBottom: 18,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            color: trendColor,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {trendIcon} %{Math.abs(monthlyIncrease)}
        </div>

        <div
          style={{
            fontSize: 11,
            color: '#888',
            marginTop: 2,
          }}
        >
          {trendLabel}
        </div>
      </div>

      {/* Alt bilgiler */}
      <div
  style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginTop: 'auto',
  }}

      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              backgroundColor: '#00b894',
              borderRadius: 2,
              flexShrink: 0,
            }}
          />

          <span style={{ color: '#555' }}>
            {data.regular} düzenli katılım (%
            {percentage})
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              backgroundColor: '#ced4da',
              borderRadius: 2,
              flexShrink: 0,
            }}
          />

          <span style={{ color: '#555' }}>
            {data.lowParticipation} düşük katılım
          </span>
        </div>
      </div>
    </div>
  );
}
