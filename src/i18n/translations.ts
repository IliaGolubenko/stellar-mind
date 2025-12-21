export type Language = 'en' | 'ru'

export const translations: Record<
  Language,
  Record<string, string>
> = {
  en: {
    'language.label': 'Language',
    'language.en': 'English',
    'language.ru': 'Русский',
    'status.loading': 'Summoning the cosmos...',
    'status.error': 'Unable to reach the NASA archive: {{error}}',
    'status.retry': 'Reload page',
    'status.empty': 'No exoplanets available right now. Try again soon.',
    'header.title': 'Stellar Mind Observatory',
    'header.description':
      'Spin the galaxy, discover planets inspired by NASA’s Exoplanet Archive, and learn their stories.',
    'advanced.toggle.show': 'Advanced mode',
    'advanced.toggle.hide': 'Hide advanced mode',
    'advanced.search.placeholder': 'Search by planet name (e.g., Kepler)',
    'advanced.search.button': 'Search',
    'advanced.tabs.earthlike': 'Earth-like prospects',
    'advanced.tabs.distance': 'Closest neighbors',
    'advanced.earthlike.filterLabel': 'Habitable filter',
    'advanced.earthlike.mode.off': 'Include all Earth-like candidates',
    'advanced.earthlike.mode.relaxed': 'Prefer habitable zone (balanced)',
    'advanced.earthlike.mode.strict': 'Strict habitable zone only',
    'advanced.earthlike.strictHint': 'Strict mode may return very few planets.',
    'advanced.status.fetching': 'Fetching data…',
    'advanced.status.error': 'Unable to load data: {{error}}',
    'advanced.status.noResults': 'No planets matched the query.',
    'advanced.status.enterTerm': 'Enter a planet name to search.',
    'advanced.status.searchResults': 'Search results for “{{term}}”.',
    'advanced.status.loadingMore': 'Loading more planets…',
    'advanced.status.endOfList': 'You’ve reached the end of this list.',
    'advanced.table.planet': 'Planet',
    'advanced.table.distance': 'Distance (ly)',
    'advanced.table.radius': 'Radius (R⊕)',
    'advanced.table.mass': 'Mass (M⊕)',
    'advanced.table.temperature': 'Eq. temp (K)',
    'advanced.table.hostUnknown': 'Unknown star',
    'advanced.table.habitableScore': 'Habitable score (lower = closer to Earth)',
    'footer.instructions': 'Drag or swipe to rotate. Click a planet to pin its details.',
    'tooltip.featured': 'Featured Exoplanet',
    'tooltip.closeButton': 'Close',
    'tooltip.closeAria': 'Close planet details',
    'tooltip.showAtmosphere': 'Show atmosphere',
    'tooltip.openChat': 'Open AI chat',
    'tooltip.showData': 'Show planet data',
    'tooltip.chatPlaceholder': 'Ask about {{planet}}…',
    'tooltip.chatLoading': 'Calculating a response…',
    'tooltip.chatError': 'Unable to reach the AI service. Check your network or API key.',
    'tooltip.chatSend': 'Send',
    'tooltip.chatSending': 'Sending…',
    'tooltip.chatIntro':
      "I'm Mission Control. Ask me anything about {{planet}} or the data NASA captured.",
    'tooltip.chatNoResponse': 'No response received. Please try again.',
    'tooltip.chatAiUnavailable': 'Unable to reach the AI service. Check your network or API key.',
    'tooltip.chatMissingKey': 'Set VITE_OPENAI_API_KEY in your environment to chat with Mission Control.',
    'tooltip.detail.loading': 'Syncing full telemetry…',
    'tooltip.detail.error': 'Full detail unavailable: {{error}}',
    'tooltip.dev.textureKey': 'Texture Key (dev)',
    'tooltip.dev.atmosphere': 'Atmosphere (dev)',
    'tooltip.metrics.hostStar': 'Host Star',
    'tooltip.metrics.discoveryMethod': 'Discovery Method',
    'tooltip.metrics.discoveryYear': 'Discovery Year',
    'tooltip.metrics.orbitalPeriod': 'Orbital Period (days)',
    'tooltip.metrics.radius': 'Planet Radius (Earth = 1)',
    'tooltip.metrics.mass': 'Planet Mass (Earth = 1)',
    'tooltip.metrics.density': 'Planet Density (g/cm^3)',
    'tooltip.metrics.temperature': 'Equilibrium Temp (Celsius)',
    'tooltip.suggestion.aboutPlanet': 'What kind of world is this?',
    'tooltip.prompt.aboutPlanet':
      'Describe the planet {{planet}} in detail: classification, composition, temperature profile, orbital behavior, and notable traits.',
    'tooltip.suggestion.life': 'Could this planet host life?',
    'tooltip.prompt.life':
      'Evaluate whether {{planet}} could support life, referencing temperature, radiation, gravity, atmosphere, orbital eccentricity, and stellar flux.',
    'tooltip.suggestion.distance': 'How far away is this planet?',
    'tooltip.prompt.distance':
      'Explain how far {{planet}} is from Earth (parsecs, light years) and what that implies for missions or observation.',
    'tooltip.suggestion.atmosphere': 'What is the atmosphere like?',
    'tooltip.prompt.atmosphere':
      'Infer the likely atmosphere or sky appearance for {{planet}} based on mass, radius, density, equilibrium temperature, and star type.',
    'tooltip.suggestions.aria': 'Suggested questions',
    'tooltip.missionPrompt': `You are a space-science communicator. Convert raw exoplanet parameters into a short, friendly explanation suitable for UI cards.
Rules:
- Reply in English with clear, non-jargon language.
- Skip reasoning steps. Respond with the final summary only.
- Use ONLY the provided JSON values and simple derivations (density/temperature/period insights, tidal locking hints).
- Always include units and call out assumptions (e.g., pl_eqt usually in Kelvin).
- If data is missing or suspicious, note that politely and avoid bold claims.
- Do not contradict data (e.g., do not call a 1500°C world "icy").
- Structure:
  1) "What kind of world" — 2–3 sentences.
  2) "Key figures" — 4–7 bullets (gravity vs Earth, period in hours, etc.).
  3) "Comparison" — 1–2 sentences tying to Earth.
  4) "Atmosphere and surface" — evaluate the possibility of an atmosphere and assume its composition or color (by albedo, temperature, mass, density, specflag, tranflag).
  5) "Potential for life or colonization" — a brief assessment of whether a planet is habitable (water, temperature, radiation, gravity, atmospheric stability).
- You may derive:
  * g_rel ≈ (pl_bmasse / pl_rade^2)
  * Period hours = pl_orbper * 24
- Mention unit ambiguity if needed.
- Format in Markdown.`,
  },
  ru: {
    'language.label': 'Язык',
    'language.en': 'English',
    'language.ru': 'Русский',
    'status.loading': 'Создаём карту звёзд...',
    'status.error': 'Не удалось подключиться к архиву NASA: {{error}}',
    'status.retry': 'Перезагрузить страницу',
    'status.empty': 'Сейчас нет доступных экзопланет. Попробуйте позже.',
    'header.title': 'Обсерватория Stellar Mind',
    'header.description':
      'Вращайте галактику, открывайте планеты из архива NASA и изучайте их истории.',
    'advanced.toggle.show': 'Расширенный режим',
    'advanced.toggle.hide': 'Скрыть расширенный режим',
    'advanced.search.placeholder': 'Поиск по имени планеты (например, Kepler)',
    'advanced.search.button': 'Искать',
    'advanced.tabs.earthlike': 'Похожие на Землю',
    'advanced.tabs.distance': 'Ближайшие соседи',
    'advanced.earthlike.filterLabel': 'Фильтр обитаемости',
    'advanced.earthlike.mode.off': 'Все землеподобные кандидаты',
    'advanced.earthlike.mode.relaxed': 'Предпочитать зону обитаемости',
    'advanced.earthlike.mode.strict': 'Только строгая зона обитаемости',
    'advanced.earthlike.strictHint': 'Строгий режим может вернуть очень мало планет.',
    'advanced.status.fetching': 'Получаем данные…',
    'advanced.status.error': 'Не удалось загрузить данные: {{error}}',
    'advanced.status.noResults': 'Подходящих планет не найдено.',
    'advanced.status.enterTerm': 'Введите название планеты для поиска.',
    'advanced.status.searchResults': 'Результаты для «{{term}}».',
    'advanced.status.loadingMore': 'Загружаем ещё планеты…',
    'advanced.status.endOfList': 'Это конец списка.',
    'advanced.table.planet': 'Планета',
    'advanced.table.distance': 'Расстояние (св. лет)',
    'advanced.table.radius': 'Радиус (R⊕)',
    'advanced.table.mass': 'Масса (M⊕)',
    'advanced.table.temperature': 'Темп. равн. (K)',
    'advanced.table.hostUnknown': 'Неизвестная звезда',
    'advanced.table.habitableScore': 'Балл обитаемости (ниже = ближе к Земле)',
    'footer.instructions': 'Тяните, чтобы вращать. Кликните по планете, чтобы закрепить её.',
    'tooltip.featured': 'Избранная экзопланета',
    'tooltip.closeButton': 'Закрыть',
    'tooltip.closeAria': 'Закрыть описание планеты',
    'tooltip.showAtmosphere': 'Показать атмосферу',
    'tooltip.openChat': 'Открыть чат с ИИ',
    'tooltip.showData': 'Показать данные планеты',
    'tooltip.chatPlaceholder': 'Спросите о {{planet}}…',
    'tooltip.chatLoading': 'Идёт расчёт ответа…',
    'tooltip.chatError': 'Не удалось связаться с ИИ. Проверьте сеть или ключ API.',
    'tooltip.chatSend': 'Отправить',
    'tooltip.chatSending': 'Отправка…',
    'tooltip.chatIntro':
      'Я Центр Управления Полётом. Спросите о {{planet}} или данных, которые собрала NASA.',
    'tooltip.chatNoResponse': 'Ответ не получен. Попробуйте ещё раз.',
    'tooltip.chatAiUnavailable': 'Не удалось связаться с ИИ. Проверьте сеть или ключ API.',
    'tooltip.chatMissingKey': 'Укажите VITE_OPENAI_API_KEY, чтобы общаться с Миссией Контроля.',
    'tooltip.detail.loading': 'Синхронизируем полный профиль…',
    'tooltip.detail.error': 'Не удалось загрузить полный профиль: {{error}}',
    'tooltip.dev.textureKey': 'Ключ текстуры (dev)',
    'tooltip.dev.atmosphere': 'Атмосфера (dev)',
    'tooltip.metrics.hostStar': 'Звезда-хозяин',
    'tooltip.metrics.discoveryMethod': 'Метод открытия',
    'tooltip.metrics.discoveryYear': 'Год открытия',
    'tooltip.metrics.orbitalPeriod': 'Орбитальный период (дни)',
    'tooltip.metrics.radius': 'Радиус планеты (Земля = 1)',
    'tooltip.metrics.mass': 'Масса планеты (Земля = 1)',
    'tooltip.metrics.density': 'Плотность (г/см^3)',
    'tooltip.metrics.temperature': 'Температура равн. (°C)',
    'tooltip.suggestion.aboutPlanet': 'Что это за планета?',
    'tooltip.prompt.aboutPlanet':
      'Опиши планету {{planet}}: тип, состав, температуру, орбиту и уникальные особенности.',
    'tooltip.suggestion.life': 'Есть ли возможность жизни на планете?',
    'tooltip.prompt.life':
      'Оцени, может ли {{planet}} поддерживать жизнь: температура, излучение, гравитация, атмосфера, эксцентриситет и поток звезды.',
    'tooltip.suggestion.distance': 'Насколько далеко эта планета?',
    'tooltip.prompt.distance':
      'Расскажи, насколько далеко находится {{planet}} (парсеки, световые годы) и что это значит для миссий или наблюдений.',
    'tooltip.suggestion.atmosphere': 'Какая атмосфера у планеты?',
    'tooltip.prompt.atmosphere':
      'Опиши возможную атмосферу и цвет неба {{planet}}, учитывая массу, радиус, плотность, температуру и тип звезды.',
    'tooltip.suggestions.aria': 'Примеры вопросов',
    'tooltip.missionPrompt': `Ты — научный коммуникатор-астроном. Твоя задача — превратить сырые параметры экзопланет из JSON в короткую и понятную человеку интерпретацию для UI карточки.
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
  4) «Атмосфера и поверхность» — оцени возможность наличия атмосферы и предположи её состав или цвет (по albedo, температуре, массе, плотности, specflag, tranflag).
  5) «Потенциал для жизни или колонизации» — краткая оценка, пригодна ли планета для жизни (вода, температура, радиация, гравитация, устойчивость атмосферы).
- Можно делать простые производные:
  * g_rel ≈ (pl_bmasse / pl_rade^2) в g_Земли, если pl_bmasse и pl_rade заданы в земных единицах.
  * Период в часах = pl_orbper * 24.
  * Если pl_eqt в К: t_C ≈ pl_eqt − 273.15.
- Если есть явная неоднозначность единиц — упомяни это и дай диапазон/оговорку.
- Форматируй в Markdown.
`.trim(),
  },
}

export type TranslationKey = keyof (typeof translations)['en']

export const translateTemplate = (
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>,
) => {
  const template = translations[language][key] ?? translations.en[key]
  if (!template) {
    return key
  }

  return template.replace(/{{(.*?)}}/g, (_, rawMatch) => {
    const trimmed = rawMatch.trim()
    if (!params || params[trimmed] === undefined || params[trimmed] === null) {
      return ''
    }
    return String(params[trimmed])
  })
}
