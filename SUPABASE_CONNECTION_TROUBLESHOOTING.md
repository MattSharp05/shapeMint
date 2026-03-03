# 🔧 Supabase Connection Troubleshooting

## Error: `ERR_NAME_NOT_RESOLVED`

This error means your browser cannot resolve the Supabase domain name to an IP address.

### Quick Checks

1. **Verify Supabase URL is correct**
   - Check your `.env` file in `frontend/` directory
   - URL should be: `https://xmjynwcvldvacsuhulbc.supabase.co`
   - Make sure there are no typos or extra spaces

2. **Check if Supabase project is active**
   - Go to https://supabase.com/dashboard
   - Check if your project is paused (free tier projects pause after inactivity)
   - If paused, click "Restore project"

3. **Test network connectivity**
   ```bash
   # Test if you can reach Supabase
   ping xmjynwcvldvacsuhulbc.supabase.co
   
   # Or test with curl
   curl -I https://xmjynwcvldvacsuhulbc.supabase.co
   ```

4. **Check DNS resolution**
   ```bash
   # Try resolving the domain
   nslookup xmjynwcvldvacsuhulbc.supabase.co
   ```

### Common Causes

#### 1. **Supabase Project Paused** (Most Common)
- Free tier Supabase projects pause after 7 days of inactivity
- **Solution**: Go to Supabase dashboard and restore the project

#### 2. **Network/Firewall Issues**
- Corporate networks or VPNs might block Supabase
- **Solution**: Try different network or disable VPN

#### 3. **DNS Issues**
- Your DNS server might be having issues
- **Solution**: 
  - Try using Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1)
  - Or flush DNS cache: `sudo dscacheutil -flushcache` (macOS)

#### 4. **Incorrect Environment Variables**
- The URL in `.env` might be wrong
- **Solution**: Double-check your `.env` file

### Steps to Fix

1. **Check Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/xmjynwcvldvacsuhulbc
   ```
   - Verify project is active (not paused)
   - Check project URL matches your `.env` file

2. **Verify .env File**
   ```bash
   cd frontend
   cat .env | grep SUPABASE
   ```
   Should show:
   ```
   VITE_SUPABASE_URL=https://xmjynwcvldvacsuhulbc.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

3. **Test Connection Manually**
   Open browser and try:
   ```
   https://xmjynwcvldvacsuhulbc.supabase.co
   ```
   Should show Supabase status page or API docs

4. **Restart Dev Server**
   After fixing issues:
   ```bash
   cd frontend
   npm run dev
   ```

### If Project is Paused

1. Go to https://supabase.com/dashboard
2. Find your project
3. Click "Restore" or "Resume"
4. Wait 1-2 minutes for project to come online
5. Refresh your app

### Alternative: Use Different Network

If you're on a restricted network:
- Try mobile hotspot
- Try different WiFi network
- Disable VPN if using one

---

## Other Errors in Console

### Chrome Extension Error
```
GET chrome-extension://pbanhockgagggenencehbnadejlgchfc/assets/userReportLinkedCandidate.json net::ERR_FILE_NOT_FOUND
```
**This is harmless** - just a browser extension trying to load a file. You can ignore it.

### Duplicate Debug Messages
```
[DEBUG] 🔐 Getting initial session...
[DEBUG] 🔐 Getting initial session...
```
**This is normal** - React Strict Mode renders components twice in development. This is expected behavior.

---

## Still Having Issues?

1. Check Supabase status: https://status.supabase.com
2. Verify your project exists and is active
3. Check browser console for more specific errors
4. Try in incognito mode (to rule out extensions)
