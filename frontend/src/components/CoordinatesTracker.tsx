import { useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'

interface CoordinatesTrackerProps {
  map: maplibregl.Map | null
}

export default function CoordinatesTracker({ map }: CoordinatesTrackerProps) {
  const [coordinates, setCoordinates] = useState({
    latitude: 0,
    longitude: 0,
    bearing: 0,
    pitch: 0
  })

  useEffect(() => {
    if (!map) return

    const updateCoordinates = () => {
      const center = map.getCenter()
      const bearing = map.getBearing()
      const pitch = map.getPitch()

      setCoordinates({
        latitude: center.lat,
        longitude: center.lng,
        bearing: bearing,
        pitch: pitch
      })
    }

    // Update coordinates on map movement
    map.on('move', updateCoordinates)
    map.on('zoom', updateCoordinates)
    map.on('rotate', updateCoordinates)
    map.on('pitch', updateCoordinates)

    // Initial update
    updateCoordinates()

    return () => {
      map.off('move', updateCoordinates)
      map.off('zoom', updateCoordinates)
      map.off('rotate', updateCoordinates)
      map.off('pitch', updateCoordinates)
    }
  }, [map])

  if (!map) return null

  return (
    <div 
      className="fixed bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm font-mono z-50"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 font-semibold">Lat:</span>
          <span className="text-gray-900">{coordinates.latitude.toFixed(6)}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 font-semibold">Lng:</span>
          <span className="text-gray-900">{coordinates.longitude.toFixed(6)}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 font-semibold">Bearing:</span>
          <span className="text-gray-900">{coordinates.bearing.toFixed(1)}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 font-semibold">Pitch:</span>
          <span className="text-gray-900">{coordinates.pitch.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  )
}
