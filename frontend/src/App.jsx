import { useEffect, useState } from 'react'
import StartScreen from './screens/StartScreen'
import ChatScreen from './screens/ChatScreen'
import LoadingScreen from './screens/LoadingScreen'
import TraitResultScreen from './screens/TraitResultScreen'
import DeepQuizScreen from './screens/DeepQuizScreen'
import BookRecommendScreen from './screens/BookRecommendScreen'
import ReportScreen from './screens/ReportScreen'
import DatabaseSetupScreen from './screens/DatabaseSetupScreen'
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
  const [isSetupVisible, setIsSetupVisible] = useState(() => window.location.hash === '#setup')
  const [answers, setAnswers] = useState([])
  const [recommendations, setRecommendations] = useState([])

  useEffect(() => {
    const syncSetupVisibility = () => setIsSetupVisible(window.location.hash === '#setup')
    window.addEventListener('hashchange', syncSetupVisibility)
    return () => window.removeEventListener('hashchange', syncSetupVisibility)
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
  const closeSetup = () => {
    window.history.replaceState(null, '', window.location.pathname)
    setIsSetupVisible(false)
  }

  if (isSetupVisible) {
    return <DatabaseSetupScreen onClose={closeSetup} />
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
