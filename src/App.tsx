import { useState, useRef, useEffect } from 'react'
import { ChatSession, Message } from './types'
import { generateId } from './utils/snowflake'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import ChatArea from './components/ChatArea'
import InputArea from './components/InputArea'
import './App.css'

function App(): JSX.Element {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState<string>('')
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const isResizing = useRef(false)

  useEffect(() => {
    window.storage.loadSessions().then((data) => {
      const loaded: ChatSession[] = data.map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        messages: s.messages.map((m) => ({
          id: m.id,
          content: m.content,
          sender: m.sender as 'user' | 'bot',
          timestamp: new Date(m.timestamp),
        })),
      }))
      setSessions(loaded)
      if (loaded.length > 0) {
        setCurrentSessionId(loaded[0].id)
      }
    })
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      setSidebarWidth(Math.min(480, Math.max(200, e.clientX)))
    }
    const onMouseUp = () => {
      if (!isResizing.current) return
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const currentSession = sessions.find((s) => s.id === currentSessionId)

  const handleSendMessage = (): void => {
    if (inputValue.trim() === '' || !currentSessionId) return

    const newMessage: Message = {
      id: generateId(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    }

    setSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId
          ? { ...session, messages: [...session.messages, newMessage], updatedAt: new Date() }
          : session
      )
    )

    setInputValue('')

    window.storage.createMessage(currentSessionId, {
      id: newMessage.id,
      content: newMessage.content,
      sender: newMessage.sender,
      timestamp: newMessage.timestamp.toISOString(),
    })
  }

  const handleNewChat = async (): Promise<void> => {
    const newSessionId = generateId()
    const title = await window.storage.createSession(newSessionId)
    const newSession: ChatSession = {
      id: newSessionId,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setSessions((prev) => [newSession, ...prev])
    setCurrentSessionId(newSessionId)
  }

  const handleDeleteSession = (sessionId: string): void => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null)
    }
    window.storage.deleteSession(sessionId)
  }

  return (
    <div className="flex h-screen">
      <div className="flex flex-col bg-white" style={{ width: sidebarWidth, minWidth: 200, maxWidth: 480 }}>
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      <div
        className="relative w-0 flex-shrink-0 group"
      >
        <div
          className="absolute top-0 -left-2 w-4 h-full cursor-col-resize z-10"
          onMouseDown={() => {
            isResizing.current = true
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
          }}
        />
        <div className="absolute top-0 left-0 w-px h-full bg-gray-200 group-hover:bg-blue-400 transition-colors pointer-events-none" />
      </div>

      <div className="flex-1 flex flex-col bg-gray-50">
        <TitleBar />
        <ChatArea messages={currentSession?.messages ?? []} />
        <InputArea
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          currentSessionId={currentSessionId}
        />
      </div>
    </div>
  )
}

export default App
