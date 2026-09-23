import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

/* HTTPS 는 `npm run dev:https` 일 때만 켠다.
   공유(navigator.share)·클립보드·crypto.randomUUID 는 보안 컨텍스트에서만 있어서,
   실기기를 사내망 IP 의 http 로 열면 전부 없다. 실기기에서 공유까지 보려면 https 가
   필요하다. 자체 서명이라 폰에서 인증서 경고를 한 번 통과시켜야 한다. */
const https = process.env.HTTPS === '1'

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(https ? [basicSsl()] : [])],
  server: {
    // 개발 중 /api 요청을 Spring 백엔드(8080)로 프록시 → CORS 불필요
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
