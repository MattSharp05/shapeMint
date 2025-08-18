const fs = require('fs');
const path = require('path');

// Define the environment variables needed
const envVars = `# Required for the application
VITE_MESHY_API_KEY=your_meshy_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Add any other required environment variables below
# VITE_OTHER_VARIABLE=value
`;

// Write to .env file
const envPath = path.join(__dirname, '.env');

// Check if .env already exists
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envVars);
  console.log('Created .env file with placeholder values. Please update it with your actual credentials.');
} else {
  console.log('.env file already exists. No changes were made.');
}
