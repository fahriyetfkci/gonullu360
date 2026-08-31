# Gönüllü360

Gönüllü360; React tabanlı yönetim arayüzü ile Express, TypeScript, Prisma,
PostgreSQL ve Redis kullanan backend uygulamasından oluşur. Yönetici girişi,
yenilenen oturumlar ve form taslağı/yayınlama akışı aynı organizasyon sınırları
içinde çalışır.

## Gereksinimler

- Node.js ve npm
- PostgreSQL
- Redis

## Kurulum

1. Kök dizindeki `.env.example` dosyasını `.env` olarak kopyalayın.
2. `backend/.env.example` dosyasını `backend/.env` olarak kopyalayın ve
   veritabanı, Redis, JWT, cookie ve SMTP değerlerini değiştirin.
3. Frontend için `npm install`, backend için `npm --prefix backend install`
   çalıştırın.
4. `npm run backend:generate` ve `npm run backend:migrate` çalıştırın.
5. İlk yönetici hesabını oluşturmak için `npm run backend:seed` çalıştırın.
6. Ayrı terminallerde `npm run backend:dev` ve `npm start` çalıştırın.

Frontend varsayılan olarak `http://localhost:3000`, API ise
`http://localhost:3001` adresinde açılır.

## Kontroller

```text
npm test -- --watchAll=false --runInBand
npm run build
npm run frontend:lint
npm run backend:test
npm run backend:build
npm run backend:lint
```

Backend kurulumu ve API ayrıntıları için [backend/README.md](backend/README.md)
dosyasına bakın.
