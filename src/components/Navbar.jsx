import React, { useState } from 'react';
import { useAuth } from '../features/auth/AuthProvider';

export default function Navbar({ user, notifications }) {
  const { user: authenticatedUser, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const safeNotifications = notifications || [];

  const unreadCount = safeNotifications.filter(
    (notification) => notification.read === 0
  ).length;

  const displayedUser = authenticatedUser ? {
    name: authenticatedUser.email?.split('@')[0] || 'Yönetici',
    role: authenticatedUser.role === 'ADMIN' ? 'Yönetici' : 'Gönüllü',
    photo: null,
  } : user || {
    name: 'Enes ACAR',
    role: 'Yönetici',
    photo: null,
  };

  const handleProfileClick = () => {
    setShowProfileMenu((previous) => !previous);
    setShowNotifications(false);
  };

  const handleNotificationsClick = () => {
    setShowNotifications((previous) => !previous);
    setShowProfileMenu(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 18,
        padding: '10px 24px',
        minHeight: 52,
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        position: 'relative',
      }}
    >
      {/* Profil alanı */}
      <div
        onClick={handleProfileClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          padding: '5px 8px',
          borderRadius: 8,
          backgroundColor: showProfileMenu
            ? '#f5f7f7'
            : 'transparent',
        }}
      >
        {/* Profil fotoğrafı veya varsayılan ikon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#f1f3f5',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #ddd',
            flexShrink: 0,
          }}
        >
          {displayedUser.photo ? (
            <img
              src={displayedUser.photo}
              alt="Profil"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <span
              style={{
                fontSize: 20,
                color: '#888',
              }}
            >
              👤
            </span>
          )}
        </div>

        {/* Kullanıcı adı ve rol */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            lineHeight: 1.2,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: '#333',
              fontSize: 14,
            }}
          >
            {displayedUser.name}
          </span>

          <span
            style={{
              color: '#999',
              fontSize: 11,
              marginTop: 3,
            }}
          >
            {displayedUser.role}
          </span>
        </div>

        {/* Açılır ok */}
        <span
          style={{
            fontSize: 12,
            color: '#888',
            marginLeft: 2,
            transform: showProfileMenu
              ? 'rotate(180deg)'
              : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          ▼
        </span>
      </div>

      {/* Bildirim ikonu en sağda */}
      <div
        style={{
          position: 'relative',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: 6,
          borderRadius: 8,
          backgroundColor: showNotifications
            ? '#f5f7f7'
            : 'transparent',
        }}
        onClick={handleNotificationsClick}
      >
        <span style={{ fontSize: 21 }}>🔔</span>

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              backgroundColor: '#e74c3c',
              color: '#fff',
              borderRadius: '50%',
              minWidth: 16,
              height: 16,
              padding: '0 3px',
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff',
            }}
          >
            {unreadCount}
          </span>
        )}
      </div>

      {/* Profil menüsü */}
      {showProfileMenu && (
        <div
          style={{
            position: 'absolute',
            top: 66,
            right: 72,
            width: 190,
            backgroundColor: '#fff',
            border: '1px solid #eee',
            borderRadius: 10,
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            zIndex: 110,
            overflow: 'hidden',
          }}
        >
          {/* Menü üst bilgisi */}
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: '#333',
              }}
            >
              {displayedUser.name}
            </p>

            <span
              style={{
                fontSize: 11,
                color: '#999',
              }}
            >
              {displayedUser.role}
            </span>
          </div>

          {[
            { label: 'Profilim', icon: '👤' },
            { label: 'Ayarlar', icon: '⚙️' },
            {
              label: 'Çıkış Yap',
              icon: '🚪',
              color: '#e74c3c',
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (item.label === 'Çıkış Yap') {
                  void logout();
                }
                setShowProfileMenu(false);
              }}
              style={{
                width: '100%',
                border: 'none',
                backgroundColor: '#fff',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                textAlign: 'left',
                fontSize: 13,
                color: item.color || '#555',
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
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bildirim kutusu */}
      {showNotifications && (
        <div
          style={{
            position: 'absolute',
            top: 66,
            right: 24,
            backgroundColor: '#fff',
            border: '1px solid #eee',
            borderRadius: 10,
            width: 320,
            maxHeight: 400,
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f0f0f0',
              fontSize: 13,
              fontWeight: 600,
              color: '#333',
            }}
          >
            Bildirimler
          </div>

          {safeNotifications.length === 0 ? (
            <div
              style={{
                padding: 20,
                color: '#888',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              Bildirim yok
            </div>
          ) : (
            safeNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor:
                    notification.read === 0
                      ? '#f0faf8'
                      : '#fff',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: '#333',
                  }}
                >
                  {notification.message ||
                    notification.title}
                </p>

                <span
                  style={{
                    fontSize: 11,
                    color: '#aaa',
                  }}
                >
                  {notification.created_at || ''}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
