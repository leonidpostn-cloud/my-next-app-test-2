import { Place, Coordinates, PlaceCategory } from './types';
import { distanceMeters } from './geo';

const DGIS_API_KEY = '3ff84733-cfa1-42b2-ac55-a7a7e9e3c301';

export interface DiscoverOption {
  label: string
  tags: string[]
  query?: {
    base?: string
    terms?: string[]
    radius?: number
  }
}

export interface DiscoverQuestion {
  id: string
  title: string
  hint: string
  options: DiscoverOption[]
}

export interface DiscoverAnswer {
  questionId: string
  label: string
  tags: string[]
  freeform?: string
  query?: DiscoverOption['query']
}

const themeQuestion: DiscoverQuestion = {
  id: 'theme',
  title: 'Что ищем?',
  hint: 'Тематика станет основой запроса в 2ГИС.',
  options: [
    { label: 'Поесть', tags: ['food'], query: { base: 'кафе' } },
    { label: 'Кофе', tags: ['coffee'], query: { base: 'кофейня' } },
    { label: 'Погулять', tags: ['walk', 'outdoor'], query: { base: 'парк сквер набережная' } },
    { label: 'Культура', tags: ['culture'], query: { base: 'музей выставка театр' } },
    { label: 'Активный отдых', tags: ['sport', 'active'], query: { base: 'спорт фитнес активный отдых' } }
  ]
}

const coreQuestions: DiscoverQuestion[] = [
  {
    id: 'distance',
    title: 'Как далеко готовы идти?',
    hint: 'Ответ задаёт радиус поиска от текущей точки.',
    options: [
      { label: 'До 5 минут', tags: ['near'], query: { radius: 500 } },
      { label: 'До 10 минут', tags: ['near'], query: { radius: 1000 } },
      { label: 'До 20 минут', tags: ['balanced'], query: { radius: 2000 } },
      { label: 'Можно дальше', tags: ['wide'], query: { radius: 4000 } }
    ]
  },
  {
    id: 'price',
    title: 'Какой уровень цены?',
    hint: 'Ответ добавит ценовой оттенок в поисковую фразу.',
    options: [
      { label: 'Побюджетнее', tags: ['budget'], query: { terms: ['недорого'] } },
      { label: 'Средний чек', tags: ['mid-budget'], query: { terms: ['средний чек'] } },
      { label: 'Можно красиво', tags: ['premium'], query: { terms: ['премиум'] } },
      { label: 'Не важно', tags: ['flex'], query: { terms: [] } }
    ]
  }
]

