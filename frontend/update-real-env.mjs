import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Real environment variables provided by user
const envVars = `#SUPABASE
VITE_SUPABASE_URL=https://xmjynwcvldvacsuhulbc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtanlud2N2bGR2YWNzdWh1bGJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc2OTcsImV4cCI6MjA2Njk2MzY5N30._kGjCDM4_9TyuJrxEemSqVhNFp3ccSKU9vrABu8P9nk

#Meshy
VITE_MESHY_API_KEY=msy_BQUm3vLCJAl6K1fpHbS39SMriq7NsP472OHh
`;

const envPath = join(__dirname, '.env');

try {
  await writeFile(envPath, envVars);
  console.log('Updated .env file with real API credentials.');
} catch (error) {
  console.error('Error updating .env file:', error);
}
