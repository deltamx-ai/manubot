import { useState, useEffect, useRef } from 'react'
import { ProviderInfo } from '../types'

type OAuthState = 'idle' | 'pending' | 'signed-in'

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
  const [systemPrompt, setSystemPrompt] = useState('')

  // OAuth state
  const [oauthState, setOauthState] = useState<OAuthState>('idle')
  const [userCode, setUserCode] = useState('')
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)

  // Dynamic models for OAuth providers
  const [dynamicModels, setDynamicModels] = useState<string[]>([])

  const clearPoll = () => {
    cancelledRef.current = true
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    Promise.all([
      window.settings.getProviders(),
      window.settings.getActive(),
      window.settings.getSystemPrompt(),
    ]).then(([providerList, active, prompt]) => {
      setProviders(providerList)
      setActiveProvider(active.provider)
      setActiveModel(active.model ?? providerList.find((p) => p.id === active.provider)?.models[0] ?? '')
      window.settings.hasApiKey(active.provider).then((has) => {
        setHasKey(has)
        const provider = providerList.find((p) => p.id === active.provider)
        if (provider?.authType === 'oauth' && has) {
          setOauthState('signed-in')
          loadDynamicModels(active.model ?? '')
        }
      })
      setSystemPrompt(prompt)
    })
    return () => clearPoll()
  }, [])

  const currentProvider = providers.find((p) => p.id === activeProvider)
  const isOAuth = currentProvider?.authType === 'oauth'
  const displayModels = isOAuth ? dynamicModels : (currentProvider?.models ?? [])

  const loadDynamicModels = async (currentModel: string) => {
    try {
      const models = await window.copilot.fetchModels()
      setDynamicModels(models)
      if (currentModel && models.includes(currentModel)) {
        setActiveModel(currentModel)
      } else if (models.length > 0) {
        setActiveModel(models[0])
        await window.settings.setActive(activeProvider || 'copilot', models[0])
      }
    } catch {
      setStatus({ type: 'error', message: 'Failed to load models.' })
    }
  }

  const handleProviderChange = async (providerId: string) => {
    setActiveProvider(providerId)
    const provider = providers.find((p) => p.id === providerId)
    setApiKey('')
    setStatus(null)
    clearPoll()
    setDynamicModels([])

    const has = await window.settings.hasApiKey(providerId)
    setHasKey(has)

    if (provider?.authType === 'oauth') {
      if (has) {
        setOauthState('signed-in')
        const model = activeModel
        await window.settings.setActive(providerId, model)
        loadDynamicModels(model)
      } else {
        setOauthState('idle')
        setActiveModel('')
        await window.settings.setActive(providerId, '')
      }
    } else {
      setOauthState('idle')
      const model = provider?.models[0] ?? ''
      setActiveModel(model)
      await window.settings.setActive(providerId, model)
    }
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

  const handleStartOAuth = async () => {
    setStatus(null)
    try {
      const data = await window.copilot.startAuth()
      setUserCode(data.userCode)
      setOauthState('pending')

      const interval = (data.interval || 5) * 1000
      cancelledRef.current = false

      const poll = async () => {
        if (cancelledRef.current) return
        try {
          const result = await window.copilot.pollAuth(data.deviceCode)
          if (cancelledRef.current) return
          if (result.status === 'token') {
            clearPoll()
            setOauthState('signed-in')
            setHasKey(true)
            setStatus({ type: 'success', message: 'Signed in to GitHub Copilot.' })
            loadDynamicModels('')
          } else if (result.status === 'expired') {
            clearPoll()
            setOauthState('idle')
            setStatus({ type: 'error', message: 'Authorization expired. Please try again.' })
          } else {
            pollRef.current = setTimeout(poll, interval)
          }
        } catch (err) {
          if (cancelledRef.current) return
          clearPoll()
          setOauthState('idle')
          setStatus({ type: 'error', message: `Authorization failed: ${err instanceof Error ? err.message : String(err)}` })
        }
      }

      pollRef.current = setTimeout(poll, interval)
    } catch (err) {
      setStatus({ type: 'error', message: `Failed to start auth: ${err instanceof Error ? err.message : String(err)}` })
    }
  }

  const handleReauth = () => {
    setOauthState('idle')
    setHasKey(false)
    setDynamicModels([])
    setStatus(null)
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
              disabled={isOAuth && displayModels.length === 0}
            >
              {displayModels.length === 0 && isOAuth ? (
                <option value="">Sign in to load models</option>
              ) : (
                displayModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))
              )}
            </select>
          </div>

          {/* Auth section — conditional on provider type */}
          {isOAuth ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GitHub Account</label>
              {oauthState === 'idle' && (
                <button
                  onClick={handleStartOAuth}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                >
                  Sign in with GitHub
                </button>
              )}
              {oauthState === 'pending' && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">Enter this code on GitHub:</p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-gray-900">{userCode}</p>
                  <p className="text-xs text-gray-500">Waiting for authorization...</p>
                </div>
              )}
              {oauthState === 'signed-in' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600 font-medium">Signed in</span>
                  <button
                    onClick={handleReauth}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Re-authenticate
                  </button>
                </div>
              )}
            </div>
          ) : (
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
          )}

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              onBlur={() => window.settings.setSystemPrompt(systemPrompt)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical text-sm"
              placeholder="Enter system prompt..."
            />
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
