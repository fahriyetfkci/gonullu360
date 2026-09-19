# Entegrasyon notları

## Kaynaklar

- `feature/event-management` (`47dc616`): giriş, form tasarımı/yayınlama ve etkinlik yönetimi; önceki `irem-frontend`, form-builder, forms-backend ve login branch'lerini içerir.
- `origin/reyhan-backend` (`a4bc8c8`): gönüllü/başvuru modelleri, organizasyon filtreli API'ler, dashboard hesaplamaları, gerçek API kullanan liste/profil/başvuru ekranları ve bildirim servisi uyarlanarak taşındı.
- `main` (`235b23a`): yalnızca README. Feature zinciri ile ortak commit geçmişi yoktur; main'e alınırken ilişkisiz geçmişlerin birleştirilmesi gerekir.

## Ortak yapı

Frontend `frontend/`, API `backend/` altında. Mevcut feature hattındaki kimlik doğrulama ve Prisma migration'ları korunur; yeni community tabloları ve form cevapları ek migration ile gelir. Bütün yönetici API'leri aynı bearer token'ı ve `req.user.orgId` değerini kullanır. Form ve etkinlik istemcileri de ortak token yenileme mekanizmasına bağlandı.

Reyhan branch'indeki eski backend veya Vite frontend ikinci uygulama olarak eklenmedi. Aynı işi yapan iki auth/form sistemini paralel çalıştırmak yerine işlevler ortak sisteme uyarlandı. Eski branch'ler korunur. O branch'e özgü MFA yönetim ekranı ve kapasite kontrol betiği bu entegrasyona taşınmadı; mevcut sürümde MFA yönetimi sunulmaz. Görev/CV/belge gibi bağımsız modüller tamamlanmış özellik olarak sunulmaz; form ekleri ise desteklenir.

## Veri geçişi

`20260919000000_unified_community` mevcut feature hattının tablolarını silmez. `User.name`, community tabloları ve form cevapları eklenir. Seed tekrar çalıştırıldığında var olan kullanıcı şifresini veya grup sayısını sıfırlamaz. Yeni gruplar sıfır üye sayısıyla oluşturulur.

Reyhan branch'inin **mevcut bir üretim veritabanı** varsa bu migration doğrudan onun üzerine uygulanmamalıdır: tablo adları, kullanıcı alanları, form ve etkinlik kimlikleri farklıdır. Bu çalışma yeni yerel veritabanında doğrulanmıştır; o veritabanından gerçek kayıt aktarımı ayrı, yedekli bir dönüşüm gerektirir.

## Doğrulama

- Backend ve frontend birim testleri, lint ve production derlemesi.
- Gerçek PostgreSQL/Redis ile giriş/yenileme/çıkış, başvuru kabulü, profil notu, form yayınlama/cevap/dosya, etkinlik ve dashboard akışı.
- Başka organizasyonun başvurusuna, profiline, etkinliğine, form cevabına veya dosyasına erişimin reddi.
- Playwright ile gerçek tarayıcıda giriş, başvuru kabulü, kalıcı not, form cevabı, etkinlik oluşturma/katılım ve çıkış.

Test fixture'ları ayrı organizasyonlarda oluşturulur; uygulamanın normal verileri test sonunda temizlenmez.
