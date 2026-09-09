import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// StrictMode 미사용 — 로딩 화면이 mount 시 analyze를 1회 호출하므로 dev 이중 호출 방지.
createRoot(document.getElementById('root')!).render(<App />)
