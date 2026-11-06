import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Globe from 'globe.gl';
import { feature } from 'topojson-client';
import countriesData from 'world-atlas/countries-110m.json';
import { Activity, ExternalLink, Radio, ShieldAlert, X } from 'lucide-react';
import { useCheckPointThreatFeed, type ThreatAttack } from '../lib/useCheckPointThreatFeed';

interface CountryIntel {
  trend?: { attacks?: number[]; dates?: string[] };
  malware_types?: { attacksByType?: Record<string, number[]>; dates?: string[] };
}

interface ThreatMapStats {
  countries?: Array<{ id: string; fraction: number }>;
  industries?: Array<{ id: string; fraction: number }>;
  malwareTypes?: Array<{ id: string; fraction: number }>;
}

const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });
const normalizeCountryName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const countryCodeByName = new Map<string, string>();
for (let first = 65; first <= 90; first += 1) {
  for (let second = 65; second <= 90; second += 1) {
    const code = String.fromCharCode(first, second);
    const name = countryDisplayNames.of(code);
    if (name && name !== code) countryCodeByName.set(normalizeCountryName(name), code);
  }
}
[
  ['United States of America', 'US'],
  ['Dem. Rep. Congo', 'CD'],
  ['Democratic Republic of the Congo', 'CD'],
  ['Republic of the Congo', 'CG'],
  ['Congo', 'CG'],
  ['Ivory Coast', 'CI'],
  ['North Korea', 'KP'],
  ['South Korea', 'KR'],
  ['Taiwan', 'TW'],
  ['Syria', 'SY'],
  ['Iran', 'IR'],
  ['Russia', 'RU'],
  ['Vietnam', 'VN'],
  ['Laos', 'LA'],
  ['Moldova', 'MD'],
  ['Brunei', 'BN'],
  ['Tanzania', 'TZ'],
  ['Bolivia', 'BO'],
  ['Venezuela', 'VE'],
  ['Micronesia', 'FM'],
].forEach(([name, code]) => countryCodeByName.set(normalizeCountryName(name), code));

// --- Types ---
export interface NetworkCable {
  id: string;
  name: string;
  source: string;
  target: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color?: string | string[];
  altitude?: number;
  stroke?: number;
  dashLength?: number;
  dashGap?: number;
  dashAnimateTime?: number;
}

export interface NetworkNode {
  name: string;
  code: string;
  lat: number;
  lng: number;
  color: string;
}

export interface CountryLabelItem {
  name: string;
  code: string;
  lat: number;
  lng: number;
  size: number;
}

