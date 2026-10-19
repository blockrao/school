/**
 * Batch geocode schools missing location data
 * Uses Nominatim (free, OpenStreetMap) to reverse-geocode from address
 * Runs in batches to respect rate limits (1 req/sec)
 * 
 * Usage: npx ts-node scripts/geocode-schools.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface School {
  id: string;
  name_en: string | null;
  address: string | null;
  pincode: string | null;
}

async function geocodeWithNominatim(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SchoolOye-Geocoder/1.0' }
    });
    
    if (!response.ok) return null;
    
    const results = await response.json();
    if (!results.length) return null;
    
    const { lat, lon } = results[0];
    return { lat: parseFloat(lat), lng: parseFloat(lon) };
  } catch (e) {
    console.error(`Geocoding failed for "${address}":`, e);
    return null;
  }
}

async function batchGeocode(limit = 100) {
  console.log(`Starting batch geocoding (limit: ${limit})...`);
  
  // Get schools with address but no location
  const { data: schools, error } = await supabase
    .from('schools')
    .select('id, name_en, address, pincode')
    .not('address', 'is', null)
    .is('location', null)
    .limit(limit);
  
  if (error) {
    console.error('Error fetching schools:', error);
    return;
  }
  
  if (!schools?.length) {
    console.log('No schools to geocode');
    return;
  }
  
  console.log(`Found ${schools.length} schools to geocode`);
  
  let success = 0;
  let failed = 0;
  
  for (const school of schools) {
    const address = `${school.address}${school.pincode ? `, ${school.pincode}` : ''}, India`;
    console.log(`Geocoding: ${school.name_en} (${address})`);
    
    const coords = await geocodeWithNominatim(address);
    
    if (coords) {
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          location: `POINT(${coords.lng} ${coords.lat})`,
          geocode_precision: 'address'
        })
        .eq('id', school.id);
      
      if (updateError) {
        console.error(`  ❌ Update failed:`, updateError);
        failed++;
      } else {
        console.log(`  ✅ Geocoded: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
        success++;
      }
    } else {
      console.log(`  ⚠️  No results found`);
      failed++;
    }
    
    // Rate limit: 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\nBatch complete: ${success} geocoded, ${failed} failed`);
}

// Run
batchGeocode(100).catch(console.error);