const themeFollowUps: Record<string, DiscoverQuestion[]> = {
  food: [
  {
    id: 'food-company',
    title: 'На кого рассчитываем стол?',
    hint: 'Так поиск точнее поймёт формат места.',
    options: [
      { label: 'Поесть одному', tags: ['solo'], query: { terms: ['быстрый обед'] } },
      { label: 'С друзьями', tags: ['friends'], query: { terms: ['для компании'] } },
      { label: 'Свидание', tags: ['date'], query: { terms: ['уютное место'] } },
      { label: 'С семьёй', tags: ['family'], query: { terms: ['семейное кафе'] } }
    ]
  },
  {
    id: 'food-format',
    title: 'Нужна еда с собой?',
    hint: 'Добавим take away или оставим посадку на месте.',
    options: [
      { label: 'Да, на вынос', tags: ['takeaway'], query: { terms: ['еда на вынос'] } },
      { label: 'Нет, посидеть', tags: ['indoor'], query: { terms: ['зал кафе'] } },
      { label: 'Быстро перекусить', tags: ['short'], query: { terms: ['быстро перекусить'] } },
      { label: 'Полноценный ужин', tags: ['evening'], query: { terms: ['ресторан ужин'] } }
    ]
  },
  {
    id: 'food-cuisine',
    title: 'Что по кухне?',
    hint: 'Это добавится прямо в текст поиска.',
    options: [
      { label: 'Пицца / паста', tags: ['italian'], query: { terms: ['пицца паста'] } },
      { label: 'Азиатская', tags: ['asian'], query: { terms: ['азиатская кухня'] } },
      { label: 'Бургеры', tags: ['burgers'], query: { terms: ['бургер'] } },
      { label: 'Любая вкусная', tags: ['flex'], query: { terms: [] } }
    ]
  }
  ],
  coffee: [
  {
    id: 'coffee-format',
    title: 'Какой кофейный сценарий?',
    hint: 'Формат добавится в поисковую фразу.',
    options: [
      { label: 'Взять с собой', tags: ['takeaway'], query: { terms: ['кофе с собой'] } },
      { label: 'Посидеть тихо', tags: ['quiet'], query: { terms: ['уютная кофейня'] } },
      { label: 'Поработать', tags: ['work'], query: { terms: ['кофейня wifi'] } },
      { label: 'С десертом', tags: ['dessert'], query: { terms: ['кофе десерты'] } }
    ]
  },
  {
    id: 'coffee-company',
    title: 'С кем кофе?',
    hint: 'Поможет выбрать атмосферу.',
    options: [
      { label: 'Один / одна', tags: ['solo'], query: { terms: ['тихое место'] } },
      { label: 'С другом', tags: ['friends'], query: { terms: ['уютное место'] } },
      { label: 'На встречу', tags: ['meeting'], query: { terms: ['для встречи'] } },
      { label: 'На свидание', tags: ['date'], query: { terms: ['романтичная кофейня'] } }
    ]
  },
  {
    id: 'coffee-drink',
    title: 'Что важнее в меню?',
    hint: 'Уточним тип кофейни.',
    options: [
      { label: 'Фильтр', tags: ['filter'], query: { terms: ['фильтр кофе'] } },
      { label: 'Раф / латте', tags: ['milk'], query: { terms: ['раф латте'] } },
      { label: 'Авторские напитки', tags: ['special'], query: { terms: ['авторский кофе'] } },
      { label: 'Любой кофе', tags: ['flex'], query: { terms: [] } }
    ]
  }
  ],
  walk: [
    {
      id: 'walk-place',
      title: 'Куда больше тянет?',
      hint: 'Это уточнит тип прогулочного места.',
      options: [
        { label: 'Парк', tags: ['park'], query: { terms: ['парк'] } },
        { label: 'Набережная', tags: ['water'], query: { terms: ['набережная'] } },
        { label: 'Смотровая', tags: ['view'], query: { terms: ['смотровая площадка'] } },
        { label: 'Тихий сквер', tags: ['quiet'], query: { terms: ['сквер'] } }
      ]
    },
    {
      id: 'walk-company',
      title: 'Формат прогулки?',
      hint: 'Добавим настроение маршрута.',
      options: [
        { label: 'Один / одна', tags: ['solo'], query: { terms: ['тихое место'] } },
        { label: 'С друзьями', tags: ['friends'], query: { terms: ['место для прогулки'] } },
        { label: 'Свидание', tags: ['date'], query: { terms: ['красивое место'] } },
        { label: 'С ребёнком', tags: ['family'], query: { terms: ['детская площадка парк'] } }
      ]
    },
    {
      id: 'walk-result',
      title: 'Что хочется получить?',
      hint: 'Последний штрих для выдачи.',
      options: [
        { label: 'Красивый вид', tags: ['view'], query: { terms: ['вид'] } },
        { label: 'Зелень и воздух', tags: ['fresh-air'], query: { terms: ['зелёная зона'] } },
        { label: 'Фото-точку', tags: ['photo'], query: { terms: ['фото место'] } },
        { label: 'Просто рядом', tags: ['near'], query: { terms: [] } }
      ]
    }
  ],
  culture: [
    {
      id: 'culture-type',
      title: 'Какой культурный формат?',
      hint: 'Выберем основной тип места.',
      options: [
        { label: 'Музей', tags: ['museum'], query: { terms: ['музей'] } },
        { label: 'Выставка', tags: ['exhibition'], query: { terms: ['выставка'] } },
        { label: 'Театр', tags: ['theater'], query: { terms: ['театр'] } },
        { label: 'Книги', tags: ['books'], query: { terms: ['книжный магазин библиотека'] } }
      ]
    },
    {
      id: 'culture-mood',
      title: 'Какое настроение?',
      hint: 'Поможет выбрать камерность или событие.',
      options: [
        { label: 'Тихо посмотреть', tags: ['quiet'], query: { terms: ['тихое место'] } },
        { label: 'На событие', tags: ['event'], query: { terms: ['мероприятие'] } },
        { label: 'С компанией', tags: ['friends'], query: { terms: ['для компании'] } },
        { label: 'На свидание', tags: ['date'], query: { terms: ['интересное место'] } }
      ]
    },
    {
      id: 'culture-time',
      title: 'Сколько времени есть?',
      hint: 'Уточнение попадёт в запрос как сценарий.',
      options: [
        { label: 'Полчаса', tags: ['short'], query: { terms: ['рядом'] } },
        { label: 'Около часа', tags: ['balanced'], query: { terms: ['экспозиция'] } },
        { label: 'Пара часов', tags: ['long'], query: { terms: ['выставочный центр'] } },
        { label: 'Вечер', tags: ['evening'], query: { terms: ['вечернее мероприятие'] } }
      ]
    }
  ],
  sport: [
    {
      id: 'sport-type',
      title: 'Как подвигаться?',
      hint: 'Выберем тип активности.',
      options: [
        { label: 'Зал / фитнес', tags: ['gym'], query: { terms: ['фитнес зал'] } },
        { label: 'Скалодром', tags: ['climb'], query: { terms: ['скалодром'] } },
        { label: 'Йога', tags: ['yoga'], query: { terms: ['йога'] } },
        { label: 'Игровой спорт', tags: ['game'], query: { terms: ['спорт клуб'] } }
      ]
    },
    {
      id: 'sport-level',
      title: 'Какой уровень нагрузки?',
      hint: 'Добавим подходящий формат.',
      options: [
        { label: 'Легко размяться', tags: ['easy'], query: { terms: ['для начинающих'] } },
        { label: 'Нормальная тренировка', tags: ['balanced'], query: { terms: ['тренировка'] } },
        { label: 'Интенсивно', tags: ['hard'], query: { terms: ['интенсивная тренировка'] } },
        { label: 'Попробовать новое', tags: ['special'], query: { terms: ['пробное занятие'] } }
      ]
    },
    {
      id: 'sport-company',
      title: 'Один или вместе?',
      hint: 'Финально уточним формат занятия.',
      options: [
        { label: 'Один / одна', tags: ['solo'], query: { terms: ['индивидуально'] } },
        { label: 'С другом', tags: ['friends'], query: { terms: ['парное занятие'] } },
        { label: 'Группа', tags: ['group'], query: { terms: ['групповое занятие'] } },
        { label: 'С тренером', tags: ['coach'], query: { terms: ['тренер'] } }
      ]
    }
  ]
}

