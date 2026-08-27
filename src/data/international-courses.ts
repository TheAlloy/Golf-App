import { Continent } from '@/models/types';

/**
 * Curated set of notable courses outside the US, to sit alongside the bundled
 * US dataset until an international open dataset is available (the ones that
 * exist today — OpenGolfAPI, GeoJSON-GolfCourses — are North America only).
 * See docs/course-data-providers.md.
 */
export type IntlCourse = {
  id: string;
  name: string;
  city: string;
  country: string;
  continent: Continent;
  latitude: number;
  longitude: number;
  par: number;
  holes: number;
  type: string;
};

export const INTERNATIONAL_COURSES: IntlCourse[] = [
  // Scotland
  { id: 'intl-st-andrews-old', name: 'St Andrews (Old Course)', city: 'St Andrews', country: 'Scotland', continent: 'Europe', latitude: 56.3433, longitude: -2.8025, par: 72, holes: 18, type: 'Public' },
  { id: 'intl-carnoustie', name: 'Carnoustie Golf Links', city: 'Carnoustie', country: 'Scotland', continent: 'Europe', latitude: 56.4934, longitude: -2.7178, par: 72, holes: 18, type: 'Public' },
  { id: 'intl-muirfield', name: 'Muirfield', city: 'Gullane', country: 'Scotland', continent: 'Europe', latitude: 56.0428, longitude: -2.8189, par: 71, holes: 18, type: 'Private' },
  { id: 'intl-royal-troon', name: 'Royal Troon', city: 'Troon', country: 'Scotland', continent: 'Europe', latitude: 55.5253, longitude: -4.6533, par: 71, holes: 18, type: 'Private' },
  { id: 'intl-turnberry', name: 'Trump Turnberry (Ailsa)', city: 'Turnberry', country: 'Scotland', continent: 'Europe', latitude: 55.3122, longitude: -4.8375, par: 71, holes: 18, type: 'Resort' },
  { id: 'intl-north-berwick', name: 'North Berwick (West Links)', city: 'North Berwick', country: 'Scotland', continent: 'Europe', latitude: 56.0578, longitude: -2.7292, par: 71, holes: 18, type: 'Semi-Private' },
  { id: 'intl-machrihanish-dunes', name: 'Machrihanish Dunes', city: 'Campbeltown', country: 'Scotland', continent: 'Europe', latitude: 55.4527, longitude: -5.7108, par: 72, holes: 18, type: 'Resort' },
  { id: 'intl-askernish', name: 'Askernish Golf Club', city: 'South Uist', country: 'Scotland', continent: 'Europe', latitude: 57.2028, longitude: -7.3921, par: 72, holes: 18, type: 'Semi-Private' },
  { id: 'intl-cruden-bay', name: 'Cruden Bay Golf Club', city: 'Cruden Bay', country: 'Scotland', continent: 'Europe', latitude: 57.4139, longitude: -1.8564, par: 70, holes: 18, type: 'Semi-Private' },
  { id: 'intl-kingsbarns', name: 'Kingsbarns Golf Links', city: 'St Andrews', country: 'Scotland', continent: 'Europe', latitude: 56.2925, longitude: -2.6647, par: 72, holes: 18, type: 'Resort' },

  // England
  { id: 'intl-royal-birkdale', name: 'Royal Birkdale', city: 'Southport', country: 'England', continent: 'Europe', latitude: 53.6244, longitude: -3.0325, par: 70, holes: 18, type: 'Private' },
  { id: 'intl-sunningdale-old', name: 'Sunningdale (Old)', city: 'Sunningdale', country: 'England', continent: 'Europe', latitude: 51.3894, longitude: -0.6297, par: 70, holes: 18, type: 'Private' },
  { id: 'intl-st-enodoc', name: 'St Enodoc (Church)', city: 'Rock', country: 'England', continent: 'Europe', latitude: 50.5561, longitude: -4.9236, par: 69, holes: 18, type: 'Semi-Private' },
  { id: 'intl-royal-st-georges', name: "Royal St George's", city: 'Sandwich', country: 'England', continent: 'Europe', latitude: 51.2789, longitude: 1.3706, par: 70, holes: 18, type: 'Private' },
  { id: 'intl-royal-lytham', name: 'Royal Lytham & St Annes', city: 'Lytham St Annes', country: 'England', continent: 'Europe', latitude: 53.7442, longitude: -3.0244, par: 70, holes: 18, type: 'Private' },
  { id: 'intl-wentworth-west', name: 'Wentworth (West)', city: 'Virginia Water', country: 'England', continent: 'Europe', latitude: 51.4008, longitude: -0.5947, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-cleeve-hill', name: 'Cleeve Hill Golf Club', city: 'Cheltenham', country: 'England', continent: 'Europe', latitude: 51.9264, longitude: -2.0089, par: 72, holes: 18, type: 'Municipal' },

  // Wales & Northern Ireland
  { id: 'intl-royal-porthcawl', name: 'Royal Porthcawl', city: 'Porthcawl', country: 'Wales', continent: 'Europe', latitude: 51.4894, longitude: -3.7261, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-celtic-manor', name: 'Celtic Manor (2010)', city: 'Newport', country: 'Wales', continent: 'Europe', latitude: 51.5942, longitude: -2.9256, par: 71, holes: 18, type: 'Resort' },
  { id: 'intl-royal-county-down', name: 'Royal County Down', city: 'Newcastle', country: 'Northern Ireland', continent: 'Europe', latitude: 54.2158, longitude: -5.8869, par: 71, holes: 18, type: 'Private' },
  { id: 'intl-royal-portrush', name: 'Royal Portrush (Dunluce)', city: 'Portrush', country: 'Northern Ireland', continent: 'Europe', latitude: 55.2044, longitude: -6.6408, par: 72, holes: 18, type: 'Private' },

  // Ireland
  { id: 'intl-ballybunion-old', name: 'Ballybunion (Old)', city: 'Ballybunion', country: 'Ireland', continent: 'Europe', latitude: 52.5089, longitude: -9.6772, par: 71, holes: 18, type: 'Semi-Private' },
  { id: 'intl-lahinch', name: 'Lahinch Golf Club', city: 'Lahinch', country: 'Ireland', continent: 'Europe', latitude: 52.9367, longitude: -9.3489, par: 72, holes: 18, type: 'Semi-Private' },
  { id: 'intl-carne', name: 'Carne Golf Links', city: 'Belmullet', country: 'Ireland', continent: 'Europe', latitude: 54.2211, longitude: -10.0122, par: 72, holes: 18, type: 'Semi-Private' },
  { id: 'intl-portmarnock', name: 'Portmarnock Golf Club', city: 'Portmarnock', country: 'Ireland', continent: 'Europe', latitude: 53.4239, longitude: -6.1275, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-old-head', name: 'Old Head Golf Links', city: 'Kinsale', country: 'Ireland', continent: 'Europe', latitude: 51.6058, longitude: -8.5322, par: 72, holes: 18, type: 'Resort' },

  // Continental Europe
  { id: 'intl-valderrama', name: 'Real Club Valderrama', city: 'Sotogrande', country: 'Spain', continent: 'Europe', latitude: 36.2828, longitude: -5.3164, par: 71, holes: 18, type: 'Private' },
  { id: 'intl-pga-catalunya', name: 'PGA Catalunya (Stadium)', city: 'Girona', country: 'Spain', continent: 'Europe', latitude: 41.8686, longitude: 2.7708, par: 72, holes: 18, type: 'Resort' },
  { id: 'intl-morfontaine', name: 'Golf de Morfontaine', city: 'Mortefontaine', country: 'France', continent: 'Europe', latitude: 49.1264, longitude: 2.6019, par: 70, holes: 18, type: 'Private' },
  { id: 'intl-le-golf-national', name: 'Le Golf National (Albatros)', city: 'Guyancourt', country: 'France', continent: 'Europe', latitude: 48.7539, longitude: 2.0728, par: 72, holes: 18, type: 'Public' },
  { id: 'intl-royal-hague', name: 'Koninklijke Haagsche', city: 'Wassenaar', country: 'Netherlands', continent: 'Europe', latitude: 52.1417, longitude: 4.3439, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-falsterbo', name: 'Falsterbo Golfklubb', city: 'Falsterbo', country: 'Sweden', continent: 'Europe', latitude: 55.3917, longitude: 12.8206, par: 71, holes: 18, type: 'Semi-Private' },
  { id: 'intl-crans-sur-sierre', name: 'Crans-sur-Sierre', city: 'Crans-Montana', country: 'Switzerland', continent: 'Europe', latitude: 46.3081, longitude: 7.4756, par: 70, holes: 18, type: 'Resort' },

  // Australia & New Zealand
  { id: 'intl-royal-melbourne-west', name: 'Royal Melbourne (West)', city: 'Melbourne', country: 'Australia', continent: 'Australia', latitude: -37.9702, longitude: 145.029, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-kingston-heath', name: 'Kingston Heath Golf Club', city: 'Melbourne', country: 'Australia', continent: 'Australia', latitude: -37.9878, longitude: 145.1064, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-barnbougle-dunes', name: 'Barnbougle Dunes', city: 'Bridport', country: 'Australia', continent: 'Australia', latitude: -40.9975, longitude: 147.4523, par: 71, holes: 18, type: 'Resort' },
  { id: 'intl-cape-wickham', name: 'Cape Wickham Links', city: 'King Island', country: 'Australia', continent: 'Australia', latitude: -39.5872, longitude: 143.9317, par: 72, holes: 18, type: 'Resort' },
  { id: 'intl-new-south-wales', name: 'New South Wales Golf Club', city: 'Sydney', country: 'Australia', continent: 'Australia', latitude: -33.9906, longitude: 151.2478, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-royal-pines', name: 'Royal Pines Resort', city: 'Gold Coast', country: 'Australia', continent: 'Australia', latitude: -27.9906, longitude: 153.3878, par: 72, holes: 18, type: 'Resort' },
  { id: 'intl-cape-kidnappers', name: 'Cape Kidnappers', city: "Hawke's Bay", country: 'New Zealand', continent: 'Australia', latitude: -39.6444, longitude: 177.0736, par: 71, holes: 18, type: 'Resort' },
  { id: 'intl-tara-iti', name: 'Tara Iti Golf Club', city: 'Mangawhai', country: 'New Zealand', continent: 'Australia', latitude: -36.1006, longitude: 174.5622, par: 71, holes: 18, type: 'Private' },

  // Asia
  { id: 'intl-hirono', name: 'Hirono Golf Club', city: 'Kobe', country: 'Japan', continent: 'Asia', latitude: 34.8222, longitude: 134.9539, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-kawana-fuji', name: 'Kawana (Fuji)', city: 'Ito', country: 'Japan', continent: 'Asia', latitude: 34.9772, longitude: 139.1275, par: 72, holes: 18, type: 'Resort' },
  { id: 'intl-nine-bridges', name: 'Club de Nine Bridges', city: 'Jeju', country: 'South Korea', continent: 'Asia', latitude: 33.3556, longitude: 126.4139, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-sentosa-serapong', name: 'Sentosa (Serapong)', city: 'Singapore', country: 'Singapore', continent: 'Asia', latitude: 1.2497, longitude: 103.8331, par: 71, holes: 18, type: 'Private' },
  { id: 'intl-emirates-majlis', name: 'Emirates Golf Club (Majlis)', city: 'Dubai', country: 'United Arab Emirates', continent: 'Asia', latitude: 25.0989, longitude: 55.1636, par: 72, holes: 18, type: 'Resort' },
  { id: 'intl-blue-canyon', name: 'Blue Canyon (Canyon)', city: 'Phuket', country: 'Thailand', continent: 'Asia', latitude: 8.1264, longitude: 98.3169, par: 72, holes: 18, type: 'Resort' },

  // Africa
  { id: 'intl-fancourt-links', name: 'The Links at Fancourt', city: 'George', country: 'South Africa', continent: 'Africa', latitude: -33.9583, longitude: 22.4181, par: 73, holes: 18, type: 'Resort' },
  { id: 'intl-leopard-creek', name: 'Leopard Creek', city: 'Malelane', country: 'South Africa', continent: 'Africa', latitude: -25.4222, longitude: 31.5411, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-durban-country-club', name: 'Durban Country Club', city: 'Durban', country: 'South Africa', continent: 'Africa', latitude: -29.8258, longitude: 31.0392, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-royal-golf-dar-es-salam', name: 'Royal Golf Dar Es Salam (Red)', city: 'Rabat', country: 'Morocco', continent: 'Africa', latitude: 33.9536, longitude: -6.8281, par: 73, holes: 18, type: 'Public' },

  // South America
  { id: 'intl-jockey-club-red', name: 'Jockey Club (Red)', city: 'Buenos Aires', country: 'Argentina', continent: 'South America', latitude: -34.4728, longitude: -58.5169, par: 72, holes: 18, type: 'Private' },
  { id: 'intl-olympic-rio', name: 'Olympic Golf Course', city: 'Rio de Janeiro', country: 'Brazil', continent: 'South America', latitude: -23.0139, longitude: -43.4058, par: 71, holes: 18, type: 'Public' },
  { id: 'intl-los-leones', name: 'Club de Golf Los Leones', city: 'Santiago', country: 'Chile', continent: 'South America', latitude: -33.3936, longitude: -70.5622, par: 71, holes: 18, type: 'Private' },

  // Canada & Mexico (North America, outside the bundled US set)
  { id: 'intl-cabot-cliffs', name: 'Cabot Cliffs', city: 'Inverness, NS', country: 'Canada', continent: 'North America', latitude: 46.2436, longitude: -61.3089, par: 72, holes: 18, type: 'Resort' },
  { id: 'intl-cabot-links', name: 'Cabot Links', city: 'Inverness, NS', country: 'Canada', continent: 'North America', latitude: 46.2244, longitude: -61.3006, par: 70, holes: 18, type: 'Resort' },
  { id: 'intl-st-georges-toronto', name: "St George's Golf & Country Club", city: 'Toronto, ON', country: 'Canada', continent: 'North America', latitude: 43.6708, longitude: -79.5433, par: 71, holes: 18, type: 'Private' },
  { id: 'intl-banff-springs', name: 'Fairmont Banff Springs', city: 'Banff, AB', country: 'Canada', continent: 'North America', latitude: 51.1614, longitude: -115.5528, par: 71, holes: 18, type: 'Resort' },
  { id: 'intl-el-camaleon', name: 'El Camaleón', city: 'Playa del Carmen', country: 'Mexico', continent: 'North America', latitude: 20.7181, longitude: -87.0231, par: 71, holes: 18, type: 'Resort' },
  { id: 'intl-diamante-dunes', name: 'Diamante (Dunes)', city: 'Cabo San Lucas', country: 'Mexico', continent: 'North America', latitude: 22.9464, longitude: -110.1367, par: 72, holes: 18, type: 'Private' },
];
