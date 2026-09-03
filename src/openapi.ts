const bearer = [{ bearerAuth: [] }];
const id = (description: string) => ({ name: 'id', in: 'path', required: true, description, schema: { type: 'integer', minimum: 1 } });
const pages = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
];
const jsonBody = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });

export const openApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Gönüllü 360 API', version: '1.1.0', description: 'PostgreSQL tabanlı yönetici paneli API sözleşmesi' },
  servers: [{ url: 'http://localhost:3001/api', description: 'Yerel geliştirme' }],
  tags: ['Auth', 'Dashboard', 'Volunteers', 'Applications', 'Forms', 'Notifications'].map(name => ({ name })),
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', required: ['error'], properties: { error: { type: 'string' }, code: { type: 'string' } } },
      Pagination: { type: 'object', required: ['total', 'page', 'limit', 'totalPages'], properties: { total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' }, totalPages: { type: 'integer' } } },
      Login: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' }, mfaCode: { type: 'string', pattern: '^\\d{6}$' }, backupCode: { type: 'string' } } },
      VolunteerInput: { type: 'object', required: ['name', 'city', 'gender', 'age'], properties: { name: { type: 'string' }, city: { type: 'string' }, gender: { type: 'string' }, age: { type: 'integer' }, education: { type: 'string' }, active: { type: 'boolean' } } },
      ApplicationInput: { type: 'object', required: ['name', 'city', 'gender', 'age'], properties: { name: { type: 'string' }, city: { type: 'string' }, gender: { type: 'string' }, age: { type: 'integer' }, education: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string', format: 'email' }, address: { type: 'string' }, interests: { type: 'array', items: { type: 'string' } }, coverLetter: { type: 'string' } } },
      FormSchema: { type: 'object', required: ['schemaVersion', 'id', 'title', 'sections'], additionalProperties: true },
      Answers: { type: 'object', required: ['answers'], properties: { answers: { type: 'object', additionalProperties: true } } },
    },
  },
  paths: {
    '/health': { get: { summary: 'Servis ve PostgreSQL durumunu kontrol eder', responses: { '200': { description: 'Servis sağlıklı' }, '503': { description: 'Veritabanı hazır değil' } } } },
    '/openapi.json': { get: { summary: 'OpenAPI belgesini döndürür', responses: { '200': { description: 'OpenAPI belgesi' } } } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'Yönetici oturumu açar', requestBody: jsonBody({ $ref: '#/components/schemas/Login' }), responses: { '200': { description: 'Oturum açıldı veya MFA kodu istendi' }, '401': { description: 'Bilgiler hatalı' }, '423': { description: 'Hesap kilitli' }, '429': { description: 'Deneme sınırı aşıldı' } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Oturumdaki yöneticiyi getirir', security: bearer, responses: { '200': { description: 'Yönetici bilgisi' }, '401': { description: 'Yetkisiz' } } } },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Refresh token ile tokenları yeniler', responses: { '200': { description: 'Tokenlar yenilendi' }, '401': { description: 'Refresh token geçersiz' } } } },
    '/auth/register': { post: { tags: ['Auth'], summary: 'Organizasyonda doğrulanmamış kullanıcı kaydı oluşturur', responses: { '201': { description: 'Kayıt oluşturuldu' }, '409': { description: 'E-posta zaten kayıtlı' }, '422': { description: 'Bilgiler geçersiz' } } } },
    '/auth/verify-email': { post: { tags: ['Auth'], summary: 'E-posta doğrulama tokenını onaylar', responses: { '200': { description: 'E-posta doğrulandı' }, '400': { description: 'Token geçersiz veya süresi dolmuş' } } } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Refresh oturumunu kapatır', responses: { '200': { description: 'Oturum kapatıldı' } } } },
    '/auth/forgot-password': { post: { tags: ['Auth'], summary: 'Şifre yenileme kodu üretir', requestBody: jsonBody({ type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } }), responses: { '200': { description: 'Kod gönderim süreci başlatıldı' }, '404': { description: 'Demo modunda e-posta kayıtlı değil' }, '429': { description: 'İstek sınırı aşıldı' } } } },
    '/auth/reset-password': { post: { tags: ['Auth'], summary: 'Kodla yeni şifre belirler', requestBody: jsonBody({ type: 'object', required: ['email', 'code', 'password'], properties: { email: { type: 'string', format: 'email' }, code: { type: 'string', pattern: '^\\d{6}$' }, password: { type: 'string', format: 'password', minLength: 8 } } }), responses: { '200': { description: 'Şifre yenilendi' }, '400': { description: 'Kod geçersiz veya süresi dolmuş' } } } },
    '/auth/mfa/setup': { post: { tags: ['Auth'], summary: 'MFA kurulumu başlatır', security: bearer, responses: { '200': { description: 'Kurulum bilgileri' } } } },
    '/auth/mfa/enable': { post: { tags: ['Auth'], summary: 'MFA özelliğini etkinleştirir', security: bearer, responses: { '200': { description: 'MFA etkin' }, '400': { description: 'Kod geçersiz' } } } },
    '/auth/mfa/disable': { post: { tags: ['Auth'], summary: 'MFA özelliğini kapatır', security: bearer, responses: { '200': { description: 'MFA kapatıldı' }, '401': { description: 'Şifre hatalı' } } } },
    '/dashboard/stats': { get: { tags: ['Dashboard'], summary: 'Bir yılın dashboard metriklerini getirir', parameters: [{ name: 'year', in: 'query', schema: { type: 'integer', minimum: 2000, maximum: 2100 } }], responses: { '200': { description: 'Dashboard verisi' }, '400': { description: 'Yıl geçersiz' } } } },
    '/dashboard/range': { get: { tags: ['Dashboard'], summary: 'Yıl aralığındaki gönüllü toplamlarını getirir', parameters: [{ name: 'startYear', in: 'query', schema: { type: 'integer' } }, { name: 'endYear', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Yıllık seri' } } } },
    '/volunteers': {
      get: { tags: ['Volunteers'], summary: 'Gönüllüleri filtreli ve sayfalı getirir', parameters: [...pages, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'city', in: 'query', schema: { type: 'string' } }, { name: 'gender', in: 'query', schema: { type: 'string' } }, { name: 'ageRange', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Gönüllü listesi' } } },
      post: { tags: ['Volunteers'], summary: 'Gönüllü oluşturur', security: bearer, requestBody: jsonBody({ $ref: '#/components/schemas/VolunteerInput' }), responses: { '201': { description: 'Oluşturuldu' }, '403': { description: 'Yönetici yetkisi gerekli' } } },
    },
    '/volunteers/grouped': { get: { tags: ['Volunteers'], summary: 'Gönüllü ve başvuruları gruplu/sayfalı getirir', parameters: pages, responses: { '200': { description: 'Gruplu liste' } } } },
    '/volunteers/{id}': {
      get: { tags: ['Volunteers'], summary: 'Gönüllüyü getirir', parameters: [id('Gönüllü numarası')], responses: { '200': { description: 'Gönüllü' }, '404': { description: 'Bulunamadı' } } },
      put: { tags: ['Volunteers'], summary: 'Gönüllüyü günceller', security: bearer, parameters: [id('Gönüllü numarası')], requestBody: jsonBody({ $ref: '#/components/schemas/VolunteerInput' }), responses: { '200': { description: 'Güncellendi' } } },
      delete: { tags: ['Volunteers'], summary: 'Gönüllüyü siler', security: bearer, parameters: [id('Gönüllü numarası')], responses: { '200': { description: 'Silindi' }, '404': { description: 'Bulunamadı' } } },
    },
    '/volunteers/{id}/profile': {
      get: { tags: ['Volunteers'], summary: 'Gönüllü profilini getirir', parameters: [id('Gönüllü numarası')], responses: { '200': { description: 'Profil' }, '404': { description: 'Bulunamadı' } } },
      put: { tags: ['Volunteers'], summary: 'Yönetici profil alanlarını günceller', security: bearer, parameters: [id('Gönüllü numarası')], responses: { '200': { description: 'Güncellendi' }, '403': { description: 'Yetkisiz' } } },
    },
    '/volunteers/{id}/educations': {
      get: { tags: ['Volunteers'], summary: 'Eğitim kayıtlarını getirir', parameters: [id('Gönüllü numarası')], responses: { '200': { description: 'Eğitim listesi' } } },
      post: { tags: ['Volunteers'], summary: 'Eğitim kaydı ekler', security: bearer, parameters: [id('Gönüllü numarası')], responses: { '201': { description: 'Eklendi' } } },
    },
    '/volunteers/{id}/educations/{educationId}': { delete: { tags: ['Volunteers'], summary: 'Eğitim kaydını siler', security: bearer, parameters: [id('Gönüllü numarası'), { name: 'educationId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Silindi' } } } },
    '/applications': {
      get: { tags: ['Applications'], summary: 'Başvuruları sayfalı getirir', parameters: [...pages, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'timeFilter', in: 'query', schema: { type: 'string', enum: ['tümü', 'hafta', 'ay'] } }], responses: { '200': { description: 'Başvuru listesi' } } },
      post: { tags: ['Applications'], summary: 'Başvuru oluşturur', requestBody: jsonBody({ $ref: '#/components/schemas/ApplicationInput' }), responses: { '201': { description: 'Başvuru oluşturuldu' } } },
    },
    '/applications/all': { get: { tags: ['Applications'], summary: 'Başvuru ve aktif gönüllüleri sayfalı getirir', parameters: pages, responses: { '200': { description: 'Birleşik liste' } } } },
    '/applications/{id}': {
      get: { tags: ['Applications'], summary: 'Başvuru detayını getirir', parameters: [id('Başvuru numarası')], responses: { '200': { description: 'Başvuru' }, '404': { description: 'Bulunamadı' } } },
      delete: { tags: ['Applications'], summary: 'Başvuruyu siler', security: bearer, parameters: [id('Başvuru numarası')], responses: { '200': { description: 'Silindi' } } },
    },
    '/applications/{id}/status': { put: { tags: ['Applications'], summary: 'Başvuru durumunu değiştirir', security: bearer, parameters: [id('Başvuru numarası')], requestBody: jsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['İşlem Bekliyor', 'Reddedildi', 'Aktif Gönüllü'] } } }), responses: { '200': { description: 'Durum güncellendi' } } } },
    '/notifications': {
      get: { tags: ['Notifications'], summary: 'Oturumdaki yöneticinin bildirimlerini getirir', security: bearer, parameters: pages, responses: { '200': { description: 'Bildirim listesi, sayfalama ve okunmamış toplam' }, '403': { description: 'Yönetici yetkisi gerekli' } } },
      post: { tags: ['Notifications'], summary: 'Oturumdaki yönetici için bildirim oluşturur', security: bearer, requestBody: jsonBody({ type: 'object', required: ['message'], properties: { message: { type: 'string' } } }), responses: { '201': { description: 'Bildirim oluşturuldu' } } },
    },
    '/notifications/read-all': { put: { tags: ['Notifications'], summary: 'Yöneticinin bildirimlerini okundu yapar', security: bearer, responses: { '200': { description: 'Güncellendi' } } } },
    '/notifications/{id}/read': { put: { tags: ['Notifications'], summary: 'Yöneticinin bildirimini okundu yapar', security: bearer, parameters: [id('Bildirim numarası')], responses: { '200': { description: 'Güncellendi' }, '404': { description: 'Bu yöneticiye ait değil' } } } },
    '/notifications/{id}': { delete: { tags: ['Notifications'], summary: 'Yöneticinin bildirimini siler', security: bearer, parameters: [id('Bildirim numarası')], responses: { '200': { description: 'Silindi' }, '404': { description: 'Bu yöneticiye ait değil' } } } },
    '/forms': {
      get: { tags: ['Forms'], summary: 'Organizasyonun formlarını getirir', security: bearer, responses: { '200': { description: 'Form listesi' } } },
      post: { tags: ['Forms'], summary: 'Form taslağı oluşturur', security: bearer, requestBody: jsonBody({ type: 'object', required: ['schema'], properties: { schema: { $ref: '#/components/schemas/FormSchema' } } }), responses: { '201': { description: 'Taslak oluşturuldu' }, '409': { description: 'Form zaten var' }, '422': { description: 'Şema geçersiz' } } },
    },
    '/forms/{id}': {
      get: { tags: ['Forms'], summary: 'Form taslağını getirir', security: bearer, parameters: [id('Form numarası')], responses: { '200': { description: 'Form' } } },
      put: { tags: ['Forms'], summary: 'Revision kontrollü form taslağı kaydeder', security: bearer, parameters: [id('Form numarası')], responses: { '200': { description: 'Taslak kaydedildi' }, '409': { description: 'Revision çakışması' } } },
      delete: { tags: ['Forms'], summary: 'Formu sürümleri ve cevaplarıyla siler', security: bearer, parameters: [id('Form numarası')], responses: { '200': { description: 'Silindi' } } },
    },
    '/forms/{id}/publish': { post: { tags: ['Forms'], summary: 'Formun sabit sürümünü yayınlar', security: bearer, parameters: [id('Form numarası')], responses: { '200': { description: 'Yayınlandı' }, '409': { description: 'Revision çakışması' }, '422': { description: 'Form yayınlanamaz' } } } },
    '/forms/published/{id}': { get: { tags: ['Forms'], summary: 'Yayınlanmış form sürümünü getirir', parameters: [id('Form numarası')], responses: { '200': { description: 'Yayınlanmış form' }, '404': { description: 'Bulunamadı' } } } },
    '/forms/{id}/submissions': {
      get: { tags: ['Forms'], summary: 'Form cevaplarını sayfalı getirir', security: bearer, parameters: [id('Form numarası'), ...pages], responses: { '200': { description: 'Cevap listesi ve sayfalama' } } },
      post: { tags: ['Forms'], summary: 'Yayınlanan forma cevap gönderir', parameters: [id('Form numarası')], requestBody: jsonBody({ $ref: '#/components/schemas/Answers' }), responses: { '201': { description: 'Cevap kaydedildi' }, '400': { description: 'Zorunlu cevap eksik' } } },
    },
    '/forms/{formId}/submissions/{submissionId}/files/{fileId}': {
      get: { tags: ['Forms'], summary: 'Cevaba eklenen dosyayı indirir', security: bearer, parameters: [
        { name: 'formId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'submissionId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'fileId', in: 'path', required: true, schema: { type: 'string' } },
      ], responses: { '200': { description: 'Dosya içeriği' }, '401': { description: 'Oturum gerekli' }, '404': { description: 'Dosya bu organizasyona ait değil veya bulunamadı' } } },
    },
  },
};
