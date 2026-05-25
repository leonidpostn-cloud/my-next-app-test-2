import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DGisMap from '../components/DGisMap'
import { Place, PlaceCategory } from '../lib/types'
import { useAppState } from '../state/AppState'

const API_KEY = '3ff84733-cfa1-42b2-ac55-a7a7e9e3c301';

function progressPercent(current: number, target: number) {
  return Math.min(100, Math.round((current / target) * 100))
}

export default function MapPage() {
  const [searchParams] = useSearchParams()
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [promptPlaceId, setPromptPlaceId] = useState<string | null>(null)
  const [realPromptPlace, setRealPromptPlace] = useState<Place | null>(null)
  const [rejectedPromptIds, setRejectedPromptIds] = useState<string[]>([])
  const [confirmedPromptIds, setConfirmedPromptIds] = useState<string[]>([])
  const promptTimerRef = useRef<number | null>(null)
  const {
    places,
    state,
    nearbyPlaces,
    activeQuest,
    physicalRewards,
    checkIn,
    setCurrentLocation,
    appStats,
    firstNearbyPlace,
    secondNearbyPlace
  } = useAppState()

  useEffect(() => {
    const focusedPlaceId = searchParams.get('focus')
    if (focusedPlaceId && places.some((place) => place.id === focusedPlaceId)) {
      setSelectedPlaceId(focusedPlaceId)
    }
  }, [places, searchParams])

  const selectedPlace =
    places.find((place) => place.id === selectedPlaceId) ?? nearbyPlaces[0]?.place ?? null

  const focusedLocation =
    selectedPlaceId && selectedPlace
      ? { lat: selectedPlace.lat, lng: selectedPlace.lng }
      : state.currentLocation

  const questPercent = progressPercent(activeQuest.current, activeQuest.quest.target)
  // Гарантируем, что promptPlace и secondPromptPlace всегда определены
  // promptPlace теперь устанавливается из состояния, найденного findNearestRealPlace
  const promptPlace = places.find((place) => place.id === promptPlaceId) ?? null
  const secondPromptPlace = null // Временно отключаем, так как поиск реальных мест не возвращает два объекта

  // Для динамически найденных реальных мест
  const realPromptPlaceName = realPromptPlace?.name || 'Место'

  function clearPromptTimer() {
    if (promptTimerRef.current) {
      window.clearTimeout(promptTimerRef.current)
      promptTimerRef.current = null
    }
  }

  function pickPromptPlace(excludedIds: string[]) {
    return nearbyPlaces.find((item) => !excludedIds.includes(item.place.id))?.place ?? null
  }

  function schedulePrompt(delayMs: number, excludedIds = [...rejectedPromptIds, ...confirmedPromptIds]) {
    clearPromptTimer()
    promptTimerRef.current = window.setTimeout(() => {
      setPromptPlaceId(pickPromptPlace(excludedIds)?.id ?? null)
    }, delayMs)
  }

  // Отключаем стандартную логику показа подсказок, так как используем специальную логику для первого показа
  // useEffect(() => {
  //   if (!locationReady) {
  //     return
  //   }

  //   // Сбрасываем promptPlace только если он не был установлен через setTimeout
  //   if (promptPlaceId && !promptTimerRef.current) {
  //     setPromptPlaceId(null)
  //   }
  //   setRejectedPromptIds([])

  //   return clearPromptTimer
  // }, [locationReady, state.currentLocation.lat, state.currentLocation.lng])
  
  // Получить детали места по ID
  async function fetchPlaceDetails(placeId: string) {
    console.log('Вызов fetchPlaceDetails', { placeId });

    const url = new URL('https://catalog.api.2gis.com/3.0/items/byid');
    url.searchParams.set('id', placeId);
    url.searchParams.set('key', API_KEY);
    url.searchParams.set('fields', 'items.name,items.company.name');
    url.searchParams.set('locale', 'ru_RU');

    console.log('Отправка запроса к API:', url.toString());

    try {
      const response = await fetch(url);
      const data = await response.json();

      console.log('Получен ответ от API:', data);

      if (response.ok && data && data.result && data.result.items && data.result.items.length > 0) {
        const item = data.result.items[0];
        const placeName = item.name || item.company?.name || `Место ${placeId}`;
        console.log('Успешно получено название места:', placeName);
        return placeName;
      } else {
        console.log('Место не найдено в ответе API');
        return `Место ${placeId}`;
      }
    } catch (error) {
      console.error('Places API error:', error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      return `Место ${placeId}`;
    }
  }
  
  // Функция для поиска ближайшего объекта по реальным данным 2ГИС
  async function findNearestRealPlace(lat: number, lng: number) {
    console.log('Выполняем запрос к API 2ГИС для поиска ближайшего места');
    console.log('Координаты центра поиска:', { lat, lng });
    
    let nearestPlaceId = null;
    let nearestPlaceDistance = Infinity;
    let nearestPlaceData = null;
    
    // Создаем URL без параметра q
    const url = new URL('https://catalog.api.2gis.com/3.0/markers');
    url.searchParams.set('point', `${lng},${lat}`);
    url.searchParams.set('radius', '1000');
    url.searchParams.set('sort', 'distance');
    url.searchParams.set('key', '3ff84733-cfa1-42b2-ac55-a7a7e9e3c301');
    
    try {
      const response = await fetch(url);
      const responseData = await response.json();
      
      console.log('Полный ответ от API:', JSON.stringify(responseData, null, 2));
      
      if (!response.ok) {
        console.error('HTTP ошибка:', response.status, response.statusText);
        return null;
      }
      
      if (responseData && responseData.meta && responseData.meta.code === 200 && 
          responseData.result && Array.isArray(responseData.result.items) && responseData.result.items.length > 0) {
        
        console.log('Найденные ID мест:', responseData.result.items.map((item: any) => item.id).join(', '));
        
        // Находим самое близкое место из полученных
        for (const place of responseData.result.items) {
          // Проверяем наличие координат у места и что это не реклама
          const latCoord = place.point?.lat ?? place.lat;
          const lonCoord = place.point?.lon ?? place.lon;

          if (typeof latCoord === 'number' && 
              typeof lonCoord === 'number' &&
              place.type !== 'ad') {
            
            const distance = Math.sqrt(
              Math.pow(latCoord - lat, 2) + 
              Math.pow(lonCoord - lng, 2)
            );
            
            if (distance < nearestPlaceDistance) {
              nearestPlaceDistance = distance;
              nearestPlaceId = place.id;
              nearestPlaceData = place;
            }
          }
        }
        
        // Если не нашли подходящее место, берем первое из списка
        if (!nearestPlaceId && responseData.result.items.length > 0) {
          const firstPlace = responseData.result.items[0];
          if (firstPlace.point) {
            nearestPlaceId = firstPlace.id;
            nearestPlaceData = firstPlace;
            console.log('Используем первое место из списка как резервный вариант');
          }
        }
      } else {
        console.log('Нет данных в ответе API или ошибка:', responseData?.meta?.code, responseData?.meta?.message);
        return null;
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Ошибка при выполнении запроса к API 2ГИС:', error.message);
        console.error('Stack trace:', error.stack);
      } else {
        console.error('Неизвестная ошибка при выполнении запроса к API 2ГИС:', error);
      }
      return null;
    }
    
    // Если нашли ближайшее место, создаем объект для приложения
    if (nearestPlaceId && nearestPlaceData) {
      console.log('=== НАЧАЛО ОБРАБОТКИ МЕСТА ===');
      console.log('Найден ID ближайшего места:', nearestPlaceId);
      
      // Добавляем детальное логирование исходных данных о месте
      console.log('Исходные данные о месте:', {
        id: nearestPlaceData.id,
        name: nearestPlaceData.name,
        title: nearestPlaceData.title,
        address_name: nearestPlaceData.address_name,
        type: nearestPlaceData.type,
        point: nearestPlaceData.point,
        geometry: nearestPlaceData.geometry
      });
      
      // Получаем имя места, пытаясь разные варианты
      let placeName = '';
      if (nearestPlaceData.name) {
        placeName = nearestPlaceData.name;
        console.log('Используем имя из поля name:', placeName);
      } else if (nearestPlaceData.title) {
        placeName = nearestPlaceData.title;
        console.log('Используем имя из поля title:', placeName);
      } else if (nearestPlaceData.address_name) {
        placeName = nearestPlaceData.address_name;
        console.log('Используем имя из поля address_name:', placeName);
      } else {
        placeName = `Место ${nearestPlaceId}`;
        console.log('Имя не найдено, используем шаблон:', placeName);
      }
      
      // Проверяем координаты
      const placeLat = nearestPlaceData.point?.lat || lat;
      const placeLng = nearestPlaceData.point?.lon || lng;
      
      if (!nearestPlaceData.point) {
        console.log('Предупреждение: У места отсутствуют координаты point, используем координаты пользователя');
      } else {
        console.log('Используем координаты из поля point:', { lat: placeLat, lng: placeLng });
      }
      
      console.log('Финальные координаты места:', { lat: placeLat, lng: placeLng });
      
      // Создаем объект для приложения
      const formattedPlace = {
        id: `real-${nearestPlaceId}`,
        name: placeName,
        lat: placeLat,
        lng: placeLng,
        category: 'walk' as PlaceCategory,
        tags: ['реальное', 'найдено', 'геолокация'],
        aiPitch: `Найдено по карте 2ГИС: ${placeName}. Идеальное место для небольшой прогулки.`,
        company: placeName,
        address: nearestPlaceData.address_name || `Координаты: ${placeLat.toFixed(5)}, ${placeLng.toFixed(5)}`,
        description: `Найденное место: ${placeName}. Тип: ${nearestPlaceData.type || 'объект'}.`,
        partner: false,
        rewards: [],
        highlight: 'linear-gradient(135deg, #90be6d 0%, #43aa8b 100%)'
      };
      
      console.log('Создан объект для приложения:', formattedPlace);
      console.log('=== ЗАВЕРШЕНИЕ ОБРАБОТКИ МЕСТА ===');

      // Извлекаем оригинальный ID (убираем префикс 'real-')
      const originalPlaceId = nearestPlaceId;

      // Запрашиваем и логируем настоящее имя места через API
      try {
        console.log('Запрашиваем детали настоящего места по ID:', originalPlaceId);
        const realPlaceName = await fetchPlaceDetails(originalPlaceId);
        console.log('Получено официальное название места:', realPlaceName);
      } catch (error) {
        console.error('Ошибка при получении названия места:', error);
      }

      return formattedPlace;
    }
    
    console.log('Не удалось найти подходящее место ни по одному из запросов');
    return null;
  }

  function handleLocateMe() {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser')
      setLocationReady(true)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        console.log('Получены координаты пользователя:', coords);
        setSelectedPlaceId(null);
        setLocationReady(true);
        setCurrentLocation(
          {
            lat: coords.latitude,
            lng: coords.longitude
          },
          'gps'
        );

        // Поиск ближайшего реального места
        console.log('Начинаем поиск ближайшего места по координатам:', coords.latitude, coords.longitude);
        const realPlace = await findNearestRealPlace(coords.latitude, coords.longitude);
        if (realPlace) {
          console.log('Найдено ближайшее место:', realPlace);
          // Получаем название места по его ID (убираем префикс 'real-')
          const originalId = realPlace.id.replace('real-', '');
          console.log('Получаем название места по ID:', originalId);
          const placeName = await fetchPlaceDetails(originalId);
          console.log('Получено название места:', placeName)
          
          // Создаем обновленный объект места с настоящим именем
          const realPlaceWithRealName = { ...realPlace, name: placeName };
          
          // Устанавливаем найденное место как realPromptPlace через 5 секунд
          console.log('Устанавливаем таймер на 5 секунд для показа вопроса о местоположении');
          setTimeout(() => {
            console.log('Таймер сработал, показываем вопрос о местоположении для места:', placeName);
            setRealPromptPlace(realPlaceWithRealName);
          }, 5000);
        } else {
          console.log('Не удалось найти ближайшее место');
          // Повторная попытка с тем же запросом, если первая не удалась
          console.log('Повторная попытка поиска с теми же параметрами');
          const retryPlace = await findNearestRealPlace(coords.latitude, coords.longitude);
          if (retryPlace) {
            console.log('Найдено место при повторной попытке:', retryPlace);
            // Получаем название места по его ID
            console.log('Получаем название места по ID:', retryPlace.id);
            const placeName = await fetchPlaceDetails(retryPlace.id);
            console.log('Получено название места:', placeName);
            
            setTimeout(() => {
              console.log('Таймер сработал, показываем вопрос о местоположении для места:', placeName);
              setPromptPlaceId(retryPlace.id);
            }, 5000);
          }
        }
      },
      (error) => {
        console.warn('Geolocation error:', error.message)
        setLocationReady(true)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  useEffect(() => {
    handleLocateMe()
  }, [])

  // useEffect(() => {
  //   if (!locationReady) {
  //     return
  //   }

  //   setPromptPlaceId(null)
  //   setRejectedPromptIds([])
  //   schedulePrompt(5000, confirmedPromptIds)

  //   return clearPromptTimer
  // }, [locationReady, state.currentLocation.lat, state.currentLocation.lng])

  useEffect(() => clearPromptTimer, [])

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlaceId(place.id)
  }

  return (
    <div className="page-grid">
      <section className="map-layout-full">
        <div className="leaflet-shell">
          <DGisMap
            center={[focusedLocation.lat, focusedLocation.lng]}
            zoom={14}
            onMapLoad={() => {}}
            onPlaceSelect={handlePlaceSelect}
            recommendedPlaces={activeQuest.recommendedPlaces}
            confirmedPlaceIds={confirmedPromptIds}
            confirmedPlaces={places.filter((place) => confirmedPromptIds.includes(place.id))}
            handleLocateMe={handleLocateMe}
          />
          <div className="quest-overlay" onClick={() => window.location.href = '/rewards'} style={{cursor: 'pointer'}}>
            <h3>{activeQuest.quest.title}</h3>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${questPercent}%` }}></div>
            </div>
            <div className="progress-label">
              {activeQuest.current} / {activeQuest.quest.target}
            </div>
          </div>
          <div className="map-metrics">
            <div className="metric-chip" onClick={() => window.location.href = '/rewards'} style={{cursor: 'pointer'}}>
              <strong>{appStats?.uniqueVisited || 0}</strong>
              <span>Мест открыто</span>
            </div>
            <div className="metric-chip accent" onClick={() => window.location.href = '/rewards'} style={{cursor: 'pointer'}}>
              <strong>{appStats?.unlockedRewards || 0}</strong>
              <span>Призов доступно</span>
            </div>
          </div>
        </div>

        {realPromptPlace && (
          <div className="map-location-prompt">
            <h3>Вы здесь?</h3>
            <p>{realPromptPlace.name}</p>
            <div className="prompt-actions">
              <button
                className="primary-button"
                onClick={() => {
                  checkIn(realPromptPlace.id)
                  setConfirmedPromptIds((current) =>
                    current.includes(realPromptPlace.id) ? current : [...current, realPromptPlace.id]
                  )
                  setRealPromptPlace(null)
                  clearPromptTimer()
                }}
                type="button"
              >
                Да
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  const nextRejectedIds = [...rejectedPromptIds, realPromptPlace.id]
                  setRejectedPromptIds(nextRejectedIds)
                  setRealPromptPlace(null)
                  schedulePrompt(30000, [...nextRejectedIds, ...confirmedPromptIds])
                }}
                type="button"
              >
                Нет
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
