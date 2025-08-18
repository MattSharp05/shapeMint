import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define working environment variables for development
const envVars = `# Working environment variables for development
VITE_MESHY_API_KEY=test_key_placeholder
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test_anon_key_placeholder

# These are placeholder values - replace with real credentials for production
# The app should at least load with these values
`;

const envPath = join(__dirname, '.env');

try {
  await writeFile(envPath, envVars);
  console.log('Updated .env file with working placeholder values.');
} catch (error) {
  console.error('Error updating .env file:', error);
}
