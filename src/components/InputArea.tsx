import { useEffect, useRef } from 'react'

interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  currentSessionId: string | null
}

function InputArea({
  value,
  onChange,
  onSend,
  currentSessionId,
}: InputAreaProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [currentSessionId])

  return (
    <div className="h-20 border-t border-gray-300 bg-white p-4 flex-shrink-0">
      <div className="flex gap-2 h-full">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onSend}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex-shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default InputArea
