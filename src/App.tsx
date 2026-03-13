import { useState } from 'react'
import { ChatSession, Message } from './types'
import './App.css'

function App(): JSX.Element {
  const [sessions, setSessions] = useState<ChatSession[]>([])

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState<string>('')

  const currentSession = sessions.find((s) => s.id === currentSessionId)

  const handleSendMessage = (): void => {
    if (inputValue.trim() === '' || !currentSession) return

    const newMessage: Message = {
      id: `${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    }

    setSessions(
      sessions.map((session) => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: [...session.messages, newMessage],
            updatedAt: new Date(),
          }
        }
        return session
      })
    )

    setInputValue('')

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: `${Date.now()}`,
        content: 'This is a bot response.',
        sender: 'bot',
        timestamp: new Date(),
      }

      setSessions(
        sessions.map((session) => {
          if (session.id === currentSessionId) {
            return {
              ...session,
              messages: [...session.messages, botMessage],
              updatedAt: new Date(),
            }
          }
          return session
        })
      )
    }, 500)
  }

  const handleNewChat = (): void => {
    const newSessionId = `${Date.now()}`
    const newSession: ChatSession = {
      id: newSessionId,
      title: `Chat ${sessions.length + 1}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setSessions([...sessions, newSession])
    setCurrentSessionId(newSessionId)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Chat History */}
      <div className="w-64 min-w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={handleNewChat}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            + New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-700 hover:bg-gray-700 transition-colors ${
                currentSessionId === session.id ? 'bg-gray-700' : ''
              }`}
            >
              <p className="font-semibold truncate">{session.title}</p>
              <p className="text-xs text-gray-400 truncate">
                {session.messages.length > 0
                  ? session.messages[session.messages.length - 1].content
                  : 'No messages'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Messages - Flexible height */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {currentSession && currentSession.messages.length > 0 ? (
            currentSession.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-lg px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>No messages yet. Start a conversation!</p>
            </div>
          )}
        </div>

        {/* Input Area - Fixed height */}
        <div className="h-20 border-t border-gray-300 bg-white p-4 flex-shrink-0">
          <div className="flex gap-2 h-full">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex-shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
