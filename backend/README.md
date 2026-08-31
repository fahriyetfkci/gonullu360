# Gönüllü360 Backend

Bu backend, referans `IHH-Gonullu360` projesiyle uyumlu Express, TypeScript,
Prisma/PostgreSQL, Redis ve JWT yapısını kullanır. Auth modelleri ile form
modelleri tek Prisma şemasında ve sıralı migration'larda birleştirilmiştir.

## Yerel kurulum

1. `.env.example` dosyasını `.env` olarak kopyalayın.
2. En az `DATABASE_URL`, `REDIS_URL`, JWT/cookie/CSRF secret değerleri ve
   `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` alanlarını değiştirin.
3. `npm install` çalıştırın.
4. Prisma istemcisini üretin: `npm run db:generate`.
5. PostgreSQL migration'larını uygulayın: `npm run db:migrate`.
6. İlk organizasyon ve ADMIN hesabını oluşturun: `npm run db:seed`.
7. Redis'i çalıştırın ve API'yi `npm run dev` ile başlatın.

Üretimde migration için `npm run db:migrate:prod` kullanılır. `db:push`,
migration geçmişi oluşturmadığından paylaşılan veya üretim veritabanlarında
kullanılmamalıdır.

## Auth API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`

Access token kısa ömürlüdür ve frontend belleğinde tutulur. Refresh token
imzalı, `HttpOnly` cookie'dedir; cookie ile durum değiştiren rotalar CSRF
koruması kullanır. Giriş ve hassas auth rotalarında Redis destekli rate limit
bulunur.

## Forms API

- `GET /api/forms/draft` — ADMIN oturumu gerekir
- `PUT /api/forms/draft` — ADMIN oturumu gerekir
- `POST /api/forms/publish` — ADMIN oturumu gerekir
- `GET /api/forms/published` — organizasyon slug'ı ile herkese açık

Taslak kaydı `expectedRevision` ile iyimser kilitleme uygular. Her yayın,
`FormVersion` tablosunda değişmez bir JSON snapshot oluşturur. Korumalı form
rotalarında organizasyon kimliği istemciden değil doğrulanmış JWT'den alınır.

## Veritabanı sırası

- `20260830000000_auth_base`: organizasyon, kullanıcı, oturum ve audit tabloları
- `20260831000000_add_forms`: form ve form sürümü tabloları

Migration çalıştırmadan önce PostgreSQL'in, uygulamayı başlatmadan önce hem
PostgreSQL'in hem Redis'in erişilebilir olması gerekir.
