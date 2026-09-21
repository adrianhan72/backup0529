/**
 * middleware/cors.js — CORS 설정
 */
module.exports = function() {
  const cors = require('cors');
  const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://43.201.90.207',    // Elastic IP 직접 접속용 (테스트)
    'http://insanomutok.com',  // certbot 적용 전 HTTP 테스트용 (HTTPS 전환 후엔 불필요)
    'https://insanomutok.com', // 운영 도메인 (후이즈 DNS)
  ];
  return cors({
    origin: (origin, callback) => {
      // localhost, 127.0.0.1, 또는 192.168.x.x 등 사설 IP 모두 허용
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // 사설 IP 대역 (192.168.x.x, 10.x.x.x, 172.16-31.x.x) 및 localhost 허용
      if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
};
