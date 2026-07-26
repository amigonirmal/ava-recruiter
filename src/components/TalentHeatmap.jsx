import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'

// ─── Talent cluster data ──────────────────────────────────────────────────────
// [lat, lng, intensity]  — real-world coords matching the reference heatmap
const TALENT_CLUSTERS = [
  // California / Bay Area
  [37.7749, -122.4194, 0.95],
  [37.3861, -122.0839, 0.85],  // Silicon Valley
  [34.0522, -118.2437, 0.70],  // Los Angeles

  // London / UK
  [51.5074, -0.1278,  0.90],
  [52.4862,  -1.8904, 0.55],  // Birmingham

  // Berlin
  [52.5200,  13.4050, 0.88],
  [53.5511,  9.9937,  0.50],  // Hamburg

  // Bengaluru / India
  [12.9716,  77.5946, 0.92],
  [19.0760,  72.8777, 0.75],  // Mumbai
  [28.7041,  77.1025, 0.65],  // Delhi

  // Bariana / fictitious — placed near Punjab, India as per reference
  [30.9010,  75.8573, 0.80],

  // Additional clusters
  [48.8566,   2.3522, 0.72],  // Paris
  [55.7558,  37.6173, 0.60],  // Moscow
  [35.6762, 139.6503, 0.68],  // Tokyo
  [1.3521,  103.8198, 0.60],  // Singapore
  [25.2048,  55.2708, 0.55],  // Dubai
  [-33.8688, 151.2093,0.50],  // Sydney
  [43.6532, -79.3832, 0.58],  // Toronto
  [40.7128, -74.0060, 0.80],  // New York
]

// ─── Inner component — renders heat layer using the map instance ──────────────
const HeatLayer = ({ points }) => {
  const map      = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    if (!map) return

    // Remove previous layer if it exists
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }

    layerRef.current = L.heatLayer(points, {
      radius:     28,
      blur:       20,
      maxZoom:    6,
      max:        1.0,
      minOpacity: 0.45,
      gradient: {
        0.0: '#0a0a14',
        0.3: '#002040',
        0.5: '#004466',
        0.65: '#00b8a9',   // teal-dim
        0.8:  '#00e6d2',   // teal
        1.0:  '#ffb347',   // amber for peak clusters
      },
    }).addTo(map)

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
    }
  }, [map, points])

  return null
}

// ─── Public component ─────────────────────────────────────────────────────────
// Drop-in replacement for the static SVG heatmap in MatchingMatrixView.
// Props:
//   height  — CSS height string (default '180px')
//   points  — optional override [[lat,lng,intensity], …]
const TalentHeatmap = ({ height = '180px', points = TALENT_CLUSTERS }) => {
  return (
    <div style={{
      height,
      borderRadius: 4,
      overflow: 'hidden',
      position: 'relative',
      // Override default Leaflet light background
      background: 'oklch(12% 0.02 250)',
    }}>
      <MapContainer
        center={[25, 15]}
        zoom={2}
        minZoom={1}
        maxZoom={6}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: 'oklch(12% 0.02 250)' }}
      >
        {/* Dark no-label tile — CartoDB dark_matter_no_labels */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        <HeatLayer points={points} />
      </MapContainer>
    </div>
  )
}

export default TalentHeatmap
