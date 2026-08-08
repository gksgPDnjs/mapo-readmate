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
  const [completedTrait, setCompletedTrait] = useState(null)

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
      setCompletedTrait(null)
    }
    setStep(index)
  }
  const restart = () => {
    setAnswers([])
    setRecommendations([])
    setCompletedTrait(null)
    setStep(0)
  }
  const retakeQuiz = () => {
    setAnswers([])
    setRecommendations([])
    setCompletedTrait(null)
    setStep(1)
  }
  const recordAnswer = (answer) => setAnswers((currentAnswers) => [...currentAnswers, answer])
  const completeDeepQuiz = (nextRecommendations) => {
    setRecommendations(nextRecommendations)
    setStep(STEP.BOOKS)
  }
  const completeFirstStageQuiz = (result) => {
    const trait = result.trait
    setCompletedTrait({
      ...trait,
      emoji: '📚',
      description: `${trait.axes.map((axis) => axis.label).join(', ')} 성향이 나타났어요.`,
      keywords: trait.axes.map((axis) => `#${axis.label.replaceAll(' ', '')}`),
    })
    setStep(STEP.LOADING)
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
      onFirstStageComplete={completeFirstStageQuiz}
      onRetake={retakeQuiz}
      onDeepComplete={completeDeepQuiz}
      recommendations={recommendations}
      trait={completedTrait ?? createTrait(answers)}
    />
  )
}

export default App
