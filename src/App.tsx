import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChatSession, Message } from './types'
import './App.css'

function App(): JSX.Element {
  const [sessions, setSessions] = useState<ChatSession[]>([])

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState<string>('')

  const currentSession = sessions.find((s) => s.id === currentSessionId)

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text).catch(() => {
      console.error('Failed to copy to clipboard')
    })
  }

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

  const handleDeleteSession = (sessionId: string): void => {
    setSessions(sessions.filter((s) => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null)
    }
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
            <div
              key={session.id}
              className={`flex items-center px-4 py-3 border-b border-gray-700 hover:bg-gray-700 transition-colors group ${
                currentSessionId === session.id ? 'bg-gray-700' : ''
              }`}
            >
              <button
                onClick={() => setCurrentSessionId(session.id)}
                className="flex-1 text-left min-w-0"
              >
                <p className="font-semibold truncate text-white">{session.title}</p>
                <p className="text-xs text-gray-400 truncate">
                  {session.messages.length > 0
                    ? session.messages[session.messages.length - 1].content
                    : 'No messages'}
                </p>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteSession(session.id)
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
                  className={`max-w-2xl px-4 py-2 rounded-lg group relative ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <div className="markdown-content">
                    <ReactMarkdown
                      components={{
                        code: ({ node, inline, className, children, ...props }: any) => {
                          const match = /language-(\w+)/.exec(className || '')
                          const lang = match ? match[1] : ''
                          const codeString = String(children).replace(/\n$/, '')

                          if (!inline) {
                            return (
                              <div className="relative bg-gray-900 text-gray-100 rounded my-2 overflow-x-auto">
                                <button
                                  onClick={() => copyToClipboard(codeString)}
                                  className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white"
                                >
                                  Copy
                                </button>
                                <pre className="p-3 pt-8">
                                  <code className={`language-${lang}`}>{codeString}</code>
                                </pre>
                              </div>
                            )
                          }

                          return (
                            <code
                              className="bg-gray-300 px-1 rounded text-gray-900 font-mono"
                              {...props}
                            >
                              {children}
                            </code>
                          )
                        },
                        pre: ({ children }: any) => <div className="my-2">{children}</div>,
                        blockquote: ({ children }: any) => (
                          <blockquote className="border-l-4 border-gray-400 pl-3 italic opacity-70 my-2">
                            {children}
                          </blockquote>
                        ),
                        a: ({ node, href, children, ...props }: any) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:opacity-70"
                            {...props}
                          >
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <p className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-400 hover:bg-opacity-30 rounded"
                      title="Copy message"
                    >
                      📋
                    </button>
                  </div>
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
