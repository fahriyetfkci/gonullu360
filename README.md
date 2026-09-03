# Gönüllü 360

Gönüllü 360; PostgreSQL tabanlı bir backend ve Vite ile çalışan React frontend uygulamasından oluşur.

## Gereksinimler

- Node.js 20 veya üzeri
- npm
- PostgreSQL

Varsayılan geliştirme portları:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001/api`
- PostgreSQL: `localhost:5432`

## 1. Projeyi indirme

```bash
git clone https://github.com/fahriyetfkci/gonullu360.git
cd gonullu360
git switch reyhan-backend
```

## 2. PostgreSQL veritabanını hazırlama

PostgreSQL üzerinde `gonullu360` isimli boş bir veritabanı oluşturun.

Örnek bağlantı biçimi:

```text
postgresql://postgres:PAROLANIZ@localhost:5432/gonullu360
```

Parolada `@`, `$`, `:` veya `/` gibi özel karakterler varsa URL kodlaması kullanılmalıdır. Örneğin `@` karakteri `%40`, `$` karakteri `%24` olarak yazılır.

## 3. Backend ayarları

Proje kökündeki `.env.example` dosyasını kopyalayıp `.env` adıyla kaydedin:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

En azından aşağıdaki alanları gerçek değerlerle düzenleyin:

```dotenv
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:PAROLANIZ@localhost:5432/gonullu360
JWT_SECRET=en-az-32-karakterlik-rastgele-bir-deger
COOKIE_SECRET=en-az-32-karakterlik-farkli-rastgele-bir-deger
CSRF_SECRET=en-az-32-karakterlik-baska-rastgele-bir-deger
APP_MODE=demo
SEED_USER_PASSWORD=guclu-bir-demo-parolasi
TEST_MANAGER_EMAIL=enes@gonullu360.com
TEST_MANAGER_PASSWORD=guclu-bir-demo-parolasi
```

Gerçek `.env` dosyasını GitHub'a göndermeyin.

## 4. Backend kurulumu

Proje kökünde:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Başarılı olduğunda terminalde aşağıdakine benzer bir kayıt görülür:

```text
server.started port: 3001 database: postgresql
```

Backend terminalini açık bırakın. Sağlık kontrolü:

```text
http://localhost:3001/api/health
```

## 5. Frontend ayarları

Yeni bir terminal açın ve frontend klasörüne geçin:

```bash
cd gonullu360-frontend
```

`.env.example` dosyasını `.env` olarak kopyalayın:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Frontend ayarları şu şekilde olmalıdır:

```dotenv
VITE_API_URL=http://localhost:3001/api
VITE_ORGANIZATION_SLUG=gonullu360
```

Ardından:

```bash
npm install
npm start
```

Tarayıcı otomatik açılmazsa şu adresi ziyaret edin:

```text
http://localhost:3000
```

## Demo yönetici hesabı

Seed işlemi aşağıdaki yönetici hesabını oluşturur:

```text
E-posta: enes@gonullu360.com
Şifre: Backend .env dosyasındaki SEED_USER_PASSWORD değeri
```

`TEST_MANAGER_PASSWORD` ile `SEED_USER_PASSWORD` geliştirme ve test ortamında aynı olmalıdır.

`.env.example` dosyasında hazır bir parola bulunmaz. Dosyayı `.env` adıyla kopyalayan kişi kendi güçlü başlangıç parolasını `SEED_USER_PASSWORD` alanına yazmalıdır. `npm run seed` çalıştırıldığında `enes@gonullu360.com` hesabının parolası bu değere göre oluşturulur veya güncellenir.

Kullanıcı daha sonra “Parolamı unuttum/Şifreyi yenile” işlemiyle parolasını değiştirirse yeni parola PostgreSQL veritabanında güvenli bir hash olarak saklanır; `.env` dosyasındaki `SEED_USER_PASSWORD` değeri otomatik olarak değişmez. `npm run seed` yeniden çalıştırılırsa yönetici parolası tekrar `.env` içindeki `SEED_USER_PASSWORD` değerine döner. Bu nedenle gerçek verilerin bulunduğu production ortamında seed komutu kontrolsüz şekilde yeniden çalıştırılmamalıdır.

## Kontrol komutları

Backend:

```bash
npm run lint
npm run build
npm test
```

Frontend:

```bash
cd gonullu360-frontend
npm run lint
npm run build
npm test
```

## Üretim ortamı

Production modunda aşağıdaki alanlar zorunludur:

- `NODE_ENV=production`
- `APP_MODE=production`
- Güçlü `JWT_SECRET`, `COOKIE_SECRET` ve `CSRF_SECRET`
- `REDIS_URL`
- SMTP sunucu bilgileri
- Gerçek frontend ve CORS adresleri
- Kalıcı ve yedeklenen dosya depolama alanı

Üretimde demo şifreleri veya `.env.example` içindeki örnek değerler kullanılmamalıdır.

## Sık karşılaşılan sorunlar

### 3001 portu kullanımda

Başka bir backend süreci çalışıyor olabilir. Önce eski terminalde `Ctrl+C` kullanın. Windows üzerinde portu kontrol etmek için:

```powershell
netstat -ano | Select-String ':3001'
```

### Frontend açılmıyor

Backend ve frontend farklı terminallerde çalışmalıdır. Frontend komutunu `gonullu360-frontend` klasöründe çalıştırdığınızdan emin olun.

### PostgreSQL bağlantı hatası

- PostgreSQL servisinin çalıştığını kontrol edin.
- `.env` içindeki kullanıcı, parola, port ve veritabanı adını kontrol edin.
- Özel karakter içeren parolalarda URL kodlaması kullanın.
