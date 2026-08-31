import React, { useEffect, useState } from "react";
import logo from "../assets/gonullu360-logo.png";
import logoIcon from "../assets/logo-icon.png";
import { useAuth } from "../features/auth/AuthProvider";

const menuItems = [
  {
    icon: "🏠",
    label: "Anasayfa",
    page: "dashboard",
  },
  {
    icon: "📊",
    label: "Raporlar",
    page: "reports",
  },
  {
    icon: "👥",
    label: "Gönüllü Gruplama",
    page: "volunteers",
  },
  {
    icon: "📝",
    label: "Veri Girişi",
    page: "data-entry",
  },
  {
    icon: "📅",
    label: "Etkinlik Yönetimi",
    page: "events",
  },
  {
    icon: "📋",
    label: "Form Yönetimi",
    page: "forms",
  },
  {
    icon: "✉️",
    label: "Bildirim ve İletişim",
    page: "notifications",
  },
  {
    icon: "🔒",
    label: "Güvenlik ve Yedekleme",
    page: "security",
  },
  {
    icon: "⚙️",
    label: "Ayarlar",
    page: "settings",
  },
  {
    icon: "🚪",
    label: "Çıkış",
    page: "logout",
    color: "#e74c3c",
  },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  const getCurrentPage = () => {
    const pageFromHash = window.location.hash.replace("#", "");

    if (pageFromHash === "volunteers") {
      return "volunteers";
    }

    if (pageFromHash === "forms") {
      return "forms";
    }

    return "dashboard";
  };

  const [currentPage, setCurrentPage] = useState(getCurrentPage());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getCurrentPage());
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const handleMenuClick = (item) => {
    if (item.page === "dashboard") {
      window.location.hash = "dashboard";
      return;
    }

    if (item.page === "volunteers") {
      window.location.hash = "volunteers";
      return;
    }

    if (item.page === "forms") {
      window.location.hash = "forms";
      return;
    }

    if (item.page === "logout") {
      void logout();
      return;
    }

    console.log(`${item.label} sayfası henüz hazırlanmadı.`);
  };

  return (
    <aside
      style={{
        width: isOpen ? 220 : 64,
        minHeight: "100vh",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "18px 0",
        borderRight: "1px solid #eeeeee",
        backgroundColor: "#ffffff",
        transition: "width 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isOpen ? "space-between" : "center",
          minWidth: 0,
          minHeight: 54,
          marginBottom: 22,
          padding: isOpen ? "0 12px 0 14px" : "0",
          whiteSpace: "nowrap",
        }}
      >
        {isOpen ? (
          <img
            src={logo}
            alt="Gönüllü 360"
            style={{
              display: "block",
              width: 142,
              height: 54,
              objectFit: "contain",
              objectPosition: "left center",
            }}
          />
        ) : (
          <img
            src={logoIcon}
            alt="Gönüllü 360"
            style={{
              display: "block",
              width: 42,
              height: 42,
              objectFit: "contain",
            }}
          />
        )}

        {isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Menüyü daralt"
            title="Menüyü daralt"
            style={{
              flexShrink: 0,
              padding: 4,
              border: "none",
              backgroundColor: "transparent",
              color: "#777777",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ‹
          </button>
        )}

        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Menüyü genişlet"
            title="Menüyü genişlet"
            style={{
              position: "absolute",
              marginTop: 70,
              padding: 3,
              border: "none",
              backgroundColor: "#ffffff",
              color: "#777777",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              borderRadius: 4,
            }}
          >
            ›
          </button>
        )}
      </div>

      {isOpen && (
        <p
          style={{
            margin: "0 0 8px",
            padding: "0 16px",
            color: "#aaaaaa",
            fontSize: 11,
          }}
        >
          Menü
        </p>
      )}

      <nav>
        {menuItems.map((item) => {
          const isActive = currentPage === item.page;

          return (
            <button
              key={item.page}
              type="button"
              title={!isOpen ? item.label : ""}
              onClick={() => handleMenuClick(item)}
              style={{
                boxSizing: "border-box",
                width: "100%",
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: isOpen ? "10px 16px" : "10px 18px",
                borderTop: "none",
                borderRight: "none",
                borderBottom: "none",
                borderLeft: isActive
                  ? "3px solid #00b894"
                  : "3px solid transparent",
                backgroundColor: isActive ? "#f0faf8" : "transparent",
                color:
                  item.color || (isActive ? "#00b894" : "#555555"),
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                textAlign: "left",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  minWidth: 20,
                  fontSize: 18,
                  textAlign: "center",
                }}
              >
                {item.icon}
              </span>

              {isOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
