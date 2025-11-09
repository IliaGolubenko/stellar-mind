import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import OpenAI from 'openai'
import { Canvas } from '@react-three/fiber'
import type { ResponseInput } from 'openai/resources/responses/responses'

import type { Exoplanet } from '../types/exoplanet'
import { IS_DEV } from '../utils/constants'
import { getPlanetBaseColor, getPlanetVisual } from './GalaxyScene/utils'
import PlanetMesh from './GalaxyScene/PlanetMesh'

type ChatRole = 'assistant' | 'user'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

type ModelInputMessage = ResponseInput[number]

const CHAT_SUGGESTIONS = [
  'Что это за планета?',
  'Есть ли жизнь на планете?',
  'Далеко ли находится планета?',
  'Какая атмосфера у планеты?',
] as const

interface PlanetTooltipProps {
  planet: Exoplanet | null
  visible: boolean
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

const buildPlanetContextPayload = (planet: Exoplanet) =>
  JSON.stringify(
    {
      planet,
      derived: computeDerivedMetrics(planet),
    },
    null,
    2,
  )

const MISSION_CONTROL_PROMPT = `
Ты — научный коммуникатор-астроном. Твоя задача — превратить сырые параметры экзопланет из JSON в короткую и понятную человеку интерпретацию для UI карточки.
Правила:
- Пиши по-русски, в тоне: дружелюбно и просто, без жаргона.
- Никаких рассуждений о твоих шагах. Сразу ответ-резюме.
- Используй ТОЛЬКО данные из входного JSON, плюс элементарные выводы (тип планеты по плотности/радиусу/температуре, приливная блокировка при сверхкоротком периоде и т. п.).
- Указывай единицы измерения и явно помечай допущения (например, что pl_eqt, как правило, в K).
- Если какие-то поля отсутствуют или вызывают сомнение по единицам (например, st_lum), вежливо отметь это и не делай смелых выводов на их основе.
- Не давай противоречивых ярлыков (например, «ледяной мир» при температуре 1500°C).
- Короткая структура ответа:
  1) «Что это за мир» — 2–3 предложения.
  2) «Ключевые цифры» — 4–7 маркеров с пересчётами (гравитация vs Земля, период в часах и т. п.).
  3) «Сравнение с Землёй» — 1–2 предложения.
  3) «Атмосфера и поверхность» — оцени возможность наличия атмосферы и предположи её состав или цвет (по albedo, температуре, массе, плотности, specflag, tranflag).
  4) «Потенциал для жизни или колонизации» — краткая оценка, пригодна ли планета для жизни (вода, температура, радиация, гравитация, устойчивость атмосферы).
- Можно делать простые производные:
  * g_rel ≈ (pl_bmasse / pl_rade^2) в g_Земли, если pl_bmasse и pl_rade заданы в земных единицах.
  * Период в часах = pl_orbper * 24.
  * Если pl_eqt в К: t_C ≈ pl_eqt − 273.15.
- Если есть явная неоднозначность единиц — упомяни это и дай диапазон/оговорку.
- Форматируй в Markdown.
`.trim()

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const buildModelInput = (planet: Exoplanet, messages: ChatMessage[]): ResponseInput => {
  const planetJson = buildPlanetContextPayload(planet)

  const baseContext: ModelInputMessage[] = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: MISSION_CONTROL_PROMPT }],
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