// --- Country Labels on Globe Surface ---
const WORLD_COUNTRY_LABELS: CountryLabelItem[] = [
  { name: 'RUSSIA', code: 'RU', lat: 58.5, lng: 95.0, size: 1.1 },
  { name: 'GERMANY', code: 'DE', lat: 51.16, lng: 10.45, size: 0.8 },
  { name: 'FRANCE', code: 'FR', lat: 46.5, lng: 2.5, size: 0.8 },
  { name: 'UNITED KINGDOM', code: 'GB', lat: 54.0, lng: -2.5, size: 0.75 },
  { name: 'ITALY', code: 'IT', lat: 42.5, lng: 12.5, size: 0.75 },
  { name: 'SPAIN', code: 'ES', lat: 40.2, lng: -3.7, size: 0.8 },
  { name: 'POLAND', code: 'PL', lat: 52.0, lng: 19.5, size: 0.75 },
  { name: 'UKRAINE', code: 'UA', lat: 49.0, lng: 31.5, size: 0.8 },
  { name: 'SWEDEN', code: 'SE', lat: 62.0, lng: 16.0, size: 0.75 },
  { name: 'NORWAY', code: 'NO', lat: 61.5, lng: 8.5, size: 0.7 },
  { name: 'FINLAND', code: 'FI', lat: 64.0, lng: 26.0, size: 0.7 },
  { name: 'TURKEY', code: 'TR', lat: 39.0, lng: 35.0, size: 0.8 },
  { name: 'ALGERIA', code: 'DZ', lat: 28.0, lng: 3.0, size: 0.9 },
  { name: 'EGYPT', code: 'EG', lat: 26.8, lng: 30.0, size: 0.85 },
  { name: 'SUDAN', code: 'SD', lat: 15.5, lng: 30.0, size: 0.85 },
  { name: 'NIGERIA', code: 'NG', lat: 9.5, lng: 8.0, size: 0.8 },
  { name: 'SOUTH AFRICA', code: 'ZA', lat: -29.0, lng: 25.0, size: 0.85 },
  { name: 'KENYA', code: 'KE', lat: 0.5, lng: 38.0, size: 0.75 },
  { name: 'MOROCCO', code: 'MA', lat: 31.8, lng: -6.0, size: 0.75 },
  { name: 'SAUDI ARABIA', code: 'SA', lat: 24.0, lng: 45.0, size: 0.9 },
  { name: 'IRAN', code: 'IR', lat: 32.5, lng: 54.0, size: 0.85 },
  { name: 'UNITED ARAB EMIRATES', code: 'AE', lat: 24.0, lng: 54.0, size: 0.65 },
  { name: 'INDIA', code: 'IN', lat: 22.0, lng: 79.0, size: 1.0 },
  { name: 'PAKISTAN', code: 'PK', lat: 30.0, lng: 70.0, size: 0.8 },
  { name: 'CHINA', code: 'CN', lat: 36.5, lng: 104.0, size: 1.1 },
  { name: 'JAPAN', code: 'JP', lat: 37.0, lng: 138.0, size: 0.8 },
  { name: 'SOUTH KOREA', code: 'KR', lat: 36.5, lng: 128.0, size: 0.65 },
  { name: 'SINGAPORE', code: 'SG', lat: 1.35, lng: 103.81, size: 0.6 },
  { name: 'INDONESIA', code: 'ID', lat: -2.0, lng: 118.0, size: 0.85 },
  { name: 'AUSTRALIA', code: 'AU', lat: -25.0, lng: 134.0, size: 1.1 },
  { name: 'NEW ZEALAND', code: 'NZ', lat: -41.0, lng: 174.0, size: 0.75 },
  { name: 'UNITED STATES', code: 'US', lat: 39.0, lng: -98.0, size: 1.1 },
  { name: 'CANADA', code: 'CA', lat: 56.0, lng: -106.0, size: 1.1 },
  { name: 'MEXICO', code: 'MX', lat: 24.0, lng: -102.0, size: 0.9 },
  { name: 'BRAZIL', code: 'BR', lat: -13.0, lng: -52.0, size: 1.1 },
  { name: 'ARGENTINA', code: 'AR', lat: -35.0, lng: -65.0, size: 0.9 },
  { name: 'COLOMBIA', code: 'CO', lat: 4.0, lng: -73.0, size: 0.8 },
  { name: 'CHILE', code: 'CL', lat: -33.0, lng: -71.0, size: 0.75 },
];

const topology = countriesData as unknown as { objects: { countries: never } };
const WORLD_COUNTRY_FEATURES = (
  feature(topology as never, topology.objects.countries as never) as unknown as {
    features: unknown[];
  }
).features;