function getThemeKey(answers: DiscoverAnswer[]) {
  const theme = answers.find((answer) => answer.questionId === 'theme')

  if (!theme) {
    return 'food'
  }

  if (theme.tags.includes('coffee')) return 'coffee'
  if (theme.tags.includes('walk')) return 'walk'
  if (theme.tags.includes('culture')) return 'culture'
  if (theme.tags.includes('sport')) return 'sport'
  return 'food'
}

export function getDiscoverQuestions(answers: DiscoverAnswer[]): DiscoverQuestion[] {
  return [themeQuestion, ...coreQuestions, ...themeFollowUps[getThemeKey(answers)]]
}

export const discoverQuestions = getDiscoverQuestions([])

const freeformTagRules: Array<{ pattern: RegExp; tags: string[] }> = [
  { pattern: /(коф|раф|капуч|латте)/i, tags: ['coffee', 'cozy'] },
  { pattern: /(поесть|еда|ужин|обед|завтрак|вкус)/i, tags: ['food'] },
  { pattern: /(гулять|прогул|набереж|улиц|парк|воздух)/i, tags: ['walk', 'outdoor'] },
  { pattern: /(спорт|зал|трен|скал|актив)/i, tags: ['sport', 'active'] },
  { pattern: /(музей|книга|культура|выстав)/i, tags: ['culture', 'quiet'] },
  { pattern: /(вид|панорам|закат|красиво)/i, tags: ['view', 'special'] },
  { pattern: /(тихо|спокойно|уют)/i, tags: ['quiet', 'cozy'] },
  { pattern: /(свидан|романт)/i, tags: ['date', 'view'] },
  { pattern: /(друз|компан)/i, tags: ['friends', 'lively'] },
  { pattern: /(дёш|бюджет|эконом)/i, tags: ['budget'] }
]

