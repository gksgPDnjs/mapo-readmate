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
import { createTrait } from './data/traitScoring'
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
  const [answers, setAnswers] = useState([])
  const [recommendations, setRecommendations] = useState([])

  useEffect(() => {
    const syncToolScreen = () => setToolScreen(window.location.hash)
    window.addEventListener('hashchange', syncToolScreen)
    return () => window.removeEventListener('hashchange', syncToolScreen)
  }, [])

  const Screen = SCREENS[step]
  const goNext = () => setStep((s) => Math.min(s + 1, SCREENS.length - 1))
  const goTo = (index) => {
    if (index === STEP.START) {
      setAnswers([])
      setRecommendations([])
    }
    setStep(index)
  }
  const restart = () => {
    setAnswers([])
    setRecommendations([])
    setStep(0)
  }
  const retakeQuiz = () => {
    setAnswers([])
    setRecommendations([])
    setStep(1)
  }
  const recordAnswer = (answer) => setAnswers((currentAnswers) => [...currentAnswers, answer])
  const completeDeepQuiz = (nextRecommendations) => {
    setRecommendations(nextRecommendations)
    setStep(STEP.BOOKS)
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

  if (toolScreen === '#setup') {
    return <DatabaseSetupScreen onClose={closeSetup} onOpenTest={openTest} />
  }

  if (toolScreen === '#test') {
    return <DatabaseTestScreen onClose={openSetup} />
  }

  return (
    <Screen
      onNext={goNext}
      onRestart={restart}
      onGoTo={goTo}
      onOpenSetup={openSetup}
      onAnswer={recordAnswer}
      onRetake={retakeQuiz}
      onDeepComplete={completeDeepQuiz}
      recommendations={recommendations}
      trait={createTrait(answers)}
    />
  )
}

export default App
