import { Coordinates, Place } from './types';

const API_KEY = '3ff84733-cfa1-42b2-ac55-a7a7e9e3c301';
const BASE_URL = 'https://catalog.api.2gis.com';

interface DgisAddress {
  id: string;
  name: string;
  address_name: string;
  lat: number;
  lon: number;
  type: string;
}

interface DgisOrganization {
  id: string;
  name: string;
  address_name: string;
  lat: number;
  lon: number;
  rubrics: Array<{
    name: string;
    code: string;
  }>;
  photos: Array<{
    url: string;
    size: string;
  }>;
  external_content: Array<{
    type: 'website' | 'phone';
    value: string;
  }>;
}

interface GeocodeResponse {
  result: {
    total: number;
    items: DgisAddress[];
  };
}

interface SearchResponse {
  result: {
    total: number;
    items: DgisOrganization[];
  };
}

// Преобразование категории 2ГИС в нашу категорию
function mapRubricToCategory(rubricCode: string): string[] {
  const categoryMap: { [key: string]: string[] } = {
    // Еда и напитки
    '136': ['food', 'cozy'],
    '200': ['food'],
    '315': ['food'],
    '201': ['coffee', 'cozy'],
    '313': ['coffee', 'cozy'],
    // Культура и развлечения
    '168': ['culture'],
    '177': ['culture'],
    '184': ['culture'],
    // Спорт и активный отдых
    '204': ['sport'],
    '187': ['sport'],
    '175': ['sport'],
    // Прогулки и виды
    '185': ['walk', 'view'],
    '197': ['view'],
    '198': ['view'],
  };

  return categoryMap[rubricCode] || ['other'];
}

// Преобразование организации 2ГИС в наш тип Place
function mapOrganizationToPlace(org: DgisOrganization): Place {
  // Собираем теги из рубрик
  const tags = new Set<string>();
  org.rubrics.forEach(rubric => {
    mapRubricToCategory(rubric.code).forEach(tag => {
      tags.add(tag);
    });
    tags.add(rubric.name.toLowerCase());
  });

  // Определяем основную категорию
  let category: Place['category'] = 'walk';
  if (tags.has('food') || tags.has('restaurant') || tags.has('cafe')) {
    category = 'food';
  } else if (tags.has('coffee') || tags.has('cafe')) {
    category = 'coffee';
  } else if (tags.has('culture') || tags.has('museum') || tags.has('theater')) {
    category = 'culture';
  } else if (tags.has('sport') || tags.has('gym') || tags.has('fitness')) {
    category = 'sport';
  } else if (tags.has('view') || tags.has('panorama')) {
    category = 'view';
  }

  // Генерируем краткое описание
  const rubricNames = org.rubrics.map(r => r.name).join(', ');
  const aiPitch = `Интересное место: ${org.name}. ${rubricNames}. Отличный выбор для прогулки.`;

  return {
    id: org.id,
    name: org.name,
    company: org.name,
    category,
    lat: org.lat,
    lng: org.lon,
    address: org.address_name,
    description: `Организация: ${org.name}. Адрес: ${org.address_name}. Рубрики: ${rubricNames}.`,
    aiPitch,
    tags: Array.from(tags),
    partner: false,
    rewards: [],
    highlight: ''
  };
}

// Геокодинг - поиск координат по адресу
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/4.0/items/geocode?q=${encodeURIComponent(address)}&key=${API_KEY}&version=2.0&fields=items.point`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Проверяем структуру ответа
    if (!data || !data.result || typeof data.result.total === 'undefined') {
      console.error('Invalid response structure:', data);
      return null;
    }

    if (data.result.total === 0) {
      return null;
    }

    // Проверяем наличие items и первого элемента
    if (!data.result.items || data.result.items.length === 0) {
      return null;
    }

    // Возвращаем координаты первого найденного адреса
    const firstResult = data.result.items[0];
    if (!firstResult || typeof firstResult.lat === 'undefined' || typeof firstResult.lon === 'undefined') {
      return null;
    }
    
    return {
      lat: firstResult.lat,
      lng: firstResult.lon
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Поиск организаций по названию и/или координатам
export async function searchPlaces(
  query: string,
  center?: Coordinates,
  radius: number = 2000 // По умолчанию ищем в радиусе 2 км
): Promise<Place[]> {
  try {
    // Базовые параметры запроса
    let url = `${BASE_URL}/4.0/items?q=${encodeURIComponent(query)}&key=${API_KEY}&version=2.0&fields=items.point,items.rubrics,items.photos,items.external_content`;
    
    // Добавляем фильтр по местоположению, если задан центр
    if (center) {
      url += `&point=${center.lng},${center.lat}&radius=${radius}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SearchResponse = await response.json();

    if (data.result.total === 0) {
      return [];
    }

    // Преобразуем результаты в наш формат Place
    return data.result.items.map(mapOrganizationToPlace);
  } catch (error) {
    console.error('Search places error:', error);
    return [];
  }
}

// Поиск организаций по рубрике (категории) и координатам
export async function searchPlacesByCategory(
  rubricId: string,
  center: Coordinates,
  radius: number = 2000
): Promise<Place[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/4.0/items?rubric_id=${rubricId}&point=${center.lng},${center.lat}&radius=${radius}&key=${API_KEY}&version=2.0&fields=items.point,items.rubrics,items.photos,items.external_content`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SearchResponse = await response.json();

    if (data.result.total === 0) {
      return [];
    }

    // Преобразуем результаты в наш формат Place
    return data.result.items.map(mapOrganizationToPlace);
  } catch (error) {
    console.error('Search by category error:', error);
    return [];
  }
}