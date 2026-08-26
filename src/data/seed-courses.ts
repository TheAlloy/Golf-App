import { Course } from '@/models/types';

/**
 * Starter course catalogue so the map is useful before any backend or
 * licensed course database is connected. Popularity values are rough
 * estimates (0–100) of how widely played each course is — famous venues
 * score high (fewer rarity points), hidden gems score low (more points).
 */
export const SEED_COURSES: Course[] = [
  // UK & Ireland
  { id: 'st-andrews-old', name: 'St Andrews (Old Course)', city: 'St Andrews', country: 'Scotland', coordinate: { latitude: 56.3433, longitude: -2.8025 }, par: 72, holes: 18, popularity: 95 },
  { id: 'carnoustie', name: 'Carnoustie Golf Links', city: 'Carnoustie', country: 'Scotland', coordinate: { latitude: 56.4934, longitude: -2.7178 }, par: 72, holes: 18, popularity: 78 },
  { id: 'muirfield', name: 'Muirfield', city: 'Gullane', country: 'Scotland', coordinate: { latitude: 56.0428, longitude: -2.8189 }, par: 71, holes: 18, popularity: 62 },
  { id: 'royal-troon', name: 'Royal Troon', city: 'Troon', country: 'Scotland', coordinate: { latitude: 55.5253, longitude: -4.6533 }, par: 71, holes: 18, popularity: 70 },
  { id: 'machrihanish-dunes', name: 'Machrihanish Dunes', city: 'Campbeltown', country: 'Scotland', coordinate: { latitude: 55.4527, longitude: -5.7108 }, par: 72, holes: 18, popularity: 18 },
  { id: 'askernish', name: 'Askernish Golf Club', city: 'South Uist', country: 'Scotland', coordinate: { latitude: 57.2028, longitude: -7.3921 }, par: 72, holes: 18, popularity: 6 },
  { id: 'royal-birkdale', name: 'Royal Birkdale', city: 'Southport', country: 'England', coordinate: { latitude: 53.6244, longitude: -3.0325 }, par: 70, holes: 18, popularity: 72 },
  { id: 'sunningdale-old', name: 'Sunningdale (Old)', city: 'Sunningdale', country: 'England', coordinate: { latitude: 51.3894, longitude: -0.6297 }, par: 70, holes: 18, popularity: 65 },
  { id: 'st-enodoc', name: 'St Enodoc (Church)', city: 'Rock', country: 'England', coordinate: { latitude: 50.5561, longitude: -4.9236 }, par: 69, holes: 18, popularity: 30 },
  { id: 'cleeve-hill', name: 'Cleeve Hill Golf Club', city: 'Cheltenham', country: 'England', coordinate: { latitude: 51.9264, longitude: -2.0089 }, par: 72, holes: 18, popularity: 12 },
  { id: 'royal-porthcawl', name: 'Royal Porthcawl', city: 'Porthcawl', country: 'Wales', coordinate: { latitude: 51.4894, longitude: -3.7261 }, par: 72, holes: 18, popularity: 40 },
  { id: 'royal-county-down', name: 'Royal County Down', city: 'Newcastle', country: 'Northern Ireland', coordinate: { latitude: 54.2158, longitude: -5.8869 }, par: 71, holes: 18, popularity: 68 },
  { id: 'ballybunion-old', name: 'Ballybunion (Old)', city: 'Ballybunion', country: 'Ireland', coordinate: { latitude: 52.5089, longitude: -9.6772 }, par: 71, holes: 18, popularity: 66 },
  { id: 'lahinch', name: 'Lahinch Golf Club', city: 'Lahinch', country: 'Ireland', coordinate: { latitude: 52.9367, longitude: -9.3489 }, par: 72, holes: 18, popularity: 55 },
  { id: 'carne', name: 'Carne Golf Links', city: 'Belmullet', country: 'Ireland', coordinate: { latitude: 54.2211, longitude: -10.0122 }, par: 72, holes: 18, popularity: 14 },

  // USA
  { id: 'pebble-beach', name: 'Pebble Beach Golf Links', city: 'Pebble Beach, CA', country: 'USA', coordinate: { latitude: 36.5674, longitude: -121.9500 }, par: 72, holes: 18, popularity: 92 },
  { id: 'torrey-pines-south', name: 'Torrey Pines (South)', city: 'La Jolla, CA', country: 'USA', coordinate: { latitude: 32.8933, longitude: -117.2530 }, par: 72, holes: 18, popularity: 80 },
  { id: 'bethpage-black', name: 'Bethpage Black', city: 'Farmingdale, NY', country: 'USA', coordinate: { latitude: 40.7415, longitude: -73.4570 }, par: 71, holes: 18, popularity: 76 },
  { id: 'pinehurst-2', name: 'Pinehurst No. 2', city: 'Pinehurst, NC', country: 'USA', coordinate: { latitude: 35.1893, longitude: -79.4703 }, par: 72, holes: 18, popularity: 74 },
  { id: 'chambers-bay', name: 'Chambers Bay', city: 'University Place, WA', country: 'USA', coordinate: { latitude: 47.1996, longitude: -122.5766 }, par: 72, holes: 18, popularity: 44 },
  { id: 'sweetens-cove', name: 'Sweetens Cove Golf Club', city: 'South Pittsburg, TN', country: 'USA', coordinate: { latitude: 35.0334, longitude: -85.7521 }, par: 36, holes: 9, popularity: 16 },

  // Rest of world
  { id: 'cape-kidnappers', name: 'Cape Kidnappers', city: "Hawke's Bay", country: 'New Zealand', coordinate: { latitude: -39.6444, longitude: 177.0736 }, par: 71, holes: 18, popularity: 34 },
  { id: 'barnbougle-dunes', name: 'Barnbougle Dunes', city: 'Bridport', country: 'Australia', coordinate: { latitude: -40.9975, longitude: 147.4523 }, par: 71, holes: 18, popularity: 26 },
  { id: 'royal-melbourne-west', name: 'Royal Melbourne (West)', city: 'Melbourne', country: 'Australia', coordinate: { latitude: -37.9702, longitude: 145.0290 }, par: 72, holes: 18, popularity: 58 },
  { id: 'valderrama', name: 'Real Club Valderrama', city: 'Sotogrande', country: 'Spain', coordinate: { latitude: 36.2828, longitude: -5.3164 }, par: 71, holes: 18, popularity: 52 },
  { id: 'fancourt-links', name: 'The Links at Fancourt', city: 'George', country: 'South Africa', coordinate: { latitude: -33.9583, longitude: 22.4181 }, par: 73, holes: 18, popularity: 28 },
];
