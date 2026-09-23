# Gönüllü360

React yönetim paneli ve Express/TypeScript API; tek PostgreSQL şeması, Redis oturumu ve organizasyon bazlı erişim ile çalışır.

## İlk kurulum

Node.js 22 veya 24 ve çalışan Docker Desktop gerekir. Proje kökünde:

```sh
npm ci
npm run setup
npm run dev
```

`setup` frontend/backend bağımlılıklarını kilit dosyalarından kurar, eksik `.env` dosyalarını oluşturur, yerel PostgreSQL/Redis/Mailpit servislerini başlatır, migration'ları uygular ve ilk yöneticiyi oluşturur. Mevcut `.env` dosyalarını ve yönetici şifresini değiştirmez. Bağımlılıklar zaten kuruluysa `npm run setup -- --skip-install` kullanılabilir.

- Uygulama: http://localhost:3000
- API sağlık kontrolü: http://localhost:3001/health
- Yerel e-postalar: http://localhost:8025
- Giriş: `backend/.env` içindeki `SEED_ADMIN_EMAIL` ve `SEED_ADMIN_PASSWORD`. Kurulum şifreyi rastgele üretir.

Sonraki açılışlarda `npm run infra:up` ve `npm run dev` yeterlidir. `Ctrl+C` uygulamaları, `npm run infra:down` altyapı servislerini durdurur; veritabanı verileri korunur. PostgreSQL 5433, Redis 6380, SMTP 1025 portlarında yalnızca localhost'a açılır.

## Klasörler

```text
frontend/      React ekranları ve ortak API istemcisi
backend/       Express API, Prisma şeması ve migration'lar
scripts/       Kurulum ve birlikte başlatma komutları
tests/e2e/     Gerçek tarayıcı kullanım testi
compose.yaml   Yerel PostgreSQL, Redis ve Mailpit
```

## Kullanım

1. Yönetici hesabıyla giriş yapın.
2. **Veri Girişi** ekranında başvuru oluşturun. Detay ekranında kabul ettiğiniz başvuru gönüllüye dönüşür.
3. **Gönüllü Gruplama** ekranından arayın/filtreleyin, profilini açın ve yönetici notunu kaydedin.
4. **Form Yönetimi** ekranında alan ekleyin, kaydedip yayımlayın. **Yayındaki Form** içindeki bağlantıyı paylaşın; cevaplar ve ekli dosyalar bu ekranda listelenir. Dosyaların toplam sınırı 10 MB; PDF, DOC, DOCX, PNG ve JPEG desteklenir. Dosyalar PostgreSQL'de saklanır ve yalnızca ilgili organizasyonun yöneticisi indirebilir.
5. **Etkinlik Yönetimi** ekranında etkinlik oluşturun; yayımlanmış formu ilişkilendirin. Kayıtlı etkinliklerin durumunu değiştirebilir ve profildeki gönüllü numarasıyla katılım ekleyebilirsiniz.
6. Dashboard gerçek gönüllü ve etkinlik kayıtlarından hesaplanır. Boş veritabanında sayılar sıfırdır; örnek veriler gösterilmez.

Şifre sıfırlama e-postaları yerelde Mailpit'e gider. Gerçek e-posta göndermek için `backend/.env` içindeki SMTP ayarlarını değiştirin.

## Kontroller

```sh
npm run lint
npm test
npm run build
npm run test:integration
npm run test:e2e
```

Entegrasyon ve tarayıcı testleri için önce `npm run setup` tamamlanmış olmalıdır. Testler ayrı organizasyonlar oluşturup temizler; mevcut kullanıcı verilerini silmez. Tarayıcı testi 3000/3001 portlarında uygulamaları kendisi başlatır: önce çalışan `npm run dev` sürecini durdurun. Windows'ta kurulu Microsoft Edge kullanılır; diğer sistemlerde önce `npx playwright install chromium` çalıştırın.

## Birleştirme ve kapsam

Kaynak branch'ler, taşınan işlevler ve veri geçişi notları [docs/integration.md](docs/integration.md) dosyasındadır. Yerel Docker ayarları geliştirme içindir. Üretim ortamında ayrı veritabanı, Redis, SMTP ve secret değerleri tanımlanmalı; HTTPS ve frontend için history fallback yapılandırılmalıdır.
