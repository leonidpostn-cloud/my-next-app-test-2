import { useEffect, useRef, useState } from 'react';
import { load } from '@2gis/mapgl';
import { Place } from '../lib/types';

interface DGisMapProps {
  center: [number, number];
  zoom: number;
  onMapLoad: (map: any) => void;
  onPlaceSelect: (place: any) => void;
  recommendedPlaces?: Place[];
  confirmedPlaceIds?: string[];
  confirmedPlaces?: Place[];
  handleLocateMe: () => void;
}

const DGIS_API_KEY = '3ff84733-cfa1-42b2-ac55-a7a7e9e3c301';

function toMapglCoordinates([lat, lng]: [number, number]) {
  return [lng, lat];
}

export default function DGisMap({
  center,
  zoom,
  onMapLoad,
  onPlaceSelect,
  recommendedPlaces = [],
  confirmedPlaceIds = [],
  confirmedPlaces = [],
  handleLocateMe
}: DGisMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapglRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const searchMarkersRef = useRef<any[]>([]);
  const recommendedMarkersRef = useRef<any[]>([]);
  const confirmedMarkersRef = useRef<any[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let tileWarningTimer: number | undefined;

    async function initializeMap() {
      if (!mapContainerRef.current || mapRef.current) {
        return;
      }

      try {
        const mapglAPI = await load('https://mapgl.2gis.com/api/js/v1');

        if (!isMounted || !mapContainerRef.current) {
          return;
        }

        const mapInstance = new mapglAPI.Map(mapContainerRef.current, {
          center: toMapglCoordinates(center),
          zoom,
          key: DGIS_API_KEY,
          zoomControl: false // Отключаем элемент управления масштабом
        });

        mapInstance.on('error', (mapError: any) => {
          console.error('2GIS MapGL error:', mapError);

          if (mapError?.type === 'invalidtilekey') {
            setError('Ключ 2ГИС не разрешает загрузку подложки MapGL');
          }
        });

        mapInstance.on('styleloaderror', () => {
          setError('2ГИС не смог загрузить стиль карты');
        });

        mapInstance.on('idle', () => {
          if (tileWarningTimer) {
            window.clearTimeout(tileWarningTimer);
          }
        });

        tileWarningTimer = window.setTimeout(() => {
          if (isMounted && !error) {
            setError('Если виден только маркер без улиц, текущий ключ 2ГИС не отдаёт MapGL-подложку для localhost');
          }
        }, 12000);

        mapglRef.current = mapglAPI;
        mapRef.current = mapInstance;
        setIsMapReady(true);
        onMapLoad(mapInstance);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Не удалось загрузить карту 2ГИС: ${message}`);
        console.error('2GIS MapGL initialization error:', err);
        handleLocateMe(); // fallback to geolocation if map fails to load
      }
    }

    initializeMap();

    return () => {
      isMounted = false;

      if (tileWarningTimer) {
        window.clearTimeout(tileWarningTimer);
      }

      if (currentMarkerRef.current) {
        currentMarkerRef.current.destroy();
        currentMarkerRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }

      setIsMapReady(false);
    };
  }, []);

  // Update map center, zoom, and marker whenever center or zoom changes
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !mapglRef.current) {
      return;
    }

    const nextCenter = toMapglCoordinates(center);
    
    // Update map view - теперь всегда центрируем карту при изменении центра
    mapRef.current.setCenter(nextCenter);
    mapRef.current.setZoom(zoom);
    
    // Create or update the current location marker
    if (!currentMarkerRef.current) {
      // Create new marker if it doesn't exist
      currentMarkerRef.current = new mapglRef.current.HtmlMarker(mapRef.current, {
        coordinates: nextCenter,
        anchor: [8, 8],
        html: '<div style="background-color: #3f51b5; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>'
      });
    } else {
      // Update existing marker's position
      currentMarkerRef.current.setCoordinates(nextCenter);
    }
  }, [center, zoom, isMapReady]);

  // Update recommended place markers whenever recommendedPlaces changes
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !mapglRef.current) {
      return;
    }

    // Remove existing recommended markers
    recommendedMarkersRef.current.forEach(marker => marker.destroy());
    recommendedMarkersRef.current = [];

    // Create new markers for recommended places
    recommendedPlaces
      .filter((place) => !confirmedPlaceIds.includes(place.id))
      .forEach((place) => {
      const marker = new mapglRef.current.HtmlMarker(mapRef.current, {
        coordinates: toMapglCoordinates([place.lat, place.lng]),
        anchor: [9, 9],
        html: '<div style="background-color: #ffeb3b; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><span style="color: #333; font-size: 10px; font-weight: bold;">?</span></div>'
      });
      
      recommendedMarkersRef.current.push(marker);
    });
    
  }, [recommendedPlaces, confirmedPlaceIds, isMapReady, mapRef.current, mapglRef.current, onPlaceSelect]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !mapglRef.current) {
      return;
    }

    confirmedMarkersRef.current.forEach(marker => marker.destroy());
    confirmedMarkersRef.current = [];

    confirmedPlaces.forEach((place) => {
      const marker = new mapglRef.current.HtmlMarker(mapRef.current, {
        coordinates: toMapglCoordinates([place.lat, place.lng]),
        anchor: [14, 14],
        html: '<div style="background-color: #22c55e; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.28); display: flex; align-items: center; justify-content: center;"><span style="color: #fff; font-size: 18px; font-weight: 900; line-height: 1;">✓</span></div>'
      });

      confirmedMarkersRef.current.push(marker);
    });
  }, [confirmedPlaces, isMapReady, mapRef.current, mapglRef.current, onPlaceSelect]);

  // Cleanup recommended markers on unmount
  useEffect(() => {
    return () => {
      recommendedMarkersRef.current.forEach(marker => marker.destroy());
      recommendedMarkersRef.current = [];
      confirmedMarkersRef.current.forEach(marker => marker.destroy());
      confirmedMarkersRef.current = [];
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {error && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          padding: '8px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {error}
        </div>
      )}

      {!isMapReady && !error && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f0f0f0'
        }}>
          <p>Загрузка карты 2ГИС...</p>
        </div>
      )}

      <button
        onClick={handleLocateMe}
        style={{
          position: 'absolute',
          bottom: 40,
          right: 20,
          zIndex: 1000,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '1px solid rgba(16, 37, 66, 0.08)',
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 2px 8px rgba(16, 37, 66, 0.12)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-label="Определить местоположение"
      >
        📍
      </button>
    </div>
  );
}
