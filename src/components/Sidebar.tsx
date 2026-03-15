import { ChatSession } from '../types'

interface SidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onDeleteSession: (id: string) => void
  onOpenSettings: () => void
}

function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onOpenSettings,
}: SidebarProps): JSX.Element {
  return (
    <div className="flex flex-col h-full p-4 pr-6">
      <button
        onClick={onNewChat}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded mb-4 transition-colors"
      >
        + New Chat
      </button>
      <div className="flex-1 overflow-y-auto">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`flex items-center w-full justify-start mb-2 px-3 py-2 rounded transition-colors group ${
              currentSessionId === session.id
                ? 'bg-gray-100'
                : 'hover:bg-gray-50'
            }`}
          >
            <button
              onClick={() => onSelectSession(session.id)}
              className="flex-1 text-left min-w-0"
            >
              <p className="font-medium truncate text-gray-800">
                {session.title}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {session.messages.length > 0
                  ? session.messages[session.messages.length - 1].content
                  : 'No messages'}
              </p>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteSession(session.id)
              }}
              className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              title="Delete chat"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-gray-200">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </div>
  )
}

export default Sidebar