export function inferTagsFromFreeform(input: string) {
  const found = new Set<string>()

  for (const rule of freeformTagRules) {
    if (rule.pattern.test(input)) {
      for (const tag of rule.tags) {
        found.add(tag)
      }
    }
  }

  return Array.from(found)
}

export function buildTagWeights(answers: DiscoverAnswer[]) {
  const weights = new Map<string, number>()

  answers.forEach((answer, index) => {
    const baseWeight = index < 2 ? 3 : 2
    answer.tags.forEach((tag) => {
      weights.set(tag, (weights.get(tag) ?? 0) + baseWeight)
    })
  })

  return weights
}

function categoryFromTags(tags: string[]): PlaceCategory {
  if (tags.includes('coffee')) return 'coffee'
  if (tags.includes('food')) return 'food'
  if (tags.includes('culture')) return 'culture'
  if (tags.includes('sport')) return 'sport'
  if (tags.includes('view')) return 'view'
  return 'walk'
}

function collectSearchParams(answers: DiscoverAnswer[]) {
  let base = ''
  let radius = 1000

  answers.forEach((answer) => {
    if (answer.query?.base) {
      base = answer.query.base
    }

    if (answer.query?.radius) {
      radius = answer.query.radius
    }
  })

  const priorityTerms = answers
    .filter((answer) => !['theme', 'distance', 'price'].includes(answer.questionId))
    .flatMap((answer) => answer.query?.terms ?? [])
    .filter(Boolean)

  const priceTerm = answers.find((answer) => answer.questionId === 'price')?.query?.terms?.[0]
  const compactTerms = [...(priceTerm ? [priceTerm] : []), ...priorityTerms].slice(0, 2)
  const q = [base, ...compactTerms].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || 'кафе'

  return {
    q,
    fallbackQ: base || 'кафе',
    radius
  }
}

function mapDgisItemToPlace(item: any, answers: DiscoverAnswer[]): Place | null {
  const point = item.point
  const lat = point?.lat ?? item.lat
  const lng = point?.lon ?? item.lon

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null
  }

  const tags = Array.from(
    new Set([
      ...answers.flatMap((answer) => answer.tags),
      ...(item.rubrics ?? []).map((rubric: any) => String(rubric.name ?? '').toLowerCase()).filter(Boolean)
    ])
  )

  const category = categoryFromTags(tags)
  const rubricNames = (item.rubrics ?? []).map((rubric: any) => rubric.name).filter(Boolean).join(', ')

  return {
    id: `dgis-${item.id}`,
    name: item.name || item.company?.name || 'Место из 2ГИС',
    company: item.name || item.company?.name || '2ГИС',
    category,
    lat,
    lng,
    address: item.address_name || item.full_name || 'Адрес уточняется в 2ГИС',
    description: rubricNames ? `${rubricNames}. ${item.address_name ?? ''}` : item.address_name ?? 'Место найдено через 2ГИС.',
    aiPitch: 'Найдено через 2ГИС по вашим ответам.',
    tags,
    partner: false,
    rewards: [],
    highlight: item.reviews?.general_rating
      ? 'linear-gradient(135deg, #ffd670 0%, #2a9d8f 100%)'
      : 'linear-gradient(135deg, #67b7d1 0%, #4d908e 100%)'
  }
}

