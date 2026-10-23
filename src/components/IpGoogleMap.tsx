import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { ExternalLink, Navigation, Layers, MapPin } from 'lucide-react';

export interface IpLocationData {
  ip: string;
  type?: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  postal?: string;
  latitude: number;
  longitude: number;
  connection?: {
    asn?: number;
    org?: string;
    isp?: string;
    domain?: string;
  };
  timezone?: {
    id?: string;
    utc?: string;
  };
  flagUrl?: string;
}

interface IpGoogleMapProps {
  location: IpLocationData;
  apiKey: string;
}

// Controller component to smoothly pan and zoom map to new IP coordinates
function MapCameraController({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.panTo(position);
      map.setZoom(12);
    }
  }, [map, position]);

  return null;
}

export const IpGoogleMap: React.FC<IpGoogleMapProps> = ({ location, apiKey }) => {
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('hybrid');
  const position = {
    lat: location.latitude,
    lng: location.longitude,
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

  return (
    <div className="w-full h-[clamp(320px,55dvh,450px)] sm:h-[520px] rounded-xl overflow-hidden border border-zinc-800 relative bg-[#09090b] shadow-2xl flex flex-col">
      <APIProvider apiKey={apiKey}>
        <Map
          key={`${location.latitude.toFixed(4)}-${location.longitude.toFixed(4)}`}
          defaultCenter={position}
          defaultZoom={12}
          mapId="DEMO_MAP_ID"
          mapTypeId={mapType}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
        >
          <MapCameraController position={position} />

          {/* Precision Pin Marker on exact GPS coordinates */}
          <AdvancedMarker position={position} title={`${location.ip} (${location.city}, ${location.country})`}>
            <div className="relative flex items-center justify-center">
              {/* Pulsating animated radar wave */}
              <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-rose-500 opacity-60" />
              <span className="absolute inline-flex h-7 w-7 rounded-full bg-rose-600/40 border border-white" />
              <Pin
                background="#E11D48"
                borderColor="#FFFFFF"
                glyphColor="#FFFFFF"
                scale={1.25}
              />
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>

      {/* Top Floating Tactical Geolocation Card */}
      <div className="absolute top-3 left-3 z-10 bg-black/90 backdrop-blur-md border border-zinc-700/80 rounded-lg p-3 text-xs font-mono text-zinc-300 shadow-2xl max-w-[calc(100%-24px)] sm:max-w-xs pointer-events-auto">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 font-bold text-white text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="truncate">{location.ip}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            {location.type || 'IPv4'}
          </span>
        </div>

        <div className="text-zinc-300 text-xs font-medium">
          {location.city ? `${location.city}, ` : ''}
          {location.region ? `${location.region}, ` : ''}
          {location.country}
        </div>

        <div className="text-emerald-400 font-bold text-[11px] mt-1 flex items-center gap-1">
          <Navigation className="w-3 h-3 text-emerald-400" />
          <span>GPS: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
        </div>

        {location.connection?.isp && (
          <div className="text-zinc-400 text-[11px] mt-1 pt-1 border-t border-zinc-800/80 truncate">
            ISP: <span className="text-zinc-200">{location.connection.isp}</span>
          </div>
        )}
      </div>

      {/* Top Right Map Style & External View Controls */}
      <div className="absolute top-[140px] right-3 z-10 flex items-center gap-1.5 bg-black/90 backdrop-blur-md border border-zinc-700 rounded-lg p-1.5 text-xs font-mono sm:top-3">
        <button
          type="button"
          onClick={() => setMapType('hybrid')}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            mapType === 'hybrid' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Satellite
        </button>
        <button
          type="button"
          onClick={() => setMapType('roadmap')}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            mapType === 'roadmap' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Roadmap
        </button>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
          title="Open coordinates in external satellite viewer"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Bottom Coordinates Strip */}
      <div className="absolute bottom-2 left-3 right-3 z-10 bg-black/85 backdrop-blur-sm border border-zinc-800/90 rounded px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-zinc-400 pointer-events-none">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span>Target Geolocation Locked</span>
        </div>
        <div className="hidden sm:block text-zinc-500 text-[10px]">
          Real-Time GPS Telemetry &bull; Precision Pinpoint
        </div>
      </div>
    </div>
  );
};
