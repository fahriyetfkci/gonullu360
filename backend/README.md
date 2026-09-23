# Gönüllü360 API

Kurulum için kökteki [README](../README.md) dosyasını kullanın. Bu klasörde `npm run dev`, `npm run build`, `npm test` ve `npm run lint` komutları çalışır.

## API grupları

- `/api/auth`: register, login, refresh, me, logout, logout-all, forgot-password, reset-password, verify-email, resend-verification.
- `/api/volunteers`: organizasyona ait gönüllüler; `/grouped`, `/:id/profile`, `/:id/educations`.
- `/api/applications`: başvuru oluşturma/listeleme/detay/silme; `PUT /:id/status` ile kabul/ret. Kabul işlemi gönüllü ve profil oluşturup başvuruyu aynı transaction içinde kaldırır.
- `/api/dashboard/stats?year=...`, `/api/dashboard/range`: gerçek kayıtlarla istatistikler.
- `/api/notifications`: oturumdaki kullanıcının bildirimleri; `PUT /:id/read`, `PUT /read-all`.
- `/api/forms`: yöneticiye ait form listesi; `/draft`, `/publish`, `/published`. Taslak güncellemeleri `expectedRevision` kullanır.
- `/api/forms/:id/submissions`: yayımlanmış forma herkese açık POST; cevapları okumak için ADMIN GET. JSON içindeki `version` yayımdaki sürümle eşleşmelidir. Dosyalar `{fieldId, name, base64}` biçiminde gönderilir, toplam 10 MB sınırı vardır.
- `/api/forms/:id/submissions/:submissionId/files/:fileId`: organizasyon kontrolüyle dosya indirme.
- `/api/events`: etkinlik listeleme/oluşturma/detay/güncelleme/arşivleme; `/options`, `/groups`, `/poster`; `PATCH /:id/status`, `POST /:id/participants`.

Yönetim rotaları ADMIN rolü ister. Organizasyon istemcinin body/query değerinden değil doğrulanmış JWT'den alınır. Başarılı cevaplar `{ success: true, data }` biçimindedir. Public form okuma/gönderme ve auth giriş/şifre sıfırlama rotaları oturum gerektirmez.

Migration sırası: auth → forms → events → unified community. Paylaşılan veritabanında `npm run db:migrate:prod` kullanın. `db:push` migration geçmişi oluşturmaz.