// --- Worldwide Blue Line Network Cables ---
const GLOBAL_BLUE_NETWORK_CABLES: NetworkCable[] = [
  // Transatlantic
  { id: '1', name: 'US-UK', source: 'USA', target: 'UK', startLat: 40.71, startLng: -74.0, endLat: 51.5, endLng: -0.12 },
  { id: '2', name: 'US-ES', source: 'USA', target: 'Spain', startLat: 36.85, startLng: -76.0, endLat: 40.41, endLng: -3.7 },
  { id: '3', name: 'US-FR', source: 'USA', target: 'France', startLat: 40.71, startLng: -74.0, endLat: 48.85, endLng: 2.35 },
  { id: '4', name: 'US-NL', source: 'USA', target: 'Netherlands', startLat: 40.71, startLng: -74.0, endLat: 52.36, endLng: 4.9 },
  { id: '5', name: 'CA-UK', source: 'Canada', target: 'UK', startLat: 45.42, startLng: -75.69, endLat: 51.5, endLng: -0.12 },
  // Americas
  { id: '6', name: 'US-Coast', source: 'USA East', target: 'USA West', startLat: 40.71, startLng: -74.0, endLat: 37.77, endLng: -122.41 },
  { id: '7', name: 'US-MX', source: 'USA', target: 'Mexico', startLat: 37.77, startLng: -122.41, endLat: 19.43, endLng: -99.13 },
  { id: '8', name: 'US-BR', source: 'USA', target: 'Brazil', startLat: 25.76, startLng: -80.19, endLat: -23.55, endLng: -46.63 },
  { id: '9', name: 'BR-AR', source: 'Brazil', target: 'Argentina', startLat: -23.55, startLng: -46.63, endLat: -34.6, endLng: -58.38 },
  { id: '10', name: 'AR-CL', source: 'Argentina', target: 'Chile', startLat: -34.6, startLng: -58.38, endLat: -33.44, endLng: -70.66 },
  { id: '11', name: 'BR-PT', source: 'Brazil', target: 'Portugal', startLat: -23.55, startLng: -46.63, endLat: 38.72, endLng: -9.13 },
  { id: '12', name: 'BR-ZA', source: 'Brazil', target: 'South Africa', startLat: -23.55, startLng: -46.63, endLat: -33.92, endLng: 18.42 },
  // Europe
  { id: '13', name: 'UK-FR', source: 'UK', target: 'France', startLat: 51.5, startLng: -0.12, endLat: 48.85, endLng: 2.35 },
  { id: '14', name: 'FR-DE', source: 'France', target: 'Germany', startLat: 48.85, startLng: 2.35, endLat: 52.52, endLng: 13.4 },
  { id: '15', name: 'DE-PL', source: 'Germany', target: 'Poland', startLat: 52.52, startLng: 13.4, endLat: 52.22, endLng: 21.01 },
  { id: '16', name: 'PL-UA', source: 'Poland', target: 'Ukraine', startLat: 52.22, startLng: 21.01, endLat: 50.45, endLng: 30.52 },
  { id: '17', name: 'DE-SE', source: 'Germany', target: 'Sweden', startLat: 52.52, startLng: 13.4, endLat: 59.32, endLng: 18.06 },
  { id: '18', name: 'SE-NO', source: 'Sweden', target: 'Norway', startLat: 59.32, startLng: 18.06, endLat: 59.91, endLng: 10.75 },
  { id: '19', name: 'FR-IT', source: 'France', target: 'Italy', startLat: 48.85, startLng: 2.35, endLat: 41.9, endLng: 12.49 },
  { id: '20', name: 'IT-GR', source: 'Italy', target: 'Greece', startLat: 41.9, startLng: 12.49, endLat: 37.98, endLng: 23.72 },
  { id: '21', name: 'GR-TR', source: 'Greece', target: 'Turkey', startLat: 37.98, startLng: 23.72, endLat: 41.0, endLng: 28.97 },
  // Africa & Mediterranean
  { id: '22', name: 'IT-EG', source: 'Italy', target: 'Egypt', startLat: 41.9, startLng: 12.49, endLat: 30.04, endLng: 31.23 },
  { id: '23', name: 'ES-MA', source: 'Spain', target: 'Morocco', startLat: 40.41, startLng: -3.7, endLat: 33.57, endLng: -7.58 },
  { id: '24', name: 'MA-NG', source: 'Morocco', target: 'Nigeria', startLat: 33.57, startLng: -7.58, endLat: 6.52, endLng: 3.37 },
  { id: '25', name: 'NG-ZA', source: 'Nigeria', target: 'South Africa', startLat: 6.52, startLng: 3.37, endLat: -33.92, endLng: 18.42 },
  { id: '26', name: 'EG-KE', source: 'Egypt', target: 'Kenya', startLat: 30.04, startLng: 31.23, endLat: -1.29, endLng: 36.82 },
  { id: '27', name: 'KE-ZA', source: 'Kenya', target: 'South Africa', startLat: -1.29, startLng: 36.82, endLat: -33.92, endLng: 18.42 },
  // Middle East & Asia
  { id: '28', name: 'EG-SA', source: 'Egypt', target: 'Saudi Arabia', startLat: 30.04, startLng: 31.23, endLat: 24.71, endLng: 46.67 },
  { id: '29', name: 'SA-AE', source: 'Saudi Arabia', target: 'UAE', startLat: 24.71, startLng: 46.67, endLat: 25.2, endLng: 55.27 },
  { id: '30', name: 'AE-IN', source: 'UAE', target: 'India', startLat: 25.2, startLng: 55.27, endLat: 18.92, endLng: 72.83 },
  { id: '31', name: 'IN-PK', source: 'India', target: 'Pakistan', startLat: 18.92, startLng: 72.83, endLat: 24.86, endLng: 67.0 },
  { id: '32', name: 'IN-SG', source: 'India', target: 'Singapore', startLat: 13.08, startLng: 80.27, endLat: 1.35, endLng: 103.81 },
  { id: '33', name: 'SG-MY', source: 'Singapore', target: 'Malaysia', startLat: 1.35, startLng: 103.81, endLat: 3.13, endLng: 101.68 },
  { id: '34', name: 'SG-ID', source: 'Singapore', target: 'Indonesia', startLat: 1.35, startLng: 103.81, endLat: -6.2, endLng: 106.84 },
  { id: '35', name: 'SG-CN', source: 'Singapore', target: 'China', startLat: 1.35, startLng: 103.81, endLat: 22.31, endLng: 114.16 },
  { id: '36', name: 'CN-JP', source: 'China', target: 'Japan', startLat: 31.23, startLng: 121.47, endLat: 35.67, endLng: 139.65 },
  { id: '37', name: 'JP-KR', source: 'Japan', target: 'South Korea', startLat: 35.67, startLng: 139.65, endLat: 37.56, endLng: 126.97 },
  { id: '38', name: 'RU-CN', source: 'Russia', target: 'China', startLat: 55.75, startLng: 37.61, endLat: 39.9, endLng: 116.4 },
  // Pacific & Oceania
  { id: '39', name: 'SG-AU', source: 'Singapore', target: 'Australia', startLat: 1.35, startLng: 103.81, endLat: -31.95, endLng: 115.86 },
  { id: '40', name: 'AU-Coast', source: 'Perth', target: 'Sydney', startLat: -31.95, startLng: 115.86, endLat: -33.86, endLng: 151.2 },
  { id: '41', name: 'AU-NZ', source: 'Australia', target: 'New Zealand', startLat: -33.86, startLng: 151.2, endLat: -36.84, endLng: 174.76 },
  { id: '42', name: 'JP-US', source: 'Japan', target: 'USA West', startLat: 35.67, startLng: 139.65, endLat: 37.77, endLng: -122.41 },
  { id: '43', name: 'AU-US', source: 'Australia', target: 'USA West', startLat: -33.86, startLng: 151.2, endLat: 37.77, endLng: -122.41 },
];

