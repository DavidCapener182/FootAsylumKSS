// Script to geocode ALL UK postcodes and generate SQL UPDATE statements
const https = require('https');

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
      res.on('data', (chunk) => { data += chunk; });
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
    }).on('error', reject);
  });
}

// All stores from database
const allStores = [
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
  { id: 'ffa7b3a4-f0a5-4e7e-9b80-ae15bafd901b', postcode: 'DE1 2PL', name: 'Derby' },
  { id: '8f04b5d8-f514-47dd-b5cf-4b583e4e6770', postcode: 'DN1 1SW', name: 'Doncaster' },
  { id: '5cbea2e5-fa14-4ed4-a236-f023ad7c71a0', postcode: 'DD1 1UQ', name: 'Dundee' },
  { id: '00798b6e-2126-4479-8b95-e2e08852bd63', postcode: 'L13 1EW', name: 'Edge Lane' },
  { id: '2a782730-2bb3-4966-bd7b-6de921da9f38', postcode: 'LE19 1HY', name: 'Fosse Park' },
  { id: '48b65674-42ba-4532-b331-875c8651f12d', postcode: 'G2 8BH', name: 'Glasgow Argyle' },
  { id: '1d35a49d-f046-405c-80ad-1f955a6e3295', postcode: 'G34 9DL', name: 'Glasgow Fort' },
  { id: '5f83a771-4182-4ef1-8a3f-7f944dacfebf', postcode: 'ST1 1PS', name: 'Hanley' },
  { id: '6bd1c8be-bd18-450b-9de7-e05c98b52ce9', postcode: 'HU2 8LN', name: 'Hull' },
  { id: '4071478f-ef5c-45e4-95d0-2f31f3539251', postcode: 'RM20 2ZG', name: 'Lakeside New' },
  { id: '0189e22a-b622-4f15-be01-02982a61e81f', postcode: 'LS1 6HX', name: 'Leeds' },
  { id: '3f5a6196-19e0-429f-8ddc-9e0f0df45ffe', postcode: 'L1 3EU', name: 'Liverpool One' },
  { id: '4334a472-66fe-45db-965a-5ef8dcaffbbc', postcode: 'M4 3AB', name: 'Manchester' },
  { id: '5c7464e3-13fb-4ba9-b02b-bb0615dcf055', postcode: 'M4 3AB', name: 'Manchester Women\'s' },
  { id: 'a98a4899-b301-49b7-b25d-6cf744759bab', postcode: 'S9 1EN', name: 'Meadowhall' },
  { id: '89dc85a7-d7da-4a2b-973e-05176d474cf9', postcode: 'DY5 1SJ', name: 'Merry Hill' },
  { id: '81bbeec0-c534-4a6d-8ea1-9c624aeecaa4', postcode: 'NE11 9YG', name: 'Metro New' },
  { id: 'd165194c-99a2-4c85-ae4e-19ca2d6f44ee', postcode: 'TS1 1LJ', name: 'Middlesbrough' },
  { id: 'd38afc4d-97f7-492c-9c9b-fc760a56c527', postcode: 'MK9 3BB', name: 'Milton Keynes' },
  { id: '928a0a13-13cf-4017-8e26-87098352f2c8', postcode: 'NE1 7AS', name: 'Newcastle' },
  { id: 'd2745a71-9273-4454-b789-852e7bbf67fe', postcode: 'NP19 4QQ', name: 'Newport' },
  { id: '7c8d8486-a5c7-4617-940e-7233eff86f6a', postcode: 'NG1 3ED', name: 'Nottingham Clumber St.' },
  { id: 'bc5dff2e-eb4a-4644-9591-fdf8e1ad4174', postcode: 'W1D 2JL', name: 'Oxford Street' },
  { id: '16e8ec38-d4bd-4051-a086-14223c753645', postcode: 'PL1 1EA', name: 'Plymouth' },
  { id: '1fbf08ce-475c-42e6-bb44-04ab9d790f17', postcode: 'PO1 1BU', name: 'Portsmouth' },
  { id: 'bffb982c-7304-4ce6-972b-99fc8cf2b76d', postcode: 'PR1 2NR', name: 'Preston' },
  { id: '175d89a2-d4c1-46e2-b786-fb394e934e8a', postcode: 'S60 1TG', name: 'Rotherham' },
  { id: '33e312e5-f2c7-4430-9086-f7ff2123871a', postcode: 'SO14 7FE', name: 'Southampton' },
  { id: 'e291e218-453f-420a-981e-cd3e9759909b', postcode: 'L24 8QB', name: 'Speke' },
  { id: '96dfd121-bc56-4d5e-84ec-175dde6098ee', postcode: 'E15 1AZ', name: 'Stratford' },
  { id: '9ec7da29-d7f3-4d37-b9df-243baeac413a', postcode: 'SR1 3DR', name: 'Sunderland' },
  { id: '66deaeef-b461-4b62-83ad-ecfe07acad8d', postcode: 'CT10 2BF', name: 'Thanet' },
  { id: 'b66e7bec-0277-44cd-9637-6a77537d9076', postcode: 'M17 8BN', name: 'Trafford Mega' },
  { id: '39c50dd0-b387-441e-b0fa-ad3088bbba7c', postcode: 'WS1 1NW', name: 'Walsall' },
  { id: '9bd47346-2fb9-4a4d-ab89-3a40bec03963', postcode: 'WA1 1QB', name: 'Warrington' },
  { id: '5dfe7386-e3ce-4791-a46e-ca9f94177a72', postcode: 'WD17 2UB', name: 'Watford New Store' },
  { id: 'fc23c097-1bdf-411a-9f15-d2cdca590b28', postcode: 'W12 7GF', name: 'White City' },
  { id: '4d42703f-83f7-4511-8c8e-501e5c2fc795', postcode: 'LS11 8LU', name: 'White Rose' },
  { id: 'ca9f97f6-8a76-4e2b-97ed-9ee83c679508', postcode: 'LL13 8DG', name: 'Wrexham' },
];

async function geocodeAllStores() {
  const results = [];
  const sqlUpdates = [];
  
  for (const store of allStores) {
    if (!store.postcode) {
      console.log(`Skipping ${store.name} - no postcode`);
      continue;
    }
    
    console.log(`Geocoding ${store.name} (${store.postcode})...`);
    try {
      const coords = await geocodePostcode(store.postcode);
      if (coords) {
        results.push({ ...store, ...coords });
        sqlUpdates.push(`UPDATE fa_stores SET latitude = ${coords.latitude}, longitude = ${coords.longitude} WHERE id = '${store.id}';`);
        console.log(`  ✓ Found: ${coords.latitude}, ${coords.longitude}`);
      } else {
        console.log(`  ✗ No results found`);
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
    
    await delay(1100); // Rate limiting
  }
  
  console.log('\n=== SQL UPDATE Statements ===');
  console.log(sqlUpdates.join('\n'));
  console.log(`\nTotal: ${results.length} stores geocoded`);
  
  return { results, sqlUpdates };
}

geocodeAllStores();
