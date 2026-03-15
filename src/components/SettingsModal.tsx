import { useState, useEffect } from 'react'
import { ProviderInfo } from '../types'

interface SettingsModalProps {
  onClose: () => void
}

function SettingsModal({ onClose }: SettingsModalProps): JSX.Element {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [activeProvider, setActiveProvider] = useState('')
  const [activeModel, setActiveModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    Promise.all([
      window.settings.getProviders(),
      window.settings.getActive(),
    ]).then(([providerList, active]) => {
      setProviders(providerList)
      setActiveProvider(active.provider)
      setActiveModel(active.model ?? providerList.find((p) => p.id === active.provider)?.models[0] ?? '')
      window.settings.hasApiKey(active.provider).then(setHasKey)
    })
  }, [])

  const currentProvider = providers.find((p) => p.id === activeProvider)

  const handleProviderChange = async (providerId: string) => {
    setActiveProvider(providerId)
    const provider = providers.find((p) => p.id === providerId)
    const model = provider?.models[0] ?? ''
    setActiveModel(model)
    setApiKey('')
    setStatus(null)
    const has = await window.settings.hasApiKey(providerId)
    setHasKey(has)
    await window.settings.setActive(providerId, model)
  }

  const handleModelChange = async (model: string) => {
    setActiveModel(model)
    await window.settings.setActive(activeProvider, model)
  }

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    setStatus(null)
    try {
      await window.settings.setApiKey(activeProvider, apiKey.trim())
      setHasKey(true)
      setApiKey('')
      setStatus({ type: 'success', message: 'API Key saved and validated.' })
    } catch (err) {
      setStatus({ type: 'error', message: `Validation failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-[480px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={activeProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <select
              value={activeModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currentProvider?.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
              {hasKey && (
                <span className="ml-2 text-xs text-green-600 font-normal">Configured</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasKey ? 'Enter new key to replace...' : 'Enter API Key...'}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveKey()
                }}
              />
              <button
                onClick={handleSaveKey}
                disabled={saving || !apiKey.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex-shrink-0"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Status message */}
          {status && (
            <p className={`text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {status.message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