export const Globe3DMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const { attacks, feedState, totalToday } = useCheckPointThreatFeed();
  const [topStats, setTopStats] = useState<ThreatMapStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<{
    name: string;
    code: string | null;
    polygon?: unknown;
  } | null>(null);
  const [countryIntel, setCountryIntel] = useState<CountryIntel | null>(null);
  const [countryIntelError, setCountryIntelError] = useState<string | null>(null);
  const [selectedAttack, setSelectedAttack] = useState<ThreatAttack | null>(null);
  const countryAttacks = useMemo(() => {
    if (!selectedCountry) return [];
    return attacks.filter((attack) => {
      const codes = [attack.d_co, attack.s_co].filter((code): code is string => Boolean(code));
      return selectedCountry.code
        ? codes.includes(selectedCountry.code)
        : codes.some((code) => normalizeCountryName(countryDisplayNames.of(code) || '') === normalizeCountryName(selectedCountry.name));
    });
  }, [attacks, selectedCountry]);

  useEffect(() => {
    const controller = new AbortController();
    const loadTopStats = async () => {
      try {
        const response = await fetch('/api/threat-map/top-stats', { signal: controller.signal });
        if (!response.ok) throw new Error(`Threat statistics request failed with HTTP ${response.status}.`);
        setTopStats(await response.json() as ThreatMapStats);
        setStatsError(null);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Could not load Check Point threat statistics:', error);
          setStatsError('Threat statistics are temporarily unavailable.');
        }
      }
    };
    void loadTopStats();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedCountry?.code) {
      setCountryIntel(null);
      setCountryIntelError(null);
      return;
    }
    const controller = new AbortController();
    const loadCountryIntel = async () => {
      setCountryIntel(null);
      setCountryIntelError(null);
      try {
        const response = await fetch(`/api/threat-map/countries/${encodeURIComponent(selectedCountry.code!)}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Country details request failed with HTTP ${response.status}.`);
        setCountryIntel(result as CountryIntel);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(`Could not load Check Point data for ${selectedCountry.name}:`, error);
          setCountryIntelError(error instanceof Error ? error.message : 'Country threat details are unavailable.');
        }
      }
    };
    void loadCountryIntel();
    return () => controller.abort();
  }, [selectedCountry]);

  // Initialize Three.js Globe
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    const GlobeConstructor = (Globe as any).default || Globe;
    const world = GlobeConstructor()(containerRef.current)
      .width(width)
      .height(height)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#00f0ff')
      .atmosphereAltitude(0.16)
      .showGraticules(false);

    globeRef.current = world;
    world.scene().background = null;
    world.renderer().setClearColor(0x000000, 0);
    world.renderer().setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.25 : 2));

    // Matte dark graphite sphere body
    const globeMaterial = world.globeMaterial?.();
    if (globeMaterial) {
      globeMaterial.color = new THREE.Color('#10151c');
      globeMaterial.emissive = new THREE.Color('#030508');
      globeMaterial.emissiveIntensity = 0.2;
      globeMaterial.roughness = 0.85;
      globeMaterial.metalness = 0.15;
      globeMaterial.needsUpdate = true;
    }

    // Emerald cosmic nebula star particles in Three.js background
    const starsGroup = new THREE.Group();
    const starCount = window.innerWidth < 768 ? 1000 : 3000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const palette = [
      new THREE.Color('#10b981'),
      new THREE.Color('#059669'),
      new THREE.Color('#00f0ff'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < starCount; i++) {
      const r = 500 + Math.random() * 800;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
      const col = palette[Math.floor(Math.random() * palette.length)];
      starColors[i * 3] = col.r;
      starColors[i * 3 + 1] = col.g;
      starColors[i * 3 + 2] = col.b;
    }

    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.6, vertexColors: true, transparent: true, opacity: 0.75 });
    starsGroup.add(new THREE.Points(starGeom, starMat));
    world.scene().add(starsGroup);

    // Rim lighting
    world.scene().add(new THREE.AmbientLight(0x223344, 1.4));
    const d1 = new THREE.DirectionalLight(0x38bdf8, 1.5);
    d1.position.set(400, 300, 200);
    world.scene().add(d1);
    const d2 = new THREE.DirectionalLight(0x10b981, 1.0);
    d2.position.set(-300, -200, -300);
    world.scene().add(d2);

    // Controls
    const controls = world.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.18;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = 140;
      controls.maxDistance = 500;
    }

    world.pointOfView({ lat: 28, lng: 105, altitude: 2.1 }, 1200);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && globeRef.current) globeRef.current.width(w).height(h);
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (globeRef.current?._destructor) globeRef.current._destructor();
      globeRef.current = null;
    };
  }, []);

  // 3D Extruded Country Polygons
  useEffect(() => {
    const world = globeRef.current;
    if (!world || WORLD_COUNTRY_FEATURES.length === 0) return;
    world
      .polygonsData(WORLD_COUNTRY_FEATURES)
      .polygonAltitude(0.024)
      .polygonCapColor(() => '#1b232c')
      .polygonSideColor(() => '#070b10')
      .polygonStrokeColor(() => '#141c24')
      .onPolygonClick((polygon: any) => {
        const name = polygon?.properties?.name || polygon?.name;
        if (typeof name !== 'string' || !name.trim()) return;
        setSelectedCountry({
          name,
          code: countryCodeByName.get(normalizeCountryName(name)) || null,
          polygon,
        });
        setSelectedAttack(null);
      });
  }, []);

  // Full Globe Blue Line Network Cables
  useEffect(() => {
    const world = globeRef.current;
    if (!world) return;
    world
      .arcsData(GLOBAL_BLUE_NETWORK_CABLES)
      .arcStartLat((d: any) => d.startLat)
      .arcStartLng((d: any) => d.startLng)
      .arcEndLat((d: any) => d.endLat)
      .arcEndLng((d: any) => d.endLng)
      .arcColor(() => ['#0077ff', '#00f0ff'])
      .arcAltitude(0.015)
      .arcStroke(1.5)
      .arcDashLength(0.35)
      .arcDashGap(0.12)
      .arcDashAnimateTime(1600);
  }, []);

  useEffect(() => {
    const world = globeRef.current;
    if (!world) return;

    const liveArcs = attacks.flatMap((attack) => {
      if (
        typeof attack.s_la !== 'number' ||
        typeof attack.s_lo !== 'number' ||
        typeof attack.d_la !== 'number' ||
        typeof attack.d_lo !== 'number' ||
        (Math.abs(attack.s_la - attack.d_la) <= 0.1 && Math.abs(attack.s_lo - attack.d_lo) <= 0.1)
      ) return [];
      return [{
        ...attack,
        id: `live-${attack.id}`,
        liveThreat: true,
        startLat: attack.s_la,
        startLng: attack.s_lo,
        endLat: attack.d_la,
        endLng: attack.d_lo,
      }];
    });
    world
      .arcsData([...GLOBAL_BLUE_NETWORK_CABLES, ...liveArcs])
      .arcStartLat((d: any) => d.startLat)
      .arcStartLng((d: any) => d.startLng)
      .arcEndLat((d: any) => d.endLat)
      .arcEndLng((d: any) => d.endLng)
      .arcColor((d: any) => d.liveThreat ? (d.a_t === 'phishing' ? '#f59e0b' : '#fb3b64') : ['#0077ff', '#00f0ff'])
      .arcAltitude((d: any) => d.liveThreat ? 0.12 : 0.015)
      .arcStroke((d: any) => d.liveThreat ? 1.2 : 1.5)
      .arcDashLength((d: any) => d.liveThreat ? 0.7 : 0.35)
      .arcDashGap((d: any) => d.liveThreat ? 0.2 : 0.12)
      .arcDashAnimateTime((d: any) => d.liveThreat ? 900 : 1600);

    const locatedAttacks = attacks.filter(
      (attack) => typeof attack.d_la === 'number' && typeof attack.d_lo === 'number'
    );
    world
      .pointsData(locatedAttacks)
      .pointLat((d: any) => d.d_la)
      .pointLng((d: any) => d.d_lo)
      .pointAltitude(0.04)
      .pointRadius(0.32)
      .pointResolution(8)
      .pointColor((d: any) => d.a_t === 'phishing' ? '#f59e0b' : '#fb3b64')
      .pointLabel((d: any) => `${d.a_n} · ${d.d_co || 'Unknown destination'}`)
      .onPointClick((point: ThreatAttack) => {
        setSelectedAttack(point);
        setSelectedCountry(null);
      });
    world
      .ringsData(locatedAttacks)
      .ringLat((d: any) => d.d_la)
      .ringLng((d: any) => d.d_lo)
      .ringColor((d: any) => d.a_t === 'phishing' ? '#f59e0b' : '#fb3b64')
      .ringMaxRadius(2.2)
      .ringPropagationSpeed(2.4)
      .ringRepeatPeriod(1200);
  }, [attacks]);

  // Country Names directly on the 3D globe surface
  useEffect(() => {
    const world = globeRef.current;
    if (!world) return;
    world
      .labelsData(WORLD_COUNTRY_LABELS)
      .labelLat((d: any) => d.lat)
      .labelLng((d: any) => d.lng)
      .labelText((d: any) => d.name)
      .labelSize((d: any) => (d.size || 0.8) * 0.72)
      .labelDotRadius(0.14)
      .labelColor(() => '#a1b3c8')
      .labelAltitude(0.038)
      .labelResolution(3);
  }, []);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section
        aria-label="Live global cyber attack map"
        className="h-[clamp(380px,55dvh,760px)] min-h-[380px] overflow-hidden rounded-xl md:h-[clamp(520px,calc(100dvh-280px),760px)] md:min-h-[520px]"
        style={{
          position: 'relative',
          width: '100%',
          background: '#03060c',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: 12,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), #03060c',
          }}
        />
        <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
          <span className="rounded border border-blue-500/40 bg-black/70 px-2 py-1 text-cyan-300">Network routes</span>
          <span className="rounded border border-rose-500/40 bg-black/70 px-2 py-1 text-rose-300">Live attacks</span>
          <span className="rounded border border-amber-500/40 bg-black/70 px-2 py-1 text-amber-300">Phishing</span>
        </div>
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-zinc-700/70 bg-black/80 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
          <span className={`h-2 w-2 rounded-full ${feedState === 'live' ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'}`} />
          {feedState === 'live' ? 'Attack feed live' : feedState === 'connecting' ? 'Connecting to feed' : 'Reconnecting'}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-cyan-900/50 bg-[#070b11] sm:max-h-[760px] sm:min-h-[500px] lg:min-h-[520px]">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-rose-400" />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Live cyber attacks</h2>
              <p className="mt-0.5 text-[10px] text-zinc-500">3D Globe Map Intelligence</p>
            </div>
          </div>
          <a
            href="https://threatmap.checkpoint.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="Open Check Point threat map"
            className="rounded border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:border-cyan-700 hover:text-cyan-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="border-b border-zinc-800 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Attacks reported today</p>
          <p className="mt-1 font-mono text-2xl font-bold text-rose-300">
            {totalToday === null ? '—' : totalToday.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] text-zinc-500">Live global total reported by Check Point.</p>
        </div>

        {(selectedAttack || selectedCountry) && (
          <section className="border-b border-cyan-900/40 bg-cyan-950/15 px-4 py-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-100">
                  {selectedAttack ? 'Attack details' : selectedCountry?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAttack(null);
                  setSelectedCountry(null);
                }}
                aria-label="Clear selected threat details"
                className="text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedAttack && (
              <dl className="grid grid-cols-[102px_minmax(0,1fr)] gap-x-2 gap-y-2 text-[11px]">
                <dt className="text-zinc-500">Threat</dt>
                <dd className="break-words text-zinc-100">{selectedAttack.a_n}</dd>
                <dt className="text-zinc-500">Category</dt>
                <dd className="capitalize text-rose-200">{selectedAttack.a_t}</dd>
                <dt className="text-zinc-500">Event count</dt>
                <dd className="font-mono text-zinc-200">{selectedAttack.a_c?.toLocaleString() ?? 'Not supplied'}</dd>
                <dt className="text-zinc-500">Source</dt>
                <dd className="text-zinc-200">
                  {selectedAttack.s_co ? `${countryDisplayNames.of(selectedAttack.s_co) || selectedAttack.s_co} (${selectedAttack.s_co})` : 'Not supplied'}
                </dd>
                <dt className="text-zinc-500">Destination</dt>
                <dd className="text-zinc-200">
                  {selectedAttack.d_co ? `${countryDisplayNames.of(selectedAttack.d_co) || selectedAttack.d_co} (${selectedAttack.d_co})` : 'Not supplied'}
                </dd>
                <dt className="text-zinc-500">Source location</dt>
                <dd className="break-words text-zinc-200">
                  {selectedAttack.s_s || (typeof selectedAttack.s_la === 'number' && typeof selectedAttack.s_lo === 'number'
                    ? `${selectedAttack.s_la.toFixed(3)}, ${selectedAttack.s_lo.toFixed(3)}`
                    : 'Not supplied')}
                </dd>
                <dt className="text-zinc-500">Target location</dt>
                <dd className="break-words text-zinc-200">
                  {selectedAttack.d_s || (typeof selectedAttack.d_la === 'number' && typeof selectedAttack.d_lo === 'number'
                    ? `${selectedAttack.d_la.toFixed(3)}, ${selectedAttack.d_lo.toFixed(3)}`
                    : 'Not supplied')}
                </dd>
                <dt className="text-zinc-500">Provider time</dt>
                <dd className="text-zinc-200">{selectedAttack.t || 'Not supplied by provider'}</dd>
                <dt className="text-zinc-500">Received</dt>
                <dd className="font-mono text-zinc-400">{new Date(selectedAttack.receivedAt).toLocaleTimeString()}</dd>
              </dl>
            )}

            {selectedCountry && (
              <div className="space-y-3 text-[11px]">
                <p className="text-zinc-500">
                  {selectedCountry.code
                    ? `Country code ${selectedCountry.code} · Check Point country history`
                    : 'Country history is unavailable because the country code could not be matched.'}
                </p>
                {countryIntel && (
                  <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                    <p className="text-zinc-400">
                      {countryIntel.trend?.attacks?.[0] !== undefined
                        ? `${countryIntel.trend.attacks[0].toLocaleString()} reported attacks on ${countryIntel.trend.dates?.[0] || 'latest reported day'}`
                        : 'No daily attack trend supplied'}
                    </p>
                    {countryIntel.malware_types?.attacksByType && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500">Malware trends · latest day (%)</p>
                        {Object.entries(countryIntel.malware_types.attacksByType)
                          .map(([name, values]) => ({ name, value: values[0] }))
                          .filter((item) => typeof item.value === 'number')
                          .sort((a, b) => (b.value || 0) - (a.value || 0))
                          .slice(0, 5)
                          .map((item) => (
                            <div key={item.name} className="flex justify-between gap-2 text-zinc-300">
                              <span>{item.name}</span>
                              <span className="font-mono">{item.value}%</span>
                            </div>
                          ))}
                      </div>
                    )}
                    <p className="mt-2 text-[9px] text-zinc-600">Historical provider data; live events are listed below.</p>
                  </div>
                )}
                {countryIntelError && <p role="alert" className="text-rose-300">{countryIntelError}</p>}
                {selectedCountry.code && !countryIntel && !countryIntelError && (
                  <p className="text-zinc-500">Loading official country history…</p>
                )}
                <p className="text-zinc-500">
                  {countryAttacks.length
                    ? `${countryAttacks.length} recent live event(s) reference this country.`
                    : 'No currently received live event references this country.'}
                </p>
              </div>
            )}
          </section>
        )}

        <div className="min-h-0 flex-1 overflow-y-visible sm:overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {selectedCountry ? `Live events · ${selectedCountry.name}` : 'Recent live events'}
            </h3>
            <span className="font-mono text-[10px] text-zinc-600">
              {selectedCountry ? countryAttacks.length : attacks.length}
            </span>
          </div>
          {(selectedCountry ? countryAttacks : attacks).slice(0, 25).map((attack) => (
            <button
              key={attack.id}
              type="button"
              onClick={() => {
                setSelectedAttack(attack);
                setSelectedCountry(null);
              }}
              className="block w-full border-t border-zinc-800/70 px-4 py-3 text-left transition-colors hover:bg-zinc-900/70"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 text-[11px] font-medium leading-relaxed text-zinc-200">{attack.a_n}</span>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] uppercase ${
                  attack.a_t === 'phishing' ? 'border-amber-800/60 text-amber-300' : 'border-rose-900/70 text-rose-300'
                }`}>{attack.a_t}</span>
              </span>
              <span className="mt-2 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                <span className="truncate">
                  {attack.s_co ? countryDisplayNames.of(attack.s_co) || attack.s_co : 'Unknown source'}
                  {' → '}
                  {attack.d_co ? countryDisplayNames.of(attack.d_co) || attack.d_co : 'Unknown destination'}
                </span>
                <span className="shrink-0 font-mono">{new Date(attack.receivedAt).toLocaleTimeString()}</span>
              </span>
              {attack.a_c !== undefined && (
                <span className="mt-1 block text-[10px] text-zinc-600">Provider event count: {attack.a_c.toLocaleString()}</span>
              )}
            </button>
          ))}
          {attacks.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-zinc-500">
              {feedState === 'live' ? 'Waiting for the next official attack event…' : 'Connecting to Check Point live feed…'}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            Check Point threat rankings
          </div>
          {statsError && <p role="alert" className="text-[10px] text-rose-300">{statsError}</p>}
          {topStats && (
            <div className="grid grid-cols-3 gap-2 text-[9px]">
              {[
                ['Countries', topStats.countries],
                ['Industries', topStats.industries],
                ['Threat types', topStats.malwareTypes],
              ].map(([label, items]) => (
                <div key={label as string} className="min-w-0">
                  <p className="mb-1 truncate text-zinc-500">{label as string}</p>
                  {(items as Array<{ id: string; fraction: number }> | undefined)?.slice(0, 3).map((item) => (
                    <p key={item.id} className="truncate py-0.5 text-zinc-300" title={item.id}>
                      {item.id} <span className="text-zinc-600">{Math.round(item.fraction * 100)}%</span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[9px] leading-relaxed text-zinc-600">
            Only provider-reported live fields are shown. Some location and event-time fields may not be supplied.
          </p>
        </div>
      </aside>
    </div>
  );
};

export default Globe3DMap;