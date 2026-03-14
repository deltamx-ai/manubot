import { ChatSession } from '../types'

interface SidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onDeleteSession: (id: string) => void
}

function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: SidebarProps): JSX.Element {
  return (
    <div className="w-64 min-w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`flex items-center px-4 py-3 border-b border-gray-700 hover:bg-gray-700 transition-colors group ${
              currentSessionId === session.id ? 'bg-gray-700' : ''
            }`}
          >
            <button
              onClick={() => onSelectSession(session.id)}
              className="flex-1 text-left min-w-0"
            >
              <p className="font-semibold truncate text-white">
                {session.title}
              </p>
              <p className="text-xs text-gray-400 truncate">
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
              className="ml-2 p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              title="Delete chat"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sidebar
