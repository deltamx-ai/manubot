import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import CodeBlock from './CodeBlock'
import { Message } from '../types'

interface MessageBubbleProps {
  message: Message
}

function MessageBubble({ message }: MessageBubbleProps): JSX.Element {
  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text).catch(() => {
      console.error('Failed to copy to clipboard')
    })
  }

  const renderedContent = useMemo(
    () => (
      <ReactMarkdown
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ inline, className, children }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const lang = match ? match[1] : ''
            const codeString = String(children).replace(/\n$/, '')

            if (!inline) {
              return <CodeBlock language={lang} code={codeString} />
            }

            return (
              <code className="bg-gray-300 px-1 rounded text-gray-900 font-mono">
                {children}
              </code>
            )
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pre: ({ children }: any) => <div className="my-2">{children}</div>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-4 border-gray-400 pl-3 italic opacity-70 my-2">
              {children}
            </blockquote>
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          a: ({ href, children, ...props }: any) => (
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
    ),
    [message.content]
  )

  return (
    <div
      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-2xl px-4 py-2 rounded-lg group relative ${
          message.sender === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-800'
        }`}
      >
        <div className="markdown-content">{renderedContent}</div>
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
  )
}

export default MessageBubble
