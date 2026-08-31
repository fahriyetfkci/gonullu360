import { useState } from "react";
import logo from "../../assets/gonullu360-logo.png";
import { useAuth } from "./AuthProvider";
import { getAuthErrorMessage, requestPasswordReset } from "./services/authApi";
import "./login.css";

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      if (mode === "forgot") {
        await requestPasswordReset(email);
        setMessage({ type: "success", text: "E-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi." });
      } else {
        await login(email, password);
      }
    } catch (error) {
      setMessage({ type: "error", text: getAuthErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Gönüllü 360 tanıtımı">
        <div className="login-brand-panel__content">
          <span className="login-brand-panel__eyebrow">GÖNÜLLÜ YÖNETİM PLATFORMU</span>
          <h1>İyiliğin etkisini birlikte büyütüyoruz.</h1>
          <p>Gönüllülerinizi, etkinliklerinizi ve başvurularınızı tek merkezden güvenle yönetin.</p>
          <div className="login-brand-panel__metric">
            <strong>360°</strong>
            <span>Kesintisiz gönüllü deneyimi</span>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <img className="login-logo" src={logo} alt="Gönüllü 360" />
          <div className="login-heading">
            <span>{mode === "login" ? "YÖNETİCİ PANELİ" : "HESAP KURTARMA"}</span>
            <h2>{mode === "login" ? "Tekrar hoş geldiniz" : "Şifrenizi sıfırlayın"}</h2>
            <p>{mode === "login" ? "Devam etmek için yönetici hesabınızla giriş yapın." : "Sıfırlama bağlantısı için e-posta adresinizi girin."}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>E-posta adresi</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="yonetici@example.com"
                required
              />
            </label>

            {mode === "login" && (
              <label>
                <span>Şifre</span>
                <div className="login-password-control">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Şifrenizi girin"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? "Gizle" : "Göster"}
                  </button>
                </div>
              </label>
            )}

            {message && <div className={`login-message login-message--${message.type}`}>{message.text}</div>}

            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? "Lütfen bekleyin..." : mode === "login" ? "Giriş Yap" : "Bağlantı Gönder"}
            </button>
          </form>

          <button
            className="login-mode-button"
            type="button"
            onClick={() => {
              setMode((current) => current === "login" ? "forgot" : "login");
              setMessage(null);
            }}
          >
            {mode === "login" ? "Şifremi unuttum" : "Giriş ekranına dön"}
          </button>
        </div>
        <p className="login-footer">© 2026 Gönüllü 360 · Güvenli yönetim paneli</p>
      </section>
    </main>
  );
}
