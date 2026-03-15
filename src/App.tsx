import { useState, useRef, useEffect } from 'react'
import { ChatSession, Message } from './types'
import { generateId } from './utils/snowflake'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import ChatArea from './components/ChatArea'
import InputArea from './components/InputArea'
import SettingsModal from './components/SettingsModal'
import './App.css'

function App(): JSX.Element {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState<string>('')
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isStreaming, setIsStreaming] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isResizing = useRef(false)
  const streamingSessionId = useRef<string | null>(null)

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

  // LLM stream listeners
  useEffect(() => {
    const offChunk = window.llm.onChunk(({ sessionId, text }) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last && last.sender === 'bot') {
            msgs[msgs.length - 1] = { ...last, content: last.content + text }
          }
          return { ...s, messages: msgs }
        })
      )
    })

    const offDone = window.llm.onDone(({ sessionId, fullText }) => {
      setIsStreaming(false)
      streamingSessionId.current = null

      // Persist bot message
      setSessions((prev) => {
        const session = prev.find((s) => s.id === sessionId)
        const lastMsg = session?.messages[session.messages.length - 1]
        if (lastMsg && lastMsg.sender === 'bot') {
          window.storage.createMessage(sessionId, {
            id: lastMsg.id,
            content: fullText,
            sender: 'bot',
            timestamp: lastMsg.timestamp.toISOString(),
          })
        }
        return prev
      })
    })

    const offError = window.llm.onError(({ sessionId, error }) => {
      setIsStreaming(false)
      streamingSessionId.current = null

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last && last.sender === 'bot' && last.content === '') {
            msgs[msgs.length - 1] = { ...last, content: `Error: ${error}` }
          } else {
            msgs.push({
              id: generateId(),
              content: `Error: ${error}`,
              sender: 'bot',
              timestamp: new Date(),
            })
          }
          return { ...s, messages: msgs }
        })
      )
    })

    return () => {
      offChunk()
      offDone()
      offError()
    }
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
    if (inputValue.trim() === '' || !currentSessionId || isStreaming) return

    const userMessage: Message = {
      id: generateId(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    }

    const botMessage: Message = {
      id: generateId(),
      content: '',
      sender: 'bot',
      timestamp: new Date(),
    }

    setSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId
          ? { ...session, messages: [...session.messages, userMessage, botMessage], updatedAt: new Date() }
          : session
      )
    )

    setInputValue('')
    setIsStreaming(true)
    streamingSessionId.current = currentSessionId

    window.storage.createMessage(currentSessionId, {
      id: userMessage.id,
      content: userMessage.content,
      sender: userMessage.sender,
      timestamp: userMessage.timestamp.toISOString(),
    })

    // Build message history for LLM
    const currentMessages = sessions.find((s) => s.id === currentSessionId)?.messages ?? []
    const llmMessages = [
      ...currentMessages.map((m) => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      })),
      { role: 'user' as const, content: inputValue },
    ]

    window.llm.chat(currentSessionId, llmMessages)
  }

  const handleStopStreaming = (): void => {
    window.llm.abort()
    setIsStreaming(false)
    streamingSessionId.current = null
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
          onOpenSettings={() => setSettingsOpen(true)}
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
          onStop={handleStopStreaming}
          isStreaming={isStreaming}
          currentSessionId={currentSessionId}
        />
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

export default App
