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
    <div className="h-screen w-full relative">
      <div className={view === 'chat' ? 'h-full w-full' : 'hidden'}>
        <ChatUI
          isDarkMode={isDarkMode}
          onToggleDark={toggleDark}
          onOpenSettings={() => setView('settings')}
          activeView={view}
        />
      </div>
      <div className={view === 'settings' ? 'h-full w-full' : 'hidden'}>
        <Settings
          isDarkMode={isDarkMode}
          onToggleDark={toggleDark}
          onClose={() => setView('chat')}
        />
      </div>
    </div>
  )
}

export default App
