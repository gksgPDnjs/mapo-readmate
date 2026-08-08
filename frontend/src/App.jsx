import { useState } from 'react'
import StartScreen from './screens/StartScreen'
import ChatScreen from './screens/ChatScreen'
import LoadingScreen from './screens/LoadingScreen'
import TraitResultScreen from './screens/TraitResultScreen'
import BookRecommendScreen from './screens/BookRecommendScreen'
import ReportScreen from './screens/ReportScreen'
import './App.css'

const SCREENS = [
  StartScreen,
  ChatScreen,
  LoadingScreen,
  TraitResultScreen,
  BookRecommendScreen,
  ReportScreen,
]

function App() {
  const [step, setStep] = useState(0)

  const Screen = SCREENS[step]
  const goNext = () => setStep((s) => Math.min(s + 1, SCREENS.length - 1))
  const goTo = (index) => setStep(index)
  const restart = () => setStep(0)

  return <Screen onNext={goNext} onRestart={restart} onGoTo={goTo} />
}

export default App
