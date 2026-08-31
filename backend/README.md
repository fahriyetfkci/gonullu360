# Gönüllü360 Forms API

Bu çalışma alanı, `C:\\Projects\\IHH-Gonullu360` projesiyle aynı backend seçimlerini kullanır:
Express, TypeScript, Prisma, PostgreSQL ve Zod.

## Yerel kurulum

1. `.env.example` dosyasını `.env` olarak kopyalayın ve `DATABASE_URL` değerini düzenleyin.
2. `npm install` çalıştırın.
3. Bağımsız ve boş bir veritabanında `npm run db:generate` ve `npm run db:push` çalıştırın.
4. Geliştirme organizasyonunu oluşturmak için `npm run db:seed` çalıştırın.
5. API'yi `npm run dev` ile başlatın.

Frontend varsayılan olarak `http://localhost:3001/api` ve `ihh` organizasyonunu kullanır. Bunlar kök `.env` dosyasındaki `REACT_APP_API_URL` ve `REACT_APP_ORGANIZATION_SLUG` değişkenleriyle değiştirilebilir.

## API

- `GET /api/forms/draft`
- `PUT /api/forms/draft`
- `POST /api/forms/publish`
- `GET /api/forms/published`

Taslak kaydı `expectedRevision` alanıyla iyimser kilitleme uygular. Her yayın işlemi `FormVersion` tablosunda değişmez bir JSON snapshot oluşturur.

## Ana backend ile birleştirme

`prisma/schema.prisma` içindeki `Form` ve `FormVersion` modelleri referans şemanın devamı olarak hazırlanmıştır. `src/modules/forms` klasörü, referans backend'in aynı klasörüne taşınabilir; `formRouter` da ana `app.ts` içinde `/api/forms` yoluna eklenir.

Mevcut referans veritabanına ekleme yapılırken `prisma/migrations/20260831000000_add_forms/migration.sql` migration'ı kullanılır. Bu migration, `Organization` ve `User` tablolarının referans backend tarafından önceden oluşturulduğunu varsayar.

Yönetici kimlik doğrulaması ana auth modülüyle birleştirilirken taslak ve yayınlama rotalarına `authenticate`, rol kontrolü ve `csrfProtect` middleware'leri eklenmelidir. Bu bağımsız çalışma alanında henüz auth oturumu bulunmadığından rotalar organizasyon slug'ı ile sınırlandırılır.
