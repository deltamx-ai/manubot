import { useState, useRef, useEffect } from 'react'
import { ChatSession, Message } from './types'
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
      id: `${Date.now()}`,
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

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: `${Date.now()}`,
        content: 'This is a bot response.',
        sender: 'bot',
        timestamp: new Date(),
      }

      setSessions((prev) =>
        prev.map((session) =>
          session.id === currentSessionId
            ? { ...session, messages: [...session.messages, botMessage], updatedAt: new Date() }
            : session
        )
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
    setSessions((prev) => [...prev, newSession])
    setCurrentSessionId(newSessionId)
  }

  const handleDeleteSession = (sessionId: string): void => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null)
    }
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
        className="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-500 transition-colors flex-shrink-0"
        onMouseDown={() => {
          isResizing.current = true
          document.body.style.cursor = 'col-resize'
          document.body.style.userSelect = 'none'
        }}
      />

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
