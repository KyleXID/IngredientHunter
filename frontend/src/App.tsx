import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FlowProvider } from './lib/flow'
import { IntroScreen, SurveyScreen, PhotoGuideScreen, LoadingScreen, ResultScreen, ErrorScreen } from './screens'

/**
 * 제로드링크 — 성분 리스크 분석. 화면 전환은 react-router(DemoNav/상태머신 제거).
 * 플로우 상태는 FlowProvider 로 화면 간 공유.
 */
export default function App() {
  return (
    <FlowProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IntroScreen />} />
          <Route path="/photo" element={<PhotoGuideScreen />} />
          <Route path="/survey" element={<SurveyScreen />} />
          <Route path="/loading" element={<LoadingScreen />} />
          <Route path="/result" element={<ResultScreen />} />
          <Route path="/error/:type" element={<ErrorScreen />} />
          <Route path="*" element={<IntroScreen />} />
        </Routes>
      </BrowserRouter>
    </FlowProvider>
  )
}
