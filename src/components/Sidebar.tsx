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
    <div className="flex flex-col h-full p-4 pr-6 overflow-y-auto">
      <button
        onClick={onNewChat}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded mb-4 transition-colors"
      >
        + New Chat
      </button>
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
  )
}

export default Sidebar
