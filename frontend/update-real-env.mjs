import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ⚠️ WARNING: This file should NEVER contain real credentials!
// ⚠️ Never commit this file with real API keys to version control
// ⚠️ If you need to set up environment variables, use setup-env.mjs instead
// ⚠️ For local development, manually edit .env file with your credentials

// Placeholder environment variables - REPLACE WITH YOUR ACTUAL CREDENTIALS
const envVars = `#SUPABASE
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

#Meshy
VITE_MESHY_API_KEY=your_meshy_api_key_here
`;

const envPath = join(__dirname, '.env');

try {
  await writeFile(envPath, envVars);
  console.log('⚠️ WARNING: This script uses placeholder values.');
  console.log('⚠️ Please manually edit .env file with your actual credentials.');
  console.log('Updated .env file with placeholder values.');
} catch (error) {
  console.error('Error updating .env file:', error);
}
