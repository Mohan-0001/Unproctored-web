import { useState, useEffect } from 'react'
import ChatUI from './components/ChatUI'
import Settings from './components/Settings'

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [view, setView] = useState('chat') 

  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const toggleDark = () => setIsDarkMode((d) => !d)

  return (
    <div className="h-screen w-full">
      {view === 'chat' ? (
        <ChatUI
          isDarkMode={isDarkMode}
          onToggleDark={toggleDark}
          onOpenSettings={() => setView('settings')}
        />
      ) : (
        <Settings
          isDarkMode={isDarkMode}
          onToggleDark={toggleDark}
          onClose={() => setView('chat')}
        />
      )}
    </div>
  )
}

export default App
