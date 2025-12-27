import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMap3DModels } from '../hooks/useMap3DModels'
import { touristSpotModels } from '../config/touristSpots'
import { isViewportInCatanduanes } from '../utils/catanduanesBounds'
import { getMapTilerKey } from '../utils/env'
import { useStore } from '../state/store'
import CoordinatesTracker from '../components/CoordinatesTracker'
import RightSidebar from '../components/RightSidebar'
import { MAP_CONFIG, MODEL_CONFIG, ANIMATION_CONFIG, UI_CONFIG } from '../constants/map'
import { calculateDistanceDegrees } from '../utils/coordinates'
import toast from 'react-hot-toast'

export default function Discover() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Store state
  const {
    setMapViewport,
    setLoadingState,
    setError: setStoreError,
    terrainEnabled,
    modelsEnabled
  } = useStore()
  
  // Marker coordinates
  const markerCoordinates: [number, number] = [124.325192, 13.559582]
  
  // Target camera position when marker is clicked - ABSOLUTE position
  const targetCameraPosition = {
    center: [124.325374, 13.559598] as [number, number],
    zoom: 19.28,
    bearing: 0.0,
    pitch: 60.0
  }

  // Initialize the map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    let mapInstance: maplibregl.Map | null = null
    let loadingTimeout: ReturnType<typeof setTimeout> | null = null

    try {
      // Get MapTiler API key from environment variables
      const apiKey = getMapTilerKey()

      mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/satellite/style.json?key=${apiKey}`,
        zoom: MAP_CONFIG.DEFAULT_ZOOM,
        center: MAP_CONFIG.DEFAULT_CENTER,
        pitch: MAP_CONFIG.DEFAULT_PITCH,
        bearing: MAP_CONFIG.DEFAULT_BEARING,
        minZoom: MAP_CONFIG.MIN_ZOOM,
        maxZoom: MAP_CONFIG.MAX_ZOOM,
        canvasContextAttributes: { antialias: true }
      })
      
      // Map controls removed - no NavigationControl or ScaleControl

      // Handle map errors
      mapInstance.on('error', (e) => {
        const errorMessage = `Map error: ${e.error?.message || 'Unknown error'}`
        // Use proper error handling instead of console.error
        setError(errorMessage)
        setStoreError('map', errorMessage)
        setLoadingState('map', false)
        toast.error('Failed to load map')
        setIsLoading(false)
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
          loadingTimeout = null
        }
      })

      // Handle successful load - ensure loading state is cleared
      mapInstance.once('load', () => {
        setIsLoading(false)
        setError(null)
        setLoadingState('map', false)
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
          loadingTimeout = null
        }
        
        // Add marker after map loads
        if (mapInstance) {
          // Create custom marker element
          const markerElement = document.createElement('div')
          markerElement.className = 'custom-marker'
          markerElement.style.width = '30px'
          markerElement.style.height = '30px'
          markerElement.style.cursor = 'pointer'
          markerElement.innerHTML = `
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#FF5722" stroke="white" stroke-width="2"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          `
          
          // Create and add marker
          const marker = new maplibregl.Marker({ element: markerElement })
            .setLngLat(markerCoordinates)
            .addTo(mapInstance)
          
          markerRef.current = marker
          
          // Add click handler to marker
          markerElement.addEventListener('click', () => {
            // Animate camera to ABSOLUTE target position
            // This will always go to the exact same position regardless of current camera state
            if (mapInstance) {
              mapInstance.flyTo({
                center: targetCameraPosition.center,
                zoom: targetCameraPosition.zoom,
                bearing: targetCameraPosition.bearing,
                pitch: targetCameraPosition.pitch,
                duration: 2000, // 2 seconds animation
                essential: true,
                // Force absolute positioning - don't calculate relative to current position
                around: undefined
              })
            }
            
            // Open sidebar
            setIsSidebarOpen(true)
          })
        }
      })
      
      // Update viewport state on map movement
      const updateViewport = () => {
        if (!mapInstance) return
        setMapViewport({
          center: mapInstance.getCenter().toArray() as [number, number],
          zoom: mapInstance.getZoom(),
          pitch: mapInstance.getPitch(),
          bearing: mapInstance.getBearing()
        })
      }
      
      if (mapInstance) {
        mapInstance.on('moveend', updateViewport)
        mapInstance.on('zoomend', updateViewport)
        
        // Map click handler removed - no interaction with models
      }

      // Fallback: clear loading state after a timeout if load event doesn't fire
      loadingTimeout = setTimeout(() => {
        // Silently clear loading state if timeout occurs
        setIsLoading(false)
        loadingTimeout = null
      }, UI_CONFIG.LOADING_TIMEOUT)

      // Add terrain sources and configuration after style loads
      mapInstance.once('style.load', () => {
        if (!mapInstance) return
        
        // Add terrain source using MapTiler's terrain tiles
        if (!mapInstance.getSource('terrainSource')) {
          mapInstance.addSource('terrainSource', {
            type: 'raster-dem',
            url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${apiKey}`,
            tileSize: 256,
            maxzoom: 14
          })
        }

        // Enable terrain immediately if terrainEnabled is true and viewport is in Catanduanes
        // This ensures terrain appears on initial load
        if (terrainEnabled && isViewportInCatanduanes(mapInstance)) {
          try {
            mapInstance.setTerrain({
              source: 'terrainSource',
              exaggeration: MAP_CONFIG.TERRAIN_EXAGGERATION
            })
          } catch (error) {
            // Terrain source might not be ready yet, will be handled by useEffect
          }
        }
      })

      mapRef.current = mapInstance
      setMap(mapInstance)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize map'
      // Use proper error handling instead of console.error
      setError(errorMessage)
      setStoreError('map', errorMessage)
      toast.error(errorMessage)
      setIsLoading(false)
    }

    // Handle window resize
    const handleResize = () => {
      if (mapInstance) {
        mapInstance.resize()
      }
    }
    window.addEventListener('resize', handleResize)

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize)
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
        loadingTimeout = null
      }
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      if (mapInstance) {
        mapInstance.remove()
        mapRef.current = null
        setMap(null)
      }
    }
  }, [])

  // Update terrain when terrainEnabled changes or map moves
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return
    
    const updateTerrainState = () => {
      if (!map) return
      
      // Check if terrain source exists
      if (!map.getSource('terrainSource')) {
        // Wait for terrain source to be added
        return
      }
      
      const hasTerrain = map.getTerrain() !== null
      const inCatanduanes = isViewportInCatanduanes(map)

      if (terrainEnabled && inCatanduanes && !hasTerrain) {
        // Enable terrain when terrainEnabled is true and viewport is in Catanduanes
        try {
          map.setTerrain({
            source: 'terrainSource',
            exaggeration: MAP_CONFIG.TERRAIN_EXAGGERATION
          })
        } catch (error) {
          // Terrain source might not be ready yet, ignore
        }
      } else if ((!terrainEnabled || !inCatanduanes) && hasTerrain) {
        // Disable terrain when terrainEnabled is false or viewport is outside Catanduanes
        map.setTerrain(null)
      }
    }

    // Update immediately
    updateTerrainState()

    // Also update on map movement and when data loads (terrain source might load later)
    map.on('moveend', updateTerrainState)
    map.on('zoomend', updateTerrainState)
    map.on('data', updateTerrainState) // Trigger when new data (like terrain source) loads

    return () => {
      map.off('moveend', updateTerrainState)
      map.off('zoomend', updateTerrainState)
      map.off('data', updateTerrainState)
    }
  }, [map, terrainEnabled])

  // Add all 3D models to the map using the reusable hook (only if models are enabled)
  useMap3DModels(modelsEnabled ? map : null, touristSpotModels)

  return (
    <div className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }}>
      {/* Map container - always rendered so useEffect can access it */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90" style={{ zIndex: 1, pointerEvents: 'auto' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90" style={{ zIndex: 1, pointerEvents: 'auto' }}>
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Map</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
      
      {/* Coordinates Tracker - Bottom left corner */}
      <CoordinatesTracker map={map} />
      
      {/* Right Sidebar */}
      <RightSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  )
}
