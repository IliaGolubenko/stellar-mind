import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import OpenAI from 'openai'
import { Canvas } from '@react-three/fiber'
import type { ResponseInput } from 'openai/resources/responses/responses'

import type { Exoplanet } from '../types/exoplanet'
import { IS_DEV } from '../utils/constants'
import { getPlanetBaseColor, getPlanetVisual } from './GalaxyScene/utils'
import PlanetMesh from './GalaxyScene/PlanetMesh'
import { useLanguage } from '../i18n/LanguageProvider'
import type { TranslationKey } from '../i18n/translations'
import type { PlanetDetailRecord } from '../utils/planetDetails'

type ChatRole = 'assistant' | 'user'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

type ModelInputMessage = ResponseInput[number]

interface ChatSuggestion {
  labelKey: TranslationKey
  promptKey: TranslationKey
}

const CHAT_SUGGESTIONS: ChatSuggestion[] = [
  { labelKey: 'tooltip.suggestion.aboutPlanet', promptKey: 'tooltip.prompt.aboutPlanet' },
  { labelKey: 'tooltip.suggestion.life', promptKey: 'tooltip.prompt.life' },
  { labelKey: 'tooltip.suggestion.distance', promptKey: 'tooltip.prompt.distance' },
  { labelKey: 'tooltip.suggestion.atmosphere', promptKey: 'tooltip.prompt.atmosphere' },
]

const SPACE_KEYWORDS = [
  'space',
  'cosmos',
  'cosmic',
  'astronomy',
  'astronom',
  'astrophys',
  'galaxy',
  'planet',
  'exoplanet',
  'star',
  'nasa',
  'orbit',
  'orbital',
  'telescope',
  'satellite',
  'astronaut',
  'cosmonaut',
  'comet',
  'meteor',
  'nebula',
  'constellation',
  'lunar',
  'mars',
  'venus',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'космос',
  'космич',
  'астро',
  'галак',
  'планет',
  'звезд',
  'орбит',
  'экзопланет',
  'спутник',
  'космонавт',
  'комета',
  'метеор',
  'туманность',
]

interface PlanetTooltipProps {
  planet: Exoplanet | null
  visible: boolean
  detailedPlanet: PlanetDetailRecord | null
  detailStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  detailError: string | null
  onClose: () => void
}

const renderMetric = (label: string, value: string | number | null) => (
  <li>
    <span>{label}</span>
    <strong>{value ?? 'N/A'}</strong>
  </li>
)

const formatNumber = (value: number | null, digits = 2) => {
  if (value === null || Number.isNaN(value)) return 'N/A'

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: digits })
  }

  return value.toFixed(digits)
}

const formatTemperatureCelsius = (kelvin: number | null) => {
  if (kelvin === null || Number.isNaN(kelvin)) return 'N/A'

  const celsius = kelvin - 273.15
  return formatNumber(celsius, 0)
}

const computeDerivedMetrics = (planet: Exoplanet) => ({
  gravity_relative_to_earth:
    planet.pl_bmasse !== null && planet.pl_rade !== null && planet.pl_rade !== 0
      ? planet.pl_bmasse / planet.pl_rade ** 2
      : null,
  orbital_period_hours: planet.pl_orbper !== null ? planet.pl_orbper * 24 : null,
  equilibrium_temp_celsius: planet.pl_eqt !== null ? planet.pl_eqt - 273.15 : null,
})

const filterNullValues = (record: PlanetDetailRecord | null) => {
  if (!record) return null
  return Object.fromEntries(
    Object.entries(record).filter(
      ([, value]) => value !== null && value !== undefined && value !== '',
    ),
  )
}

const buildPlanetContextPayload = (planet: Exoplanet, detailedPlanet?: PlanetDetailRecord | null) =>
  JSON.stringify(
    detailedPlanet
      ? { detailed: filterNullValues(detailedPlanet), derived: computeDerivedMetrics(planet) }
      : { planet, derived: computeDerivedMetrics(planet) },
    null,
    2,
  )

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const isSpaceRelated = (text: string, planetName: string) => {
  const normalized = text.toLowerCase()
  if (normalized.includes(planetName.toLowerCase())) {
    return true
  }

  return SPACE_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

const buildModelInput = (
  planet: Exoplanet,
  messages: ChatMessage[],
  detailedPlanet: PlanetDetailRecord | null,
  missionPrompt: string,
): ResponseInput => {
  const planetJson = buildPlanetContextPayload(planet, detailedPlanet)
  console.log('planet', planet)
  console.log('detailedPlanet', detailedPlanet)
  console.log('planetJson', planetJson)
  const baseContext: ModelInputMessage[] = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: missionPrompt }],
    },
    {
      role: 'system',
      content: [
        {
          type: 'input_text',
          text: `Данные планеты (JSON + простые производные):\n${planetJson}`,
        },
      ],
    },
  ]

  const result: ModelInputMessage[] = [
    ...baseContext,
    ...messages.map<ModelInputMessage>(({ role, content }) => ({
      role,
      content: [
        {
          type: role === 'assistant' ? 'output_text' : 'input_text',
          text: content,
        },
      ],
    })),
  ]

  return result as ResponseInput
}

