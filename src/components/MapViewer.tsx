
import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from "sonner";
import { cn } from '@/lib/utils';

interface MapViewerProps {
  className?: string;
  summaryData?: Record<string, any>[];
}

const MapViewer: React.FC<MapViewerProps> = ({ className, summaryData }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Clean up function to remove the map when the component unmounts
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
      
      setLoading(true);
      
      try {
        // Initialize the map
        leafletMap.current = L.map(mapRef.current, {
          minZoom: 7,
          maxZoom: 18,
        });
        
        // Add satellite tile layer
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(leafletMap.current);
        
        // Load and display GeoJSON
        try {
          const response = await fetch('/data/goesan.geojson');
          
          if (!response.ok) {
            throw new Error(`Failed to load GeoJSON file (${response.status})`);
          }
          
          const geojsonData = await response.json();
          
          // Validate GeoJSON
          if (!geojsonData || !geojsonData.features || !Array.isArray(geojsonData.features)) {
            throw new Error('Invalid GeoJSON format');
          }
          
          // Add GeoJSON layer
          const geojsonLayer = L.geoJSON(geojsonData, {
            style: (feature) => {
              // Default styling
              const defaultStyle = {
                color: '#666666',
                weight: 1,
                opacity: 1,
                fillColor: '#cccccc',
                fillOpacity: 0.5
              };
              
              // If we have summary data, we could style based on it
              if (summaryData && feature?.properties?.TOT_REG_CD) {
                const regionCode = feature.properties.TOT_REG_CD;
                const regionData = summaryData.find(item => item.region_code === regionCode);
                
                if (regionData) {
                  const categoriesCount = parseInt(regionData.total_categories_met);
                  
                  // Style based on how many criteria are met
                  if (categoriesCount === 3) {
                    return {
                      ...defaultStyle,
                      fillColor: '#ef4444', // Red for 3 categories
                      fillOpacity: 0.7
                    };
                  } else if (categoriesCount === 2) {
                    return {
                      ...defaultStyle,
                      fillColor: '#f97316', // Orange for 2 categories
                      fillOpacity: 0.6
                    };
                  } else if (categoriesCount === 1) {
                    return {
                      ...defaultStyle,
                      fillColor: '#facc15', // Yellow for 1 category
                      fillOpacity: 0.5
                    };
                  }
                }
              }
              
              return defaultStyle;
            },
            onEachFeature: (feature, layer) => {
              if (feature.properties) {
                const regionCode = feature.properties.TOT_REG_CD || 'Unknown';
                let popupContent = `<div class="map-popup">
                  <strong>지역 코드:</strong> ${regionCode}<br>`;
                
                // Add other properties if available
                if (feature.properties.EMD_CD) {
                  popupContent += `<strong>EMD 코드:</strong> ${feature.properties.EMD_CD}<br>`;
                }
                if (feature.properties.EMD_KOR_NM) {
                  popupContent += `<strong>지역 이름:</strong> ${feature.properties.EMD_KOR_NM}<br>`;
                }
                
                // Add summary data if available
                if (summaryData) {
                  const regionData = summaryData.find(item => item.region_code === regionCode);
                  if (regionData) {
                    popupContent += `<hr>
                      <strong>충족 지표 수:</strong> ${regionData.total_categories_met}<br>
                      <strong>인구 감소:</strong> ${regionData.population_category_met === 'O' ? '예' : '아니오'}<br>
                      <strong>산업 감소:</strong> ${regionData.industry_category_met === 'O' ? '예' : '아니오'}<br>
                      <strong>노후 건물:</strong> ${regionData.environment_category_met === 'O' ? '예' : '아니오'}<br>`;
                  }
                }
                
                popupContent += `</div>`;
                
                layer.bindPopup(popupContent);
                
                // Highlight on hover
                layer.on({
                  mouseover: (e) => {
                    const targetLayer = e.target;
                    targetLayer.setStyle({
                      weight: 2,
                      color: '#666',
                      dashArray: '',
                      fillOpacity: 0.7
                    });
                    
                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                      targetLayer.bringToFront();
                    }
                  },
                  mouseout: (e) => {
                    geojsonLayer.resetStyle(e.target);
                  },
                  click: (e) => {
                    leafletMap.current?.fitBounds(e.target.getBounds());
                  }
                });
              }
            }
          }).addTo(leafletMap.current);
          
          // Fit map to GeoJSON bounds
          const bounds = geojsonLayer.getBounds();
          if (bounds.isValid()) {
            leafletMap.current.fitBounds(bounds);
          } else {
            // If bounds are not valid, set a default view
            leafletMap.current.setView([36.8, 127.8], 10);
          }
          
          setLoading(false);
          setError(null);
          
        } catch (geoJsonError) {
          console.error('Error loading GeoJSON:', geoJsonError);
          setError('GeoJSON 데이터를 로드하는 중 오류가 발생했습니다.');
          toast.error('지도 데이터를 로드하는 중 오류가 발생했습니다.');
          setLoading(false);
        }
        
      } catch (mapError) {
        console.error('Error initializing map:', mapError);
        setError('지도를 초기화하는 중 오류가 발생했습니다.');
        toast.error('지도를 초기화하는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };
    
    initMap();
  }, [summaryData]);
  
  return (
    <div className={cn("w-full relative", className)}>
      <div 
        ref={mapRef}
        className={cn(
          "w-full h-[400px] rounded-lg overflow-hidden border border-border",
          loading && "animate-pulse bg-muted"
        )}
      />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-sm text-muted-foreground">지도 로딩 중...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-sm text-destructive text-center p-4">
            {error}
            <p className="mt-2 text-xs text-muted-foreground">
              '/data/goesan.geojson' 파일이 public 폴더에 있는지 확인하세요.
            </p>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        .map-popup {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 13px;
          line-height: 1.5;
          padding: 4px 2px;
        }
        .map-popup hr {
          margin: 8px 0;
          border: 0;
          border-top: 1px solid #eee;
        }
      `}</style>
    </div>
  );
};

export default MapViewer;
