/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Live Country Webcams - Single File Application (Fixed Globe Size)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import countriesData from 'world-atlas/countries-110m.json';
import { 
  Globe, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  X, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

/* ==========================================================================
   1. TYPES & ALL 61 LIVE FEEDS
   ========================================================================== */

export interface LiveFeed {
  id: string;
  youtubeId: string;
  title: string;
  location: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  elevation: string;
  timezone: string;
  category: 'urban' | 'marine' | 'darksky' | 'polar' | 'alpine';
  description: string;
  signalQuality: number;
}

export type VisualFilter = 'normal' | 'nightvision' | 'thermal' | 'monochrome';

export interface GlobeSettings {
  autoRotate: boolean;
  rotationSpeed: number;
  showAtmosphere: boolean;
}

export const ALL_FEEDS: LiveFeed[] = [
  // --- Original Feeds ---
  {
    id: 'cam-01',
    youtubeId: 'DoUOrTJbIu4',
    title: 'Shibuya Crossing & Tokyo Metropolis',
    location: 'Tokyo',
    country: 'Japan',
    region: 'East Asia · Sector 07',
    lat: 35.6595,
    lng: 139.7005,
    elevation: '42m',
    timezone: 'Asia/Tokyo',
    category: 'urban',
    description: 'High-density urban pedestrian crossing & neon commercial district surveillance feed.',
    signalQuality: 5
  },
  {
    id: 'cam-02',
    youtubeId: 'J7ZrIDvqlic',
    title: 'Sydney Harbour & Opera House Vista',
    location: 'Sydney',
    country: 'Australia',
    region: 'Oceania · Sector 02',
    lat: -33.8568,
    lng: 151.2153,
    elevation: '15m',
    timezone: 'Australia/Sydney',
    category: 'marine',
    description: 'Deep harbour maritime navigation channel with iconic architectural vantage.',
    signalQuality: 5
  },
  {
    id: 'cam-03',
    youtubeId: 'xdR31xv7il0',
    title: 'Bondi Beach Coastal Surf Watch',
    location: 'Bondi, New South Wales',
    country: 'Australia',
    region: 'Oceania · Sector 02',
    lat: -33.8915,
    lng: 151.2767,
    elevation: '8m',
    timezone: 'Australia/Sydney',
    category: 'marine',
    description: 'South Pacific shoreline break, swell dynamics and coastal littoral observation.',
    signalQuality: 5
  },
  {
    id: 'cam-04',
    youtubeId: 'oibsohQ14cY',
    title: 'Melbourne CBD & Yarra River Corridor',
    location: 'Melbourne, Victoria',
    country: 'Australia',
    region: 'Oceania · Sector 02',
    lat: -37.8136,
    lng: 144.9631,
    elevation: '31m',
    timezone: 'Australia/Melbourne',
    category: 'urban',
    description: 'Metropolitan arterial transit line and central business skyline feed.',
    signalQuality: 4
  },
  {
    id: 'cam-05',
    youtubeId: 'gEbrHdFRgpQ',
    title: 'Brisbane River & Story Bridge Array',
    location: 'Brisbane, Queensland',
    country: 'Australia',
    region: 'Oceania · Sector 02',
    lat: -27.4698,
    lng: 153.0251,
    elevation: '28m',
    timezone: 'Australia/Brisbane',
    category: 'urban',
    description: 'Subtropical river bend traffic infrastructure and high-rise skyline monitoring.',
    signalQuality: 5
  },
  {
    id: 'cam-06',
    youtubeId: 'ydYDqZQpim8',
    title: 'Perth Western Coast & Indian Ocean',
    location: 'Perth, Western Australia',
    country: 'Australia',
    region: 'Oceania · Sector 02',
    lat: -31.9505,
    lng: 115.8605,
    elevation: '18m',
    timezone: 'Australia/Perth',
    category: 'marine',
    description: 'Indian Ocean maritime approach and Swan River littoral zone surveillance.',
    signalQuality: 4
  },
  {
    id: 'cam-07',
    youtubeId: 'EO_1LWqsCNE',
    title: 'Svalbard Arctic Deep Polar Station',
    location: 'Longyearbyen, Svalbard',
    country: 'Norway',
    region: 'High Arctic · Sector 09',
    lat: 78.2232,
    lng: 15.6267,
    elevation: '130m',
    timezone: 'Arctic/Longyearbyen',
    category: 'polar',
    description: 'High-latitude polar night observation base, permafrost tundra and aurora borealis detector.',
    signalQuality: 5
  },
  {
    id: 'cam-08',
    youtubeId: 'wVNt3l657X0',
    title: 'Reykjavik Volcano & Nocturnal Sky',
    location: 'Reykjanes Peninsula',
    country: 'Iceland',
    region: 'North Atlantic · Sector 04',
    lat: 63.8950,
    lng: -22.3550,
    elevation: '92m',
    timezone: 'Atlantic/Reykjavik',
    category: 'darksky',
    description: 'Geothermal rift zone, volcanic fissure nocturnal glow and dark atmospheric conditions.',
    signalQuality: 4
  },
  {
    id: 'cam-09',
    youtubeId: '1EiC9bvVGnk',
    title: 'Atacama Desert High Plateau Observatory',
    location: 'Antofagasta Region',
    country: 'Chile',
    region: 'South America · Sector 05',
    lat: -24.6272,
    lng: -70.4042,
    elevation: '2,635m',
    timezone: 'America/Santiago',
    category: 'darksky',
    description: 'Ultra-arid high-altitude astronomical plateau with pristine dark night sky transparency.',
    signalQuality: 5
  },
  {
    id: 'cam-10',
    youtubeId: '0Kaji9GHl68',
    title: 'Tromsø Fjord Northern Lights Watch',
    location: 'Tromsø',
    country: 'Norway',
    region: 'Scandinavian North · Sector 03',
    lat: 69.6492,
    lng: 18.9553,
    elevation: '45m',
    timezone: 'Europe/Oslo',
    category: 'polar',
    description: 'Fjord maritime gateway with active geomagnetic auroral oval coverage.',
    signalQuality: 5
  },
  {
    id: 'cam-11',
    youtubeId: '77akujLn4k8',
    title: 'Mauna Kea Stellar Horizon Array',
    location: 'Mauna Kea, Hawaii',
    country: 'United States',
    region: 'Central Pacific · Sector 01',
    lat: 19.8206,
    lng: -155.4681,
    elevation: '4,205m',
    timezone: 'Pacific/Honolulu',
    category: 'darksky',
    description: 'Summit above the inversion cloud deck monitoring celestial hemisphere dynamics.',
    signalQuality: 5
  },
  {
    id: 'cam-12',
    youtubeId: 'P5WnSGXJpkM',
    title: 'Namib Desert Dark Sky Wilderness',
    location: 'Sossusvlei, Namib-Naukluft',
    country: 'Namibia',
    region: 'Southern Africa · Sector 08',
    lat: -24.7570,
    lng: 15.2820,
    elevation: '580m',
    timezone: 'Africa/Windhoek',
    category: 'darksky',
    description: 'Hyper-arid sand sea dark sky reserve with zero light pollution perimeter.',
    signalQuality: 4
  },
  {
    id: 'cam-13',
    youtubeId: 'oI8R4_UG3Fs',
    title: 'Matterhorn Alpine Glacier Panorama',
    location: 'Zermatt, Valais',
    country: 'Switzerland',
    region: 'Central Alps · Sector 06',
    lat: 45.9765,
    lng: 7.7491,
    elevation: '3,883m',
    timezone: 'Europe/Zurich',
    category: 'alpine',
    description: 'Perennial alpine glacier, peak weather telemetry and high-mountain atmospheric feed.',
    signalQuality: 5
  },
  {
    id: 'cam-14',
    youtubeId: 'VsuSbXPN93o',
    title: 'Times Square Central Grid',
    location: 'Manhattan, New York',
    country: 'United States',
    region: 'North America · Sector 01',
    lat: 40.7580,
    lng: -73.9855,
    elevation: '16m',
    timezone: 'America/New_York',
    category: 'urban',
    description: 'High-density commercial canyon with 24/7 digital illumination and transit flow.',
    signalQuality: 5
  },
  {
    id: 'cam-15',
    youtubeId: 'sK8I9H2IUHc',
    title: 'Tower Bridge & River Thames Channel',
    location: 'London',
    country: 'United Kingdom',
    region: 'Western Europe · Sector 06',
    lat: 51.5055,
    lng: -0.0754,
    elevation: '12m',
    timezone: 'Europe/London',
    category: 'marine',
    description: 'Historic bascule bridge navigational channel and tidal river surveillance.',
    signalQuality: 5
  },
  {
    id: 'cam-16',
    youtubeId: '7E_HX7HUUEU',
    title: 'Dubai Marina & Persian Gulf Coast',
    location: 'Dubai',
    country: 'United Arab Emirates',
    region: 'Middle East · Sector 10',
    lat: 25.0772,
    lng: 55.1384,
    elevation: '11m',
    timezone: 'Asia/Dubai',
    category: 'urban',
    description: 'Artificial canal city, ultra-high-rise residential towers and coastal waters.',
    signalQuality: 5
  },
  {
    id: 'cam-17',
    youtubeId: 'zmv6NPLg91U',
    title: 'Grand Canal & Rialto Bridge Waterway',
    location: 'Venice',
    country: 'Italy',
    region: 'Mediterranean · Sector 06',
    lat: 45.4371,
    lng: 12.3326,
    elevation: '2m',
    timezone: 'Europe/Rome',
    category: 'marine',
    description: 'Venetian lagoon principal waterway, vaporetto traffic and historic waterfront facade.',
    signalQuality: 4
  },
  {
    id: 'cam-18',
    youtubeId: 'b3FEr9SfWpU',
    title: 'Teheran-ro Boulevard & Gangnam Tech Hub',
    location: 'Seoul',
    country: 'South Korea',
    region: 'East Asia · Sector 07',
    lat: 37.4979,
    lng: 127.0276,
    elevation: '38m',
    timezone: 'Asia/Seoul',
    category: 'urban',
    description: 'Primary technological corridor, autonomous vehicle lanes and transit arterial stream.',
    signalQuality: 5
  },

  // --- World City Cameras ---
  {
    id: 'cam-19',
    youtubeId: 'E6245ngeZj4',
    title: 'Shinjuku Skyscraper Skyline & Traffic',
    location: 'Shinjuku, Tokyo',
    country: 'Japan',
    region: 'East Asia · Sector 07',
    lat: 35.6895,
    lng: 139.6917,
    elevation: '45m',
    timezone: 'Asia/Tokyo',
    category: 'urban',
    description: 'Major transit terminal and high-density skyscraper arterial view.',
    signalQuality: 5
  },
  {
    id: 'cam-20',
    youtubeId: 'yhYNuFAzmLE',
    title: 'Las Vegas Strip & Resort Corridor',
    location: 'Las Vegas, Nevada',
    country: 'United States',
    region: 'North America · Sector 01',
    lat: 36.1147,
    lng: -115.1728,
    elevation: '610m',
    timezone: 'America/Los_Angeles',
    category: 'urban',
    description: 'Illuminated boulevard, pedestrian walkways and resort district.',
    signalQuality: 5
  },
  {
    id: 'cam-21',
    youtubeId: 'OdY-pbgl1Mk',
    title: 'Chicago Riverwalk & Michigan Avenue',
    location: 'Chicago, Illinois',
    country: 'United States',
    region: 'North America · Sector 01',
    lat: 41.8885,
    lng: -87.6256,
    elevation: '181m',
    timezone: 'America/Chicago',
    category: 'urban',
    description: 'Architectural river canyon, movable bridges and downtown transit.',
    signalQuality: 5
  },
  {
    id: 'cam-22',
    youtubeId: 'R8MRTG0pYdc',
    title: 'Miami South Beach & Ocean Drive Promenade',
    location: 'Miami Beach, Florida',
    country: 'United States',
    region: 'North America · Sector 01',
    lat: 25.7826,
    lng: -80.1340,
    elevation: '2m',
    timezone: 'America/New_York',
    category: 'marine',
    description: 'Atlantic coastal frontage, palm promenade and art deco corridor.',
    signalQuality: 5
  },
  {
    id: 'cam-23',
    youtubeId: '3o9aoRyrvAk',
    title: 'San Francisco Bay & Embarcadero Vista',
    location: 'San Francisco, California',
    country: 'United States',
    region: 'North America · Sector 01',
    lat: 37.7955,
    lng: -122.3937,
    elevation: '5m',
    timezone: 'America/Los_Angeles',
    category: 'marine',
    description: 'Bay bridge marine approach, ferry terminals and tidal currents.',
    signalQuality: 5
  },
  {
    id: 'cam-24',
    youtubeId: 'QIIVxUJzJQw',
    title: 'Toronto Harbourfront & CN Tower',
    location: 'Toronto, Ontario',
    country: 'Canada',
    region: 'North America · Sector 01',
    lat: 43.6426,
    lng: -79.3871,
    elevation: '76m',
    timezone: 'America/Toronto',
    category: 'urban',
    description: 'Lake Ontario shoreline, landmark observation tower and downtown skyline.',
    signalQuality: 5
  },
  {
    id: 'cam-25',
    youtubeId: '1T-V4jJIW1E',
    title: 'Paris Eiffel Tower & Champ de Mars',
    location: 'Paris',
    country: 'France',
    region: 'Western Europe · Sector 06',
    lat: 48.8584,
    lng: 2.2945,
    elevation: '35m',
    timezone: 'Europe/Paris',
    category: 'urban',
    description: 'Historic wrought-iron landmark, Seine river bend and Parisian avenues.',
    signalQuality: 5
  },
  {
    id: 'cam-26',
    youtubeId: 'fjr6-nPKfW0',
    title: 'Rome Colosseum & Imperial Fora Avenue',
    location: 'Rome',
    country: 'Italy',
    region: 'Mediterranean · Sector 06',
    lat: 41.8902,
    lng: 12.4922,
    elevation: '21m',
    timezone: 'Europe/Rome',
    category: 'urban',
    description: 'Ancient Flavian amphitheatre and archaeological avenue surveillance.',
    signalQuality: 5
  },
  {
    id: 'cam-27',
    youtubeId: 'AZWgPsla0C0',
    title: 'Berlin Brandenburg Gate & Pariser Platz',
    location: 'Berlin',
    country: 'Germany',
    region: 'Central Europe · Sector 06',
    lat: 52.5163,
    lng: 13.3777,
    elevation: '34m',
    timezone: 'Europe/Berlin',
    category: 'urban',
    description: 'Neoclassical monument, Unter den Linden boulevard and embassy square.',
    signalQuality: 5
  },
  {
    id: 'cam-28',
    youtubeId: '8lysODeBE_4',
    title: 'Amsterdam Dam Square & Royal Palace',
    location: 'Amsterdam',
    country: 'Netherlands',
    region: 'Western Europe · Sector 06',
    lat: 52.3731,
    lng: 4.8926,
    elevation: '1m',
    timezone: 'Europe/Amsterdam',
    category: 'urban',
    description: 'Historic central plaza, canal ring network and tram junction.',
    signalQuality: 5
  },
  {
    id: 'cam-29',
    youtubeId: 'BvaNtRp_2pM',
    title: 'Prague Old Town Square & Astronomical Clock',
    location: 'Prague',
    country: 'Czech Republic',
    region: 'Central Europe · Sector 06',
    lat: 50.0875,
    lng: 14.4213,
    elevation: '190m',
    timezone: 'Europe/Prague',
    category: 'urban',
    description: 'Gothic and baroque architectural square with pedestrian avenues.',
    signalQuality: 5
  },
  {
    id: 'cam-30',
    youtubeId: '8qv8k8yE95s',
    title: 'Barcelona Sagrada Família & Eixample Grid',
    location: 'Barcelona',
    country: 'Spain',
    region: 'Mediterranean · Sector 06',
    lat: 41.4036,
    lng: 2.1744,
    elevation: '32m',
    timezone: 'Europe/Madrid',
    category: 'urban',
    description: 'Basilica spires and iconic octagonal street block planning.',
    signalQuality: 5
  },
  {
    id: 'cam-31',
    youtubeId: 'DwKCna1mumk',
    title: "Vienna St. Stephen's Cathedral & Graben",
    location: 'Vienna',
    country: 'Austria',
    region: 'Central Europe · Sector 06',
    lat: 48.2085,
    lng: 16.3731,
    elevation: '171m',
    timezone: 'Europe/Vienna',
    category: 'urban',
    description: 'Historic city centre pedestrian spine and cathedral plaza.',
    signalQuality: 5
  },
  {
    id: 'cam-32',
    youtubeId: '6kX0K9u3NTQ',
    title: 'Istanbul Bosphorus Strait & Galata Bridge',
    location: 'Istanbul',
    country: 'Turkey',
    region: 'Eurasia Gateway · Sector 06',
    lat: 41.0256,
    lng: 28.9742,
    elevation: '15m',
    timezone: 'Europe/Istanbul',
    category: 'marine',
    description: 'Intercontinental waterway connecting Black Sea and Sea of Marmara.',
    signalQuality: 5
  },
  {
    id: 'cam-33',
    youtubeId: 'l-XLDB2Jh4Y',
    title: 'Singapore Marina Bay Sands & Promenade',
    location: 'Marina Bay',
    country: 'Singapore',
    region: 'Southeast Asia · Sector 07',
    lat: 1.2838,
    lng: 103.8591,
    elevation: '6m',
    timezone: 'Asia/Singapore',
    category: 'urban',
    description: 'Futuristic bay architecture, resort towers and maritime strait.',
    signalQuality: 5
  },
  {
    id: 'cam-34',
    youtubeId: 'HozfwlxzwnU',
    title: 'Hong Kong Victoria Harbour & Tsim Sha Tsui',
    location: 'Victoria Harbour',
    country: 'Hong Kong',
    region: 'East Asia · Sector 07',
    lat: 22.2988,
    lng: 114.1722,
    elevation: '8m',
    timezone: 'Asia/Hong_Kong',
    category: 'marine',
    description: 'World-renowned natural deepwater harbour and dense skyscraper skyline.',
    signalQuality: 5
  },
  {
    id: 'cam-35',
    youtubeId: 'lsLkrwlimbE',
    title: 'Bangkok Chao Phraya River & Wat Arun',
    location: 'Bangkok',
    country: 'Thailand',
    region: 'Southeast Asia · Sector 07',
    lat: 13.7437,
    lng: 100.4889,
    elevation: '4m',
    timezone: 'Asia/Bangkok',
    category: 'marine',
    description: 'River of Kings water ferry transit and historic riverside temple.',
    signalQuality: 5
  },
  {
    id: 'cam-36',
    youtubeId: '_nvG0c9keWI',
    title: 'Kuala Lumpur Petronas Towers & KLCC',
    location: 'Kuala Lumpur',
    country: 'Malaysia',
    region: 'Southeast Asia · Sector 07',
    lat: 3.1579,
    lng: 101.7116,
    elevation: '62m',
    timezone: 'Asia/Kuala_Lumpur',
    category: 'urban',
    description: 'Twin supertall towers and central park boulevard.',
    signalQuality: 5
  },
  {
    id: 'cam-37',
    youtubeId: '1rWzQP_ZYxc',
    title: 'Mumbai Marine Drive & Arabian Sea Arc',
    location: 'Mumbai',
    country: 'India',
    region: 'South Asia · Sector 08',
    lat: 18.9432,
    lng: 72.8231,
    elevation: '5m',
    timezone: 'Asia/Kolkata',
    category: 'marine',
    description: "Queen's Necklace promenade and western coastal highway.",
    signalQuality: 5
  },
  {
    id: 'cam-38',
    youtubeId: 'gM6vYZrTubo',
    title: 'New Delhi Connaught Place & Central Circle',
    location: 'New Delhi',
    country: 'India',
    region: 'South Asia · Sector 08',
    lat: 28.6315,
    lng: 77.2167,
    elevation: '216m',
    timezone: 'Asia/Kolkata',
    category: 'urban',
    description: 'Colonial Georgian radial commercial centre and transit interchange.',
    signalQuality: 5
  },
  {
    id: 'cam-39',
    youtubeId: 'irXHQTPI_tQ',
    title: 'Rio de Janeiro Copacabana & Atlantic Ocean',
    location: 'Rio de Janeiro',
    country: 'Brazil',
    region: 'South America · Sector 05',
    lat: -22.9711,
    lng: -43.1822,
    elevation: '3m',
    timezone: 'America/Sao_Paulo',
    category: 'marine',
    description: 'Crescent beach promenade and granite mountain ocean approach.',
    signalQuality: 5
  },
  {
    id: 'cam-40',
    youtubeId: 'MncLrf2LsT8',
    title: 'Buenos Aires Avenida 9 de Julio & Obelisco',
    location: 'Buenos Aires',
    country: 'Argentina',
    region: 'South America · Sector 05',
    lat: -34.6037,
    lng: -58.3816,
    elevation: '25m',
    timezone: 'America/Argentina/Buenos_Aires',
    category: 'urban',
    description: 'Widest avenue in the world and historic national monument plaza.',
    signalQuality: 5
  },
  {
    id: 'cam-41',
    youtubeId: 'ifJ3OlBGF7E',
    title: 'Cape Town Table Bay & Atlantic Seaboard',
    location: 'Cape Town',
    country: 'South Africa',
    region: 'Southern Africa · Sector 08',
    lat: -33.9036,
    lng: 18.4205,
    elevation: '12m',
    timezone: 'Africa/Johannesburg',
    category: 'marine',
    description: 'Table Mountain backdrop, waterfront harbour and ocean basin.',
    signalQuality: 5
  },
  {
    id: 'cam-42',
    youtubeId: 'D0zoMg6-XsQ',
    title: 'Cairo Nile Waterfront & Giza Plateau Horizon',
    location: 'Cairo',
    country: 'Egypt',
    region: 'North Africa · Sector 08',
    lat: 30.0444,
    lng: 31.2357,
    elevation: '23m',
    timezone: 'Africa/Cairo',
    category: 'urban',
    description: 'Nile river bridges, island districts and metropolitan traffic.',
    signalQuality: 5
  },
  {
    id: 'cam-43',
    youtubeId: '_9K8wSVX0I8',
    title: "Dublin River Liffey & O'Connell Bridge",
    location: 'Dublin',
    country: 'Ireland',
    region: 'Western Europe · Sector 06',
    lat: 53.3473,
    lng: -6.2592,
    elevation: '8m',
    timezone: 'Europe/Dublin',
    category: 'urban',
    description: 'River bridges, Georgian quaysides and central shopping district.',
    signalQuality: 5
  },
  {
    id: 'cam-44',
    youtubeId: 'd17IkvT4EkQ',
    title: 'Athens Acropolis & Plaka Old Quarter',
    location: 'Athens',
    country: 'Greece',
    region: 'Mediterranean · Sector 06',
    lat: 37.9715,
    lng: 23.7257,
    elevation: '150m',
    timezone: 'Europe/Athens',
    category: 'urban',
    description: 'Ancient citadel rock, Parthenon columns and historic city rooftops.',
    signalQuality: 5
  },
  {
    id: 'cam-45',
    youtubeId: 'Sgt05K7f9TA',
    title: 'Stockholm Gamla Stan & Royal Palace Canal',
    location: 'Stockholm',
    country: 'Sweden',
    region: 'Nordic Baltic · Sector 03',
    lat: 59.3251,
    lng: 18.0708,
    elevation: '14m',
    timezone: 'Europe/Stockholm',
    category: 'marine',
    description: 'Baltic archipelago waterway, historic island quarter and locks.',
    signalQuality: 5
  },
  {
    id: 'cam-46',
    youtubeId: 'FWvIPfxK5Jo',
    title: 'Helsinki South Harbour & Market Square',
    location: 'Helsinki',
    country: 'Finland',
    region: 'Nordic Baltic · Sector 03',
    lat: 60.1699,
    lng: 24.9525,
    elevation: '6m',
    timezone: 'Europe/Helsinki',
    category: 'marine',
    description: 'Gulf of Finland passenger ferries and historic neoclassical waterfront.',
    signalQuality: 5
  },
  {
    id: 'cam-47',
    youtubeId: '7-oD0lZA7JQ',
    title: 'Auckland Waitematā Harbour & Sky Tower',
    location: 'Auckland',
    country: 'New Zealand',
    region: 'Oceania · Sector 02',
    lat: -36.8485,
    lng: 174.7633,
    elevation: '12m',
    timezone: 'Pacific/Auckland',
    category: 'marine',
    description: 'City of Sails ferry terminal, harbour bridge and volcanic cones.',
    signalQuality: 5
  },

  // --- Philippines Feeds ---
  {
    id: 'cam-48',
    youtubeId: 'IONwBYLZ15E',
    title: 'Manila Bay & Roxas Boulevard Sunset',
    location: 'Manila',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 14.5764,
    lng: 120.9822,
    elevation: '5m',
    timezone: 'Asia/Manila',
    category: 'marine',
    description: 'Famous Manila Bay sunset promenade, coastal breakwater and shipping anchorage.',
    signalQuality: 5
  },
  {
    id: 'cam-49',
    youtubeId: 'fvOgXk09PFY',
    title: 'Makati Central Business District Skyline',
    location: 'Makati, Metro Manila',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 14.5547,
    lng: 121.0244,
    elevation: '18m',
    timezone: 'Asia/Manila',
    category: 'urban',
    description: 'Financial capital high-rise towers, Ayala Avenue arterial and transit grid.',
    signalQuality: 5
  },
  {
    id: 'cam-50',
    youtubeId: 'z8TKwI9Ntho',
    title: 'Bonifacio Global City (BGC) Taguig',
    location: 'BGC, Taguig',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 14.5492,
    lng: 121.0506,
    elevation: '25m',
    timezone: 'Asia/Manila',
    category: 'urban',
    description: 'Modern pedestrian avenues, commercial parks and corporate towers.',
    signalQuality: 5
  },
  {
    id: 'cam-51',
    youtubeId: 'xa_7z1bHsPM',
    title: 'Cebu City & CCLEX Expressway Bridge',
    location: 'Cebu City',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 10.2934,
    lng: 123.8966,
    elevation: '12m',
    timezone: 'Asia/Manila',
    category: 'marine',
    description: 'Iconic cable-stayed bridge spanning Mactan Channel and Cebu coastal road.',
    signalQuality: 5
  },
  {
    id: 'cam-52',
    youtubeId: 'eYAB0HX8NF8',
    title: 'Boracay White Beach Station 2',
    location: 'Boracay Island, Aklan',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 11.9617,
    lng: 121.9242,
    elevation: '3m',
    timezone: 'Asia/Manila',
    category: 'marine',
    description: 'Pristine white sand shoreline, turquoise lagoon waters and paraw sailboats.',
    signalQuality: 5
  },
  {
    id: 'cam-53',
    youtubeId: 'zgbPv6BkjgY',
    title: 'El Nido Bacuit Bay & Limestone Cliffs',
    location: 'El Nido, Palawan',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 11.1815,
    lng: 119.3908,
    elevation: '4m',
    timezone: 'Asia/Manila',
    category: 'marine',
    description: 'Karst limestone islands, pristine marine sanctuary and bancas boat traffic.',
    signalQuality: 5
  },
  {
    id: 'cam-54',
    youtubeId: 'QQBVEf6B2r0',
    title: 'Baguio City Session Road & Mountain Pines',
    location: 'Baguio City, Benguet',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 16.4023,
    lng: 120.5960,
    elevation: '1,470m',
    timezone: 'Asia/Manila',
    category: 'alpine',
    description: 'Summer Capital mountain highland climate, pine forests and city hills.',
    signalQuality: 5
  },
  {
    id: 'cam-55',
    youtubeId: 'oUTKwSBvBhI',
    title: 'Tagaytay Ridge & Taal Lake Crater View',
    location: 'Tagaytay, Cavite',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 14.0956,
    lng: 120.9328,
    elevation: '640m',
    timezone: 'Asia/Manila',
    category: 'alpine',
    description: 'Scenic volcanic caldera lookout, lake mist and ridge panorama.',
    signalQuality: 5
  },
  {
    id: 'cam-56',
    youtubeId: '2iENQ0dDmqI',
    title: 'Davao City Coastal Road & Gulf Promenade',
    location: 'Davao City, Mindanao',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 7.0736,
    lng: 125.6110,
    elevation: '8m',
    timezone: 'Asia/Manila',
    category: 'marine',
    description: 'Southern commercial metropolis, Davao Gulf waters and coastal expressway.',
    signalQuality: 5
  },
  {
    id: 'cam-57',
    youtubeId: 'yznpQlk0exE',
    title: 'Siargao Island Cloud 9 Boardwalk Surf',
    location: 'General Luna, Siargao',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 9.8009,
    lng: 126.1642,
    elevation: '2m',
    timezone: 'Asia/Manila',
    category: 'marine',
    description: 'Pacific ocean reef break, wooden pier boardwalk and surf swell.',
    signalQuality: 5
  },
  {
    id: 'cam-58',
    youtubeId: 'GCoBhf_Hd-o',
    title: 'Panglao Island & Alona Beach Coast',
    location: 'Panglao, Bohol',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 9.5510,
    lng: 123.7733,
    elevation: '4m',
    timezone: 'Asia/Manila',
    category: 'marine',
    description: 'Coral sand fringe, diving dive boats and tropical coastal reef.',
    signalQuality: 5
  },
  {
    id: 'cam-59',
    youtubeId: '8ALC939509U',
    title: 'Subic Bay Freeport Waterfront Zone',
    location: 'Subic Bay, Zambales',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 14.8219,
    lng: 120.2785,
    elevation: '6m',
    timezone: 'Asia/Manila',
    category: 'marine',
    description: 'Deepwater maritime port, naval anchorage and mountain perimeter.',
    signalQuality: 5
  },
  {
    id: 'cam-60',
    youtubeId: 'Q7JY7sgxI7o',
    title: 'Iloilo City Esplanade & River Walkway',
    location: 'Iloilo City, Panay',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 10.7063,
    lng: 122.5644,
    elevation: '5m',
    timezone: 'Asia/Manila',
    category: 'urban',
    description: 'Award-winning linear river park, mangrove banks and pedestrian bridges.',
    signalQuality: 5
  },
  {
    id: 'cam-61',
    youtubeId: 'LlMhf0Vdf_Q',
    title: 'Clark Freeport & Mount Pinatubo Vista',
    location: 'Angeles & Clark, Pampanga',
    country: 'Philippines',
    region: 'Southeast Asia · Philippines',
    lat: 15.1450,
    lng: 120.5887,
    elevation: '145m',
    timezone: 'Asia/Manila',
    category: 'urban',
    description: 'Aviation gateway hub, Central Luzon plains and volcanic mountain silhouette.',
    signalQuality: 5
  }
];

/* ==========================================================================
   2. TEXTURE & GEOMETRY (PITCH BLACK OCEAN + VIBRANT NATIONS)
   ========================================================================== */

export function latLngToCanvasXY(lat: number, lng: number, width: number, height: number): [number, number] {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

const COUNTRY_PALETTE = [
  '#f5b041', '#00a8ff', '#9c27b0', '#2ecc71', '#e84393', '#1abc9c',
  '#f39c12', '#3498db', '#8e44ad', '#27ae60', '#fa8231', '#45aaf2',
  '#eb3b5a', '#2bcbba', '#fed330', '#a55eea'
];

function getCountryColor(id: string | number | undefined, index: number): string {
  if (typeof id === 'number') {
    return COUNTRY_PALETTE[(id * 7 + 3) % COUNTRY_PALETTE.length];
  }
  if (typeof id === 'string') {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    return COUNTRY_PALETTE[Math.abs(hash) % COUNTRY_PALETTE.length];
  }
  return COUNTRY_PALETTE[index % COUNTRY_PALETTE.length];
}

export function createPoliticalWorldTexture(): THREE.CanvasTexture {
  const width = 4096;
  const height = 2048;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Pitch Black Ocean (#000000)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const topology = countriesData as unknown as { objects: { countries: unknown } };
  const geojson = feature(topology as never, topology.objects.countries as never) as unknown as {
    features: Array<{
      id?: string | number;
      properties?: Record<string, unknown>;
      geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: number[][][] | number[][][][];
      };
    }>;
  };

  const drawRing = (ring: number[][]) => {
    if (!ring || ring.length < 3) return;
    for (let i = 0; i < ring.length; i++) {
      const [lng, lat] = ring[i];
      const [x, y] = latLngToCanvasXY(lat, lng, width, height);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevLng = ring[i - 1][0];
        if (Math.abs(lng - prevLng) > 180) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
  };

  if (geojson && geojson.features) {
    geojson.features.forEach((country, index) => {
      const color = getCountryColor(country.id, index);
      const geom = country.geometry;
      if (!geom) return;

      ctx.fillStyle = color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.0;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      if (geom.type === 'Polygon') {
        const rings = geom.coordinates as number[][][];
        ctx.beginPath();
        rings.forEach((ring) => drawRing(ring));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (geom.type === 'MultiPolygon') {
        const multiRings = geom.coordinates as number[][][][];
        multiRings.forEach((polygonRings) => {
          ctx.beginPath();
          polygonRings.forEach((ring) => drawRing(ring));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ==========================================================================
   3. LIVE STREAM MONITOR (CUSTOM BORDER, NO YOUTUBE UI, FULLSCREEN)
   ========================================================================== */

interface LiveFeedPlayerProps {
  feed: LiveFeed | null;
  onClose: () => void;
  onSelectFeed: (feed: LiveFeed) => void;
  allFeeds: LiveFeed[];
}

const LiveFeedPlayer: React.FC<LiveFeedPlayerProps> = ({
  feed,
  onClose,
  onSelectFeed,
  allFeeds
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filter, setFilter] = useState<VisualFilter>('normal');
  const [utcTime, setUtcTime] = useState('');
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
      if (feed) {
        try {
          const lTime = new Intl.DateTimeFormat('en-GB', {
            timeZone: feed.timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).format(now);
          setLocalTime(lTime + ' LOC');
        } catch {
          setLocalTime(now.toTimeString().slice(0, 8) + ' LOC');
        }
      }
    };
    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [feed]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!feed) return null;

  const currentIndex = allFeeds.findIndex(f => f.id === feed.id);
  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + allFeeds.length) % allFeeds.length;
    onSelectFeed(allFeeds[nextIdx]);
  };
  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % allFeeds.length;
    onSelectFeed(allFeeds[nextIdx]);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err);
    }
  };

  const getFilterStyle = (): React.CSSProperties => {
    switch (filter) {
      case 'nightvision':
        return { filter: 'sepia(100%) hue-rotate(85deg) saturate(2.4) brightness(1.15) contrast(1.3)' };
      case 'thermal':
        return { filter: 'contrast(1.9) saturate(2.2) hue-rotate(185deg) invert(10%)' };
      case 'monochrome':
        return { filter: 'grayscale(100%) contrast(1.4) brightness(0.95)' };
      default:
        return { filter: 'contrast(1.08) saturate(1.05)' };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`
        ${isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-black flex flex-col p-4'
          : 'absolute bottom-4 right-4 z-40 flex w-[92%] flex-col sm:w-[min(48%,520px)]'
        }
        transition-all duration-300 ease-out select-none
      `}
    >
      <div className="relative flex max-h-full flex-col w-full h-full bg-[#02050f]/95 border-2 border-cyan-500/80 shadow-[0_0_35px_rgba(6,182,212,0.3)] rounded-lg overflow-hidden backdrop-blur-md">
        
        {/* Tactical Corner Brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 z-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 z-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 z-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 z-30 pointer-events-none" />

        {/* Top Bar (Covers YouTube title bar) */}
        <div className="relative z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-[#020617] via-[#051125] to-[#040d1e] border-b border-cyan-500/40 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/80 border border-red-500/60 text-red-400 font-semibold tracking-wider text-[10px] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
              LIVE · REC
            </span>
            <span className="text-cyan-300 font-bold uppercase tracking-wider text-[11px] truncate max-w-[150px] sm:max-w-[220px]">
              {feed.location}
            </span>
            <span className="hidden sm:inline-block text-slate-400 text-[10px]">
              · {feed.country}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-cyan-500/30 rounded bg-slate-900/60">
              <button
                onClick={handlePrev}
                title="Previous Live Feed"
                className="p-1 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNext}
                title="Next Live Feed"
                className="p-1 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dedicated Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>WINDOW</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>FULLSCREEN</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              title="Close Feed"
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-700 hover:border-red-500/40 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Chassis: 132% scale and -16% offset to hide all YouTube UI */}
        <div className="relative flex-1 w-full bg-black overflow-hidden group min-h-[180px] sm:min-h-[290px]">
          <div
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={getFilterStyle()}
          >
            <iframe
              key={feed.id}
              src={`https://www.youtube-nocookie.com/embed/${feed.youtubeId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1&playsinline=1&fs=0&loop=1&playlist=${feed.youtubeId}`}
              title={feed.title}
              className="absolute top-[-16%] left-[-16%] w-[132%] h-[132%] border-0 pointer-events-none select-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={false}
            />
          </div>

          <div className="absolute bottom-3 left-3 z-20 pointer-events-none text-[10px] font-mono text-cyan-300/90 bg-black/70 px-2 py-1 rounded border border-cyan-500/30 backdrop-blur-xs flex items-center gap-2">
            <span>{utcTime}</span>
            <span className="text-cyan-500">|</span>
            <span>{localTime}</span>
            <span className="text-cyan-500">|</span>
            <span className="text-emerald-400">ELEV {feed.elevation}</span>
          </div>
        </div>

        {/* Bottom Bar (Covers YouTube bottom controls) */}
        <div className="relative z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-[#020617] via-[#051125] to-[#040d1e] border-t border-cyan-500/40 text-xs font-mono">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">OPTICS:</span>
            {(['normal', 'nightvision', 'thermal', 'monochrome'] as VisualFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-2 py-0.5 text-[10px] uppercase font-mono rounded transition-colors cursor-pointer
                  ${filter === f
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                    : 'text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-cyan-500/20'
                  }
                `}
              >
                {f === 'nightvision' ? 'NIGHT' : f === 'monochrome' ? 'B&W' : f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-[10px] text-cyan-400/80 font-mono hidden sm:block">
              {feed.lat > 0 ? `${feed.lat.toFixed(2)}°N` : `${Math.abs(feed.lat).toFixed(2)}°S`}, {' '}
              {feed.lng > 0 ? `${feed.lng.toFixed(2)}°E` : `${Math.abs(feed.lng).toFixed(2)}°W`}
            </div>

            <div className="flex items-center gap-0.5 px-1 py-1 rounded bg-slate-900/80 border border-slate-700" title={`Signal: ${feed.signalQuality}/5`}>
              {[1, 2, 3, 4, 5].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 rounded-xs ${
                    bar <= feed.signalQuality
                      ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]'
                      : 'bg-slate-700'
                  }`}
                  style={{ height: `${bar * 2.5 + 4}px` }}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ==========================================================================
   4. HUD HEADER (ONLY 'LIVE COUNTRY WEBCAMS')
   ========================================================================== */

interface GlobeHUDProps {
  selectedFeed: LiveFeed | null;
  settings: GlobeSettings;
  onUpdateSettings: (settings: Partial<GlobeSettings>) => void;
  feedCount: number;
}

const GlobeHUD: React.FC<GlobeHUDProps> = ({
  selectedFeed,
  settings,
  onUpdateSettings,
  feedCount
}) => {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono z-20">
      
      {/* Top Header */}
      <header className="absolute top-0 inset-x-0 p-3 sm:p-4 flex items-center justify-between gap-3 bg-gradient-to-b from-[#01040d]/80 via-[#01040d]/40 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-cyan-950/70 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Globe className="w-4 h-4 text-cyan-400" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white tracking-widest uppercase">
                LIVE COUNTRY WEBCAMS
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{feedCount} GLOBAL BEACONS</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{utcTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Subtle Auto Rotate Control */}
      <footer className="absolute bottom-3 sm:bottom-4 left-3 sm:left-6 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center p-1 bg-[#020715]/80 border border-cyan-500/30 rounded-lg shadow-xl backdrop-blur-md text-xs">
          <button
            onClick={() => onUpdateSettings({ autoRotate: !settings.autoRotate })}
            title={settings.autoRotate ? "Pause Auto-Rotation" : "Enable Auto-Rotation"}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer
              ${settings.autoRotate
                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }
            `}
          >
            <RotateCw className={`w-3.5 h-3.5 ${settings.autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }} />
            <span className="text-[11px] hidden sm:inline">ROTATE</span>
          </button>
        </div>

        {selectedFeed && (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#020715]/80 border border-emerald-500/40 rounded-lg text-xs shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400 text-[10px] uppercase">TARGET:</span>
            <span className="text-emerald-300 font-bold uppercase text-[11px] truncate max-w-[140px] sm:max-w-[220px]">
              {selectedFeed.location}
            </span>
          </div>
        )}
      </footer>

    </div>
  );
};

/* ==========================================================================
   5. 3D GLOBE MAP (COMPLETELY FIXED SIZE - NO UNWANTED ZOOM)
   ========================================================================== */

interface MarkerMeshGroup extends THREE.Group {
  feedData: LiveFeed;
  pulseRings: THREE.Mesh[];
  coreMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
}

// Permanent fixed camera distance (ensures globe size stays fixed)
const FIXED_CAMERA_DISTANCE = 275;
const FIXED_CAMERA_Y = 20;

interface GlobeMapProps {
  feeds: LiveFeed[];
  selectedFeed: LiveFeed | null;
  onSelectFeed: (feed: LiveFeed) => void;
  settings: GlobeSettings;
}

const GlobeMap: React.FC<GlobeMapProps> = ({
  feeds,
  selectedFeed,
  onSelectFeed,
  settings
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereRef = useRef<THREE.Mesh | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [hoveredFeed, setHoveredFeed] = useState<LiveFeed | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isDraggingRef = useRef(false);
  const previousMousePosRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const globeRadius = 100;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Fixed camera distance prevents globe from growing or shrinking
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2500);
    camera.position.set(0, FIXED_CAMERA_Y, FIXED_CAMERA_DISTANCE);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(220, 120, 260);
    scene.add(sunLight);

    const softFillLight = new THREE.DirectionalLight(0x00d2ff, 0.4);
    softFillLight.position.set(-200, -50, -150);
    scene.add(softFillLight);

    // Subtle Starfield
    const starCount = 1200;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 650 + Math.random() * 450;

      const sinPhi = Math.sin(phi);
      starPositions[i * 3] = r * sinPhi * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * sinPhi * Math.sin(theta);

      const c = Math.random();
      if (c > 0.8) {
        starColors[i * 3] = 0.3; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 1.0;
      } else {
        starColors[i * 3] = 0.75; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 0.95;
      }
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMaterial = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // Political World Mesh
    const earthGeometry = new THREE.SphereGeometry(globeRadius, 64, 64);
    const earthTexture = createPoliticalWorldTexture();

    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.85,
      metalness: 0.05
    });

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.rotation.y = 0.35;
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // Glowing Atmospheric Halo
    const atmosphereGeometry = new THREE.SphereGeometry(globeRadius * 1.028, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float intensity = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.2);
          vec3 atmosphereColor = vec3(0.0, 0.72, 1.0);
          gl_FragColor = vec4(atmosphereColor, intensity * 0.95);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);
    atmosphereRef.current = atmosphereMesh;

    // Markers Group
    const markersGroup = new THREE.Group();
    earthMesh.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // Animation loop (Maintains fixed globe size)
    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Lock camera to fixed coordinates (prevents expansion)
      if (cameraRef.current) {
        cameraRef.current.position.set(0, FIXED_CAMERA_Y, FIXED_CAMERA_DISTANCE);
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Smooth globe rotation without zoom
      if (targetRotationRef.current && earthMeshRef.current && !isDraggingRef.current) {
        let diffY = targetRotationRef.current.y - earthMeshRef.current.rotation.y;
        diffY = Math.atan2(Math.sin(diffY), Math.cos(diffY));

        earthMeshRef.current.rotation.y += diffY * 0.05;
        earthMeshRef.current.rotation.x += (targetRotationRef.current.x - earthMeshRef.current.rotation.x) * 0.05;

        if (Math.abs(diffY) < 0.003 && Math.abs(targetRotationRef.current.x - earthMeshRef.current.rotation.x) < 0.003) {
          targetRotationRef.current = null;
        }
      } else if (earthMeshRef.current && settings.autoRotate && !isDraggingRef.current) {
        earthMeshRef.current.rotation.y += settings.rotationSpeed * delta * 0.06;
      }

      // Pulse markers
      if (markersGroupRef.current) {
        const pulseTime = currentTime * 0.002;
        markersGroupRef.current.children.forEach((child) => {
          const group = child as MarkerMeshGroup;
          if (group.pulseRings) {
            group.pulseRings.forEach((ring, idx) => {
              const cycle = (pulseTime + idx * 0.5) % 1;
              const scale = 0.4 + cycle * 2.8;
              ring.scale.set(scale, scale, scale);
              (ring.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.75;
            });
          }
        });
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Populate Markers
  useEffect(() => {
    const markersGroup = markersGroupRef.current;
    if (!markersGroup) return;

    while (markersGroup.children.length > 0) {
      const child = markersGroup.children[0];
      markersGroup.remove(child);
    }

    feeds.forEach((feed) => {
      const isSelected = selectedFeed?.id === feed.id;
      const markerGroup = new THREE.Group() as MarkerMeshGroup;
      markerGroup.feedData = feed;
      markerGroup.pulseRings = [];

      const surfacePos = latLngToVector3(feed.lat, feed.lng, globeRadius);
      const normal = surfacePos.clone().normalize();
      markerGroup.position.copy(surfacePos);

      const up = new THREE.Vector3(0, 1, 0);
      markerGroup.quaternion.setFromUnitVectors(up, normal);

      const color = isSelected ? 0x00f0ff : 0xffffff;

      const baseRingGeo = new THREE.RingGeometry(0.8, 1.4, 16);
      const baseRingMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.7
      });
      const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
      baseRing.rotation.x = Math.PI / 2;
      markerGroup.add(baseRing);

      const pulseGeo = new THREE.RingGeometry(0.6, 1.2, 16);
      for (let r = 0; r < 2; r++) {
        const pulseMat = new THREE.MeshBasicMaterial({
          color: isSelected ? 0x00f0ff : 0x00e5ff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7
        });
        const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
        pulseMesh.rotation.x = Math.PI / 2;
        markerGroup.pulseRings.push(pulseMesh);
        markerGroup.add(pulseMesh);
      }

      const beamHeight = isSelected ? 12 : 7;
      const beamGeo = new THREE.CylinderGeometry(0.2, 0.4, beamHeight, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x00f0ff : 0xffffff,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.65
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.y = beamHeight / 2;
      markerGroup.beamMesh = beamMesh;
      markerGroup.add(beamMesh);

      const coreGeo = new THREE.SphereGeometry(isSelected ? 1.6 : 1.1, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x00f0ff : 0xffffff
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = beamHeight;
      markerGroup.coreMesh = coreMesh;
      markerGroup.add(coreMesh);

      const hitGeo = new THREE.SphereGeometry(4.5, 8, 8);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = beamHeight / 2;
      hitMesh.userData = { isMarkerHit: true, feed };
      markerGroup.add(hitMesh);

      markersGroup.add(markerGroup);
    });
  }, [feeds, selectedFeed]);

  // Rotate globe smoothly to face feed without changing camera distance
  const focusOnFeed = useCallback((feed: LiveFeed) => {
    const targetY = -((feed.lng * Math.PI) / 180) - Math.PI / 2;
    const targetX = Math.max(-0.5, Math.min(0.5, (feed.lat * Math.PI) / 180 * 0.5));
    targetRotationRef.current = { x: targetX, y: targetY };
  }, []);

  useEffect(() => {
    if (selectedFeed) {
      focusOnFeed(selectedFeed);
    }
  }, [selectedFeed, focusOnFeed]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    targetRotationRef.current = null;
    previousMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    const earthMesh = earthMeshRef.current;
    if (!container || !camera || !scene || !earthMesh) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - previousMousePosRef.current.x;
      const deltaY = e.clientY - previousMousePosRef.current.y;
      previousMousePosRef.current = { x: e.clientX, y: e.clientY };

      earthMesh.rotation.y += deltaX * 0.005;
      earthMesh.rotation.x = Math.max(-0.75, Math.min(0.75, earthMesh.rotation.x + deltaY * 0.005));
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    const markerIntersects = raycaster.intersectObjects(markersGroupRef.current?.children || [], true);
    let hitFound = false;

    for (const hit of markerIntersects) {
      if (hit.object.userData && hit.object.userData.isMarkerHit) {
        const feed = hit.object.userData.feed as LiveFeed;
        setHoveredFeed(feed);
        setTooltipPos({ x: e.clientX, y: e.clientY });
        container.style.cursor = 'pointer';
        hitFound = true;
        break;
      }
    }

    if (!hitFound) {
      setHoveredFeed(null);
      container.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container || !camera || !markersGroupRef.current) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    const markerIntersects = raycaster.intersectObjects(markersGroupRef.current.children, true);
    for (const hit of markerIntersects) {
      if (hit.object.userData && hit.object.userData.isMarkerHit) {
        const feed = hit.object.userData.feed as LiveFeed;
        onSelectFeed(feed);
        break;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      className="absolute inset-0 w-full h-full cursor-grab select-none overflow-hidden touch-none"
    >
      {hoveredFeed && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y - 12}px` }}
        >
          <div className="bg-[#020617]/95 border border-cyan-400/80 px-3 py-2 rounded shadow-[0_0_20px_rgba(6,182,212,0.4)] backdrop-blur-md text-xs font-mono">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-cyan-300 uppercase tracking-wider">{hoveredFeed.location}</span>
            </div>
            <div className="text-[11px] text-slate-300">{hoveredFeed.title}</div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 border-t border-cyan-500/20 pt-1">
              <span>{hoveredFeed.lat > 0 ? `${hoveredFeed.lat.toFixed(2)}°N` : `${Math.abs(hoveredFeed.lat).toFixed(2)}°S`}</span>
              <span>{hoveredFeed.lng > 0 ? `${hoveredFeed.lng.toFixed(2)}°E` : `${Math.abs(hoveredFeed.lng).toFixed(2)}°W`}</span>
              <span className="text-cyan-400">CLICK TO VIEW</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   6. MAIN APPLICATION COMPONENT (DEFAULT EXPORT)
   ========================================================================== */

export default function App() {
  const [feeds] = useState<LiveFeed[]>(ALL_FEEDS);
  const [selectedFeed, setSelectedFeed] = useState<LiveFeed | null>(ALL_FEEDS[0]);

  const [globeSettings, setGlobeSettings] = useState<GlobeSettings>({
    autoRotate: true,
    rotationSpeed: 1.0,
    showAtmosphere: true
  });

  const handleUpdateSettings = (newSettings: Partial<GlobeSettings>) => {
    setGlobeSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <main className="relative isolate h-full min-h-[420px] w-full overflow-hidden bg-black text-slate-100 font-sans select-none">
      {/* 3D Dark Globe Canvas (Fixed Size) */}
      <GlobeMap
        feeds={feeds}
        selectedFeed={selectedFeed}
        onSelectFeed={(feed) => setSelectedFeed(feed)}
        settings={globeSettings}
      />

      {/* Header HUD (Only 'LIVE COUNTRY WEBCAMS') */}
      <GlobeHUD
        selectedFeed={selectedFeed}
        settings={globeSettings}
        onUpdateSettings={handleUpdateSettings}
        feedCount={feeds.length}
      />

      {/* Live Stream Monitor */}
      <LiveFeedPlayer
        feed={selectedFeed}
        onClose={() => setSelectedFeed(null)}
        onSelectFeed={(feed) => setSelectedFeed(feed)}
        allFeeds={feeds}
      />
    </main>
  );
}