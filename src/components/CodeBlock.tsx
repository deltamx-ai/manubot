import hljs from '../lib/highlight'

interface CodeBlockProps {
  language: string
  code: string
}

function CodeBlock({ language, code }: CodeBlockProps): JSX.Element {
  const highlighted =
    language && hljs.getLanguage(language)
      ? hljs.highlight(code, { language })
      : hljs.highlightAuto(code)

  const copyToClipboard = (): void => {
    navigator.clipboard.writeText(code).catch(() => {
      console.error('Failed to copy to clipboard')
    })
  }

  return (
    <div className="relative bg-gray-900 text-gray-100 rounded my-2 overflow-x-auto pb-10">
      <pre className="p-3">
        <code
          className={`hljs language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted.value }}
        />
      </pre>
      <button
        onClick={copyToClipboard}
        className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white"
      >
        Copy
      </button>
    </div>
  )
}

export default CodeBlock