const PlanetTooltip = ({ planet, visible, onClose }: PlanetTooltipProps) => {
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
  const [chatError, setChatError] = useState<string | null>(null)
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
    setChatError(null)
    setChatMessages([
      {
        id: generateId(),
        role: 'assistant',
        content: `I'm Mission Control. Ask me anything about ${planet.pl_name} or the data NASA captured.`,
      },
    ])
  }, [planet])

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

      if (!openAiClient) {
        setChatError('Set VITE_OPENAI_API_KEY in your environment to chat with Mission Control.')
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
      setChatError(null)

      try {
        const modelInput = buildModelInput(planet, contextMessages)
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
          setChatError('Unable to reach the AI service. Check your network or API key.')
        })

        await stream.done()

        setChatMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id && message.content.trim().length === 0
              ? { ...message, content: 'Ответ не получен. Попробуйте ещё раз.' }
              : message,
          ),
        )
      } catch (error) {
        setChatError('Unable to reach the AI service. Check your network or API key.')
        setChatMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: 'Не удалось получить ответ от ИИ.' }
              : message,
          ),
        )
      } finally {
        setIsChatLoading(false)
      }
    },
    [chatMessages, isChatLoading, openAiClient, planet],
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
  return (
    <aside className="tooltip" role="dialog" aria-modal="false">
      <header className="tooltip__header">
        <div className="tooltip__header-text">
          <p>Featured Exoplanet</p>
          <h2>{planet.pl_name}</h2>
        </div>
        <button
          type="button"
          className="tooltip__close"
          onClick={onClose}
          aria-label="Close planet details"
        >
          Close
        </button>
      </header>
      <div
        className="tooltip__planet-preview"
        style={{ width: '100%', height: viewMode === 'chat' ? '120px' :'480px', pointerEvents: 'none' }}
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
        <label>
          <input
            type="checkbox"
            checked={showAtmosphere}
            onChange={(event) => setShowAtmosphere(event.target.checked)}
          />
          Show atmosphere
        </label>
        <button
          type="button"
          className="tooltip__toggle"
          onClick={() => setViewMode((current) => (current === 'data' ? 'chat' : 'data'))}
        >
          {viewMode === 'chat' ? 'Show planet data' : 'Open AI chat'}
        </button>
      </div>
      {viewMode === 'data' ? (
        <ul>
          {devMetadata && renderMetric('Texture Key (dev)', devMetadata.textureKey)}
          {devMetadata && renderMetric('Atmosphere (dev)', devMetadata.atmosphere)}
          {renderMetric('Host Star', planet.hostname)}
          {renderMetric('Discovery Method', planet.discoverymethod)}
          {renderMetric('Discovery Year', planet.disc_year)}
          {renderMetric(
            'Orbital Period (days)',
            planet.pl_orbper !== null ? formatNumber(planet.pl_orbper) : null,
          )}
          {renderMetric(
            'Planet Radius (Earth = 1)',
            planet.pl_rade !== null ? formatNumber(planet.pl_rade) : null,
          )}
          {renderMetric(
            'Planet Mass (Earth = 1)',
            planet.pl_bmasse !== null ? formatNumber(planet.pl_bmasse) : null,
          )}
          {renderMetric(
            'Planet Density (g/cm^3)',
            planet.pl_dens !== null ? formatNumber(planet.pl_dens) : null,
          )}
          {renderMetric('Equilibrium Temp (Celsius)', formatTemperatureCelsius(planet.pl_eqt))}
        </ul>
      ) : (
        <div className="tooltip__chat">
          <div className="tooltip__chat-suggestions" aria-label="Примеры вопросов">
            {CHAT_SUGGESTIONS.map((question) => (
              <button
                type="button"
                key={question}
                onClick={() => handleSuggestionClick(question)}
                disabled={isChatLoading}
              >
                {question}
              </button>
            ))}
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
                <p>Calculating a response…</p>
              </div>
            )}
          </div>
          {chatError && <p className="tooltip__chat-error">{chatError}</p>}
          <form className="tooltip__chat-form" onSubmit={handleChatSubmit}>
            <input
              type="text"
              name="prompt"
              placeholder={`Ask about ${planet.pl_name}…`}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              disabled={isChatLoading}
            />
            <button type="submit" disabled={isChatLoading || chatInput.trim().length === 0}>
              {isChatLoading ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </aside>
  )
}

export default PlanetTooltip