async function fetchDgisPlaces(q: string, radius: number, currentLocation: Coordinates, answers: DiscoverAnswer[]) {
  const url = new URL('https://catalog.api.2gis.com/3.0/items')
  url.searchParams.set('q', q)
  url.searchParams.set('type', 'branch')
  url.searchParams.set('point', `${currentLocation.lng},${currentLocation.lat}`)
  url.searchParams.set('radius', String(radius))
  url.searchParams.set('key', DGIS_API_KEY)
  url.searchParams.set('locale', 'ru_RU')
  url.searchParams.set('fields', 'items.point,items.address_name,items.rubrics,items.reviews')

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url.toString(), { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`2ГИС вернул ${response.status}`)
    }

    const data = await response.json()
    const items = Array.isArray(data?.result?.items) ? data.result.items : []

    return items
      .map((item: any) => mapDgisItemToPlace(item, answers))
      .filter((place: Place | null): place is Place => Boolean(place))
      .slice(0, 5)
      .map((place: Place, index: number) => ({
        place,
        score: 5 - index,
        matchedTags: place.tags.slice(0, 4),
        reason: `Нашли через 2ГИС по запросу “${q}” в радиусе ${radius} м.`
      }))
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function searchDgisPlacesByAnswers(answers: DiscoverAnswer[], currentLocation: Coordinates) {
  const { q, fallbackQ, radius } = collectSearchParams(answers)
  const attempts = [
    { q, radius },
    { q: fallbackQ, radius: Math.max(radius, 1000) },
    { q: fallbackQ, radius: Math.max(radius, 3000) }
  ]
  let lastError: unknown = null

  for (const attempt of attempts) {
    try {
      const places = await fetchDgisPlaces(attempt.q, attempt.radius, currentLocation, answers)

      if (places.length > 0) {
        return places
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) {
    throw new Error('2ГИС сейчас не отвечает. Попробуйте ещё раз или выберите радиус побольше.')
  }

  return []
}



export async function recommendPlaces(places: Place[], answers: DiscoverAnswer[], currentLocation?: Coordinates) {
  // Если пользователь не ответил ни на один вопрос, покажем ближайшие места
  if (answers.length === 0 && currentLocation) {
    // Сортируем места по расстоянию от текущей позиции пользователя
    return places
      .map(place => ({
        place,
        score: -distanceMeters(currentLocation, { lat: place.lat, lng: place.lng }),
        matchedTags: [],
        // Формируем причину, включая название и расстояние до места
        reason: `Место рядом: ${place.name}. Вы здесь.`
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  const weights = buildTagWeights(answers)

  return places
    .map((place) => {
      let score = place.partner ? 0.8 : 0
      const matchedTags = new Set<string>()

      place.tags.forEach((tag) => {
        const weight = weights.get(tag)
        if (weight) {
          score += weight
          matchedTags.add(tag)
        }
      })

      const categoryBoost = weights.get(place.category)
      if (categoryBoost) {
        score += categoryBoost * 1.4
        matchedTags.add(place.category)
      }

      if (weights.get('view') && place.category === 'walk') {
        score += 1.2
      }

      if (weights.get('favorite') && place.partner) {
        score += 0.5
      }

      return {
        place,
        score,
        matchedTags: Array.from(matchedTags)
      }
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((item, index) => ({
      ...item,
      reason:
        index === 0
          ? `Лучшее совпадение по настроению: ${item.place.aiPitch}`
          : item.matchedTags.length > 0
            ? `Совпадает по тегам: ${item.matchedTags.slice(0, 3).join(', ')}.`
            : 'Подходит как нейтральный запасной вариант рядом.'
    }));
}

// Экспортируем distanceMeters для использования в других модулях
export { distanceMeters } from './geo';
