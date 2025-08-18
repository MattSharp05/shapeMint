import { writeFile, access, constants } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the environment variables needed
const envVars = `# Required for the application
VITE_MESHY_API_KEY=your_meshy_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Add any other required environment variables below
# VITE_OTHER_VARIABLE=value
`;

// Path to .env file
const envPath = join(__dirname, '.env');

try {
  // Check if .env already exists
  await access(envPath, constants.F_OK);
  console.log('.env file already exists. No changes were made.');
} catch (error) {
  // If .env doesn't exist, create it
  await writeFile(envPath, envVars);
  console.log('Created .env file with placeholder values. Please update it with your actual credentials.');
}
