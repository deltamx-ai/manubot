import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import { Message } from '../types'

interface ChatAreaProps {
  messages: Message[]
}

function ChatArea({ messages }: ChatAreaProps): JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-auto p-4">
      {messages.length > 0 ? (
        <>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={bottomRef} />
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}
    </div>
  )
}

export default ChatArea
