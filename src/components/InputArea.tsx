import { useEffect, useRef } from 'react'

interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  isStreaming: boolean
  currentSessionId: string | null
}

function InputArea({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  currentSessionId,
}: InputAreaProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [currentSessionId])

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (isStreaming) return
              onSend()
            }
          }}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex-shrink-0"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={onSend}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex-shrink-0"
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}

export default InputArea
