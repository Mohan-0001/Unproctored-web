import { MessageSquare, Plus, Clock } from 'lucide-react'

/**
 * StartupDialog — shown on app launch when saved conversation history exists.
 * Lets the user choose to continue the previous session or start fresh.
 *
 * Props:
 *   messageCount   — number of messages in saved history
 *   lastTimestamp  — ISO string of the last message timestamp
 *   onContinue     — () => void
 *   onNewChat      — () => void
 */
const StartupDialog = ({ messageCount, lastTimestamp, onContinue, onNewChat }) => {
  const formattedTime = lastTimestamp
    ? new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(lastTimestamp))
    : null

  return (
    // Full-screen backdrop
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className="
          w-full max-w-sm mx-4
          bg-white/90 dark:bg-[#1c1c1e]/95
          backdrop-blur-2xl
          border border-gray-200/60 dark:border-gray-700/60
          rounded-3xl shadow-2xl
          overflow-hidden
          animate-startup-dialog
        "
      >
        {/* Icon header */}
        <div className="flex flex-col items-center pt-8 pb-5 px-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-4 shadow-lg">
            <MessageSquare size={26} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center">
            Previous session found
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
            You have{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {messageCount} messages
            </span>{' '}
            from your last conversation.
          </p>
          {formattedTime && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <Clock size={11} />
              <span>Last active: {formattedTime}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 dark:bg-gray-800" />

        {/* Action buttons */}
        <div className="p-4 flex flex-col gap-2.5">
          {/* Continue */}
          <button
            onClick={onContinue}
            id="startup-continue-btn"
            className="
              w-full flex items-center justify-center gap-2
              px-5 py-3 rounded-2xl
              bg-gradient-to-r from-blue-500 to-violet-500
              hover:from-blue-600 hover:to-violet-600
              text-white font-semibold text-sm
              shadow-md hover:shadow-lg
              transition-all duration-200 active:scale-[0.98]
            "
          >
            <MessageSquare size={16} />
            Continue previous session
          </button>

          {/* New Chat */}
          <button
            onClick={onNewChat}
            id="startup-new-chat-btn"
            className="
              w-full flex items-center justify-center gap-2
              px-5 py-3 rounded-2xl
              bg-gray-100 dark:bg-gray-800
              hover:bg-gray-200 dark:hover:bg-gray-700
              text-gray-700 dark:text-gray-300 font-semibold text-sm
              transition-all duration-200 active:scale-[0.98]
            "
          >
            <Plus size={16} />
            Start a new chat
          </button>
        </div>
      </div>
    </div>
  )
}

export default StartupDialog
