// Script to geocode UK postcodes and update store coordinates
// Uses Nominatim (OpenStreetMap) free geocoding service

const https = require('https');

// Rate limiting - Nominatim allows 1 request per second
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodePostcode(postcode) {
  return new Promise((resolve, reject) => {
    const encodedPostcode = encodeURIComponent(postcode);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedPostcode}&countrycodes=gb&limit=1`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'FootAsylumKSS/1.0'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results && results.length > 0) {
            resolve({
              latitude: parseFloat(results[0].lat),
              longitude: parseFloat(results[0].lon)
            });
          } else {
            resolve(null);
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Store data with postcodes
const stores = [
  { id: '098c9478-7edf-47b4-bd40-55e908157446', postcode: 'AB11 5RG', name: 'Aberdeen' },
  { id: 'c758432b-7012-4420-9ae9-be2ac735f094', postcode: 'B24 9FP', name: 'Birmingham Fort' },
  { id: 'b341497b-aec3-4888-90df-2583d5969e28', postcode: 'BB1 5AF', name: 'Blackburn' },
  { id: '8977b4eb-c0a8-4135-98c7-0751e47e9eb4', postcode: 'FY1 4HU', name: 'Blackpool' },
  { id: 'd238bbb0-6b1c-4a3d-b1de-da965d09c4cb', postcode: 'DA9 9SL', name: 'Bluewater' },
  { id: '9c4775b2-03e3-40a4-9456-d491ffb20788', postcode: 'BL1 2AL', name: 'Bolton' },
  { id: '9eec9a7e-6836-4cbe-ac37-27156d54f3be', postcode: 'BD1 4RN', name: 'Bradford' },
  { id: '05a05796-7b7d-43e3-9aaa-50e0a45aa495', postcode: 'G51 4NB', name: 'Braehead' },
  { id: '00a48441-564c-4ea8-8811-ad3c48f35fb4', postcode: 'BN1 2RG', name: 'Brighton' },
  { id: 'bc352a59-7366-4f8e-9918-12e3d5a2ca46', postcode: 'BR1 1JF', name: 'Bromley' },
  { id: '82af3b5b-b8f0-4430-adcc-578011847ec0', postcode: 'CH4 0DP', name: 'Broughton Park' },
  { id: '4c73d354-2e23-48cb-876f-b75e2b672705', postcode: 'B5 4BA', name: 'Bull ring new' },
  { id: 'e7da5e32-9fc8-4328-8e65-4601e4ec298e', postcode: 'BL9 0JQ', name: 'Bury' },
  { id: '3a473b49-c5f5-4fb0-a602-a6a2909cbe57', postcode: 'CF10 2DQ', name: 'Cardiff' },
  { id: 'bdf16771-1943-4114-9114-e73b9b493fe2', postcode: 'CA3 8PU', name: 'Carlisle' },
  { id: '2d51a068-5e89-45c5-98ad-dd2897428529', postcode: 'EN8 0QE', name: 'Cheshunt' },
  { id: '77e3f8b8-779c-414c-9cd7-742da6e4b93b', postcode: 'CV1 1GF', name: 'Coventry' },
  { id: 'a2d8a716-0bb3-4c80-807e-b81fa53d47a6', postcode: 'CR0 1TG', name: 'Croydon' },
  { id: '0b9fff5f-da2e-4231-82d0-9c6a3b5f5380', postcode: 'M34 3JP', name: 'Denton' },
];

async function geocodeAllStores() {
  const results = [];
  
  for (const store of stores) {
    if (!store.postcode) {
      console.log(`Skipping ${store.name} - no postcode`);
      continue;
    }
    
    console.log(`Geocoding ${store.name} (${store.postcode})...`);
    try {
      const coords = await geocodePostcode(store.postcode);
      if (coords) {
        results.push({
          ...store,
          ...coords
        });
        console.log(`  ✓ Found: ${coords.latitude}, ${coords.longitude}`);
      } else {
        console.log(`  ✗ No results found`);
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
    
    // Rate limiting - wait 1.1 seconds between requests
    await delay(1100);
  }
  
  return results;
}

// Run the geocoding
geocodeAllStores().then(results => {
  console.log('\n=== Geocoding Results ===');
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nTotal: ${results.length} stores geocoded`);
});
