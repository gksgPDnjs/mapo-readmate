import { useEffect, useState } from 'react'
import StartScreen from './screens/StartScreen'
import ChatScreen from './screens/ChatScreen'
import LoadingScreen from './screens/LoadingScreen'
import TraitResultScreen from './screens/TraitResultScreen'
import DeepQuizScreen from './screens/DeepQuizScreen'
import BookRecommendScreen from './screens/BookRecommendScreen'
import ReportScreen from './screens/ReportScreen'
import DatabaseSetupScreen from './screens/DatabaseSetupScreen'
import DatabaseTestScreen from './screens/DatabaseTestScreen'
import PublicResultScreen from './screens/PublicResultScreen'
import { STEP } from './constants'
import './App.css'

const SCREENS = [
  StartScreen,
  ChatScreen,
  LoadingScreen,
  TraitResultScreen,
  DeepQuizScreen,
  BookRecommendScreen,
  ReportScreen,
]

function App() {
  const [step, setStep] = useState(0)
  const [toolScreen, setToolScreen] = useState(() => window.location.hash)
  const [recommendations, setRecommendations] = useState([])
  const [completedTrait, setCompletedTrait] = useState(null)
  const [firstStagePreferredFeatureCodes, setFirstStagePreferredFeatureCodes] = useState([])
  const [publicCode, setPublicCode] = useState('')
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    const syncToolScreen = () => setToolScreen(window.location.hash)
    window.addEventListener('hashchange', syncToolScreen)
    return () => window.removeEventListener('hashchange', syncToolScreen)
  }, [])

  const Screen = SCREENS[step]
  const goNext = () => setStep((s) => Math.min(s + 1, SCREENS.length - 1))
  const goTo = (index) => {
    if (index === STEP.START) {
      setRecommendations([])
      setCompletedTrait(null)
      setFirstStagePreferredFeatureCodes([])
      setPublicCode('')
      setSessionId('')
    }
    setStep(index)
  }
  const restart = () => {
    setRecommendations([])
    setCompletedTrait(null)
    setFirstStagePreferredFeatureCodes([])
    setPublicCode('')
    setSessionId('')
    setStep(0)
  }
  const retakeQuiz = () => {
    setRecommendations([])
    setCompletedTrait(null)
    setFirstStagePreferredFeatureCodes([])
    setPublicCode('')
    setSessionId('')
    setStep(1)
  }
  const completeDeepQuiz = (nextRecommendations, nextPublicCode) => {
    setRecommendations(nextRecommendations)
    setPublicCode(typeof nextPublicCode === 'string' ? nextPublicCode : '')
    setStep(STEP.BOOKS)
  }
  // 1차(12문항) 답변이 다 들어가는 순간 호출된다 — 아직 분석 전이라, 여기서는
  // 로딩 화면으로 넘어가기만 하고 실제 AI 호출은 LoadingScreen이 담당한다.
  const beginFirstStageAnalysis = (completedSessionId) => {
    setSessionId(completedSessionId)
    setStep(STEP.LOADING)
  }
  // LoadingScreen이 실제 분석을 마치고 결과를 넘겨줄 때 호출된다.
  const finishFirstStageAnalysis = (result) => {
    setCompletedTrait({ emoji: '📚', ...result.trait })
    setFirstStagePreferredFeatureCodes(Array.isArray(result.preferredFeatureCodes) ? result.preferredFeatureCodes : [])
    setStep(STEP.TRAIT)
  }
  const openSetup = () => {
    window.location.hash = 'setup'
  }
  const openTest = () => {
    window.location.hash = 'test'
  }
  const closeSetup = () => {
    window.history.replaceState(null, '', window.location.pathname)
    setToolScreen('')
  }

  // 운영자 진단 화면(DB 카탈로그 수치 등)은 개발 모드에서만 열린다 —
  // 부스에 배포된 프로덕션 빌드에서는 방문자가 해시만 알아도 볼 수 없어야 한다.
  if (import.meta.env.DEV && toolScreen === '#setup') {
    return <DatabaseSetupScreen onClose={closeSetup} onOpenTest={openTest} />
  }

  if (import.meta.env.DEV && toolScreen === '#test') {
    return <DatabaseTestScreen onClose={openSetup} />
  }

  if (toolScreen.startsWith('#r/')) {
    return <PublicResultScreen code={toolScreen.slice('#r/'.length)} />
  }

  return (
    <Screen
      onNext={goNext}
      onRestart={restart}
      onGoTo={goTo}
      onOpenSetup={openSetup}
      onFirstStageComplete={beginFirstStageAnalysis}
      onAnalysisComplete={finishFirstStageAnalysis}
      onRetake={retakeQuiz}
      onDeepComplete={completeDeepQuiz}
      recommendations={recommendations}
      firstStagePreferredFeatureCodes={firstStagePreferredFeatureCodes}
      publicCode={publicCode}
      sessionId={sessionId}
      trait={completedTrait}
    />
  )
}

export default App