const PlanetTooltip = ({
  planet,
  visible,
  detailedPlanet,
  detailStatus,
  detailError,
  onClose,
}: PlanetTooltipProps) => {
  const { t } = useLanguage()
  const missionPrompt = t('tooltip.missionPrompt')
  const visual = useMemo(() => (planet ? getPlanetVisual(planet) : null), [planet])
  const previewBaseColor = useMemo(
    () => (visual ? getPlanetBaseColor(visual.type) : '#ffffff'),
    [visual],
  )
  const [showAtmosphere, setShowAtmosphere] = useState(true)
  const [viewMode, setViewMode] = useState<'data' | 'chat'>('data')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatErrorKey, setChatErrorKey] = useState<TranslationKey | null>(null)
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY
  const openAiClient = useMemo(
    () =>
      openAiApiKey
        ? new OpenAI({
            apiKey: openAiApiKey,
            dangerouslyAllowBrowser: true,
          })
        : null,
    [openAiApiKey],
  )

  useEffect(() => {
    if (!planet) return

    setViewMode('data')
    setChatInput('')
    setChatErrorKey(null)
    setChatMessages([
      {
        id: generateId(),
        role: 'assistant',
        content: t('tooltip.chatIntro', { planet: planet.pl_name }),
      },
    ])
  }, [planet, t])

  useEffect(() => {
    const chatLog = chatLogRef.current
    if (!chatLog) return
    chatLog.scrollTop = chatLog.scrollHeight
  }, [chatMessages, isChatLoading])

  const sendPrompt = useCallback(
    async (rawPrompt: string) => {
      if (!planet || isChatLoading) return

      const prompt = rawPrompt.trim()
      if (!prompt) return

      if (!isSpaceRelated(prompt, planet.pl_name)) {
        setChatErrorKey('tooltip.chatNonSpaceError')
        return
      }

      if (!openAiClient) {
        setChatErrorKey('tooltip.chatMissingKey')
        return
      }

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: prompt,
      }
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
      }

      const contextMessages = [...chatMessages, userMessage]

      setChatMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsChatLoading(true)
      setChatErrorKey(null)

      try {
        const modelInput = buildModelInput(planet, contextMessages, detailedPlanet, missionPrompt)
        const stream = await openAiClient.responses.stream({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          input: modelInput,
        })

        stream.on('response.output_text.delta', (event) => {
          const snapshot = event.snapshot ?? ''
          setChatMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessage.id ? { ...message, content: snapshot } : message,
            ),
          )
        })

        stream.on('error', () => {
          setChatErrorKey('tooltip.chatAiUnavailable')
        })

        await stream.done()

        setChatMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id && message.content.trim().length === 0
              ? { ...message, content: t('tooltip.chatNoResponse') }
              : message,
          ),
        )
      } catch (error) {
        setChatErrorKey('tooltip.chatAiUnavailable')
        setChatMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: t('tooltip.chatAiUnavailable') }
              : message,
          ),
        )
      } finally {
        setIsChatLoading(false)
      }
    },
    [chatMessages, detailedPlanet, isChatLoading, missionPrompt, openAiClient, planet, t],
  )

  const handleChatSubmit = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      if (!planet) return

      const prompt = chatInput.trim()
      if (!prompt) return

      setChatInput('')
      sendPrompt(prompt)
    },
    [chatInput, planet, sendPrompt],
  )

  const handleSuggestionClick = useCallback(
    (question: string) => {
      setViewMode('chat')
      sendPrompt(question)
    },
    [sendPrompt],
  )

  if (!visible || !planet || !visual) {
    return null
  }

  const devMetadata = IS_DEV ? visual : null
  const chatErrorMessage = chatErrorKey ? t(chatErrorKey) : null
  return (
    <aside className="tooltip" role="dialog" aria-modal="false">
      <header className="tooltip__header">
        <div className="tooltip__header-text">
          <p>{t('tooltip.featured')}</p>
          <h2>{planet.pl_name}</h2>
        </div>
        <button
          type="button"
          className="tooltip__close"
          onClick={onClose}
          aria-label={t('tooltip.closeAria')}
        >
          {t('tooltip.closeButton')}
        </button>
      </header>
      <div
        className="tooltip__planet-preview"
        style={{
          width: '100%',
          height: viewMode === 'chat' ? '120px' : '480px',
          pointerEvents: 'none',
        }}
      >
        <Canvas camera={{ position: [0, 0, 2.4], fov: 60 }}>
          <ambientLight intensity={0.6} />
          <directionalLight intensity={1.2} position={[2, 2.4, 3]} />
          <Suspense fallback={null}>
            <PlanetMesh
              planet={planet}
              baseColor={previewBaseColor}
              scale={1}
              rotationSpeed={0.18}
              showAtmosphere={showAtmosphere}
              emissiveIntensityMultiplier={0.55}
            />
          </Suspense>
        </Canvas>
      </div>
      <div className="tooltip__controls">
        {detailStatus === 'loading' && (
          <p className="tooltip__detail-status">
            <span className="tooltip__detail-spinner" aria-hidden="true" />
            {t('tooltip.detail.loading')}
          </p>
        )}
        {detailStatus === 'failed' && detailError && (
          <p className="tooltip__detail-status tooltip__detail-status--error">
            {t('tooltip.detail.error', { error: detailError })}
          </p>
        )}
        <label>
          <input
            type="checkbox"
            checked={showAtmosphere}
            onChange={(event) => setShowAtmosphere(event.target.checked)}
          />
          {t('tooltip.showAtmosphere')}
        </label>
        <button
          type="button"
          className="tooltip__toggle"
          onClick={() => setViewMode((current) => (current === 'data' ? 'chat' : 'data'))}
        >
          {viewMode === 'chat' ? t('tooltip.showData') : t('tooltip.openChat')}
        </button>
      </div>
      {viewMode === 'data' ? (
        <ul>
          {devMetadata && renderMetric(t('tooltip.dev.textureKey'), devMetadata.textureKey)}
          {devMetadata && renderMetric(t('tooltip.dev.atmosphere'), devMetadata.atmosphere)}
          {renderMetric(t('tooltip.metrics.hostStar'), planet.hostname)}
          {renderMetric(t('tooltip.metrics.discoveryMethod'), planet.discoverymethod)}
          {renderMetric(t('tooltip.metrics.discoveryYear'), planet.disc_year)}
          {renderMetric(
            t('tooltip.metrics.orbitalPeriod'),
            planet.pl_orbper !== null ? formatNumber(planet.pl_orbper) : null,
          )}
          {renderMetric(
            t('tooltip.metrics.radius'),
            planet.pl_rade !== null ? formatNumber(planet.pl_rade) : null,
          )}
          {renderMetric(
            t('tooltip.metrics.mass'),
            planet.pl_bmasse !== null ? formatNumber(planet.pl_bmasse) : null,
          )}
          {renderMetric(
            t('tooltip.metrics.density'),
            planet.pl_dens !== null ? formatNumber(planet.pl_dens) : null,
          )}
          {renderMetric(t('tooltip.metrics.temperature'), formatTemperatureCelsius(planet.pl_eqt))}
        </ul>
      ) : (
        <div className="tooltip__chat">
          <p className="tooltip__chat-restriction">{t('tooltip.chatRestrictionNotice')}</p>
          <div className="tooltip__chat-suggestions" aria-label={t('tooltip.suggestions.aria')}>
            {CHAT_SUGGESTIONS.map((suggestion) => {
              const label = t(suggestion.labelKey)
              const prompt = t(suggestion.promptKey, { planet: planet.pl_name })
              return (
                <button
                  type="button"
                  key={suggestion.labelKey}
                  onClick={() => handleSuggestionClick(prompt)}
                  disabled={isChatLoading}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="tooltip__chat-log" ref={chatLogRef}>
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`tooltip__chat-message tooltip__chat-message--${message.role}`}
              >
                <div className="tooltip__chat-markdown">
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="tooltip__chat-message tooltip__chat-message--assistant is-loading">
                <p>{t('tooltip.chatLoading')}</p>
              </div>
            )}
          </div>
          {chatErrorMessage && <p className="tooltip__chat-error">{chatErrorMessage}</p>}
          <form className="tooltip__chat-form" onSubmit={handleChatSubmit}>
            <input
              type="text"
              name="prompt"
              autoComplete="off"
              placeholder={t('tooltip.chatPlaceholder', { planet: planet.pl_name })}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              disabled={isChatLoading}
            />
            <button type="submit" disabled={isChatLoading || chatInput.trim().length === 0}>
              {isChatLoading ? t('tooltip.chatSending') : t('tooltip.chatSend')}
            </button>
          </form>
        </div>
      )}
    </aside>
  )
}

export default PlanetTooltip
