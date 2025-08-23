# Password Reset Deployment Guide

This guide will help you configure the password reset functionality using Supabase's built-in authentication system.

## Overview

The password reset functionality now uses Supabase's native `resetPasswordForEmail` and `updateUser` methods, which are much simpler and more secure than custom Edge Functions.

## Step 1: Configure Supabase Authentication Settings

1. **Go to your Supabase Dashboard**
   - Navigate to your project
   - Go to **Authentication** → **URL Configuration**

2. **Configure Site URL and Redirect URLs**
   - Set your **Site URL** (e.g., `https://yourdomain.com` or `http://localhost:5175` for development)
   - Add the following **Redirect URLs**:
     - `https://yourdomain.com/reset-password` (production)
     - `http://localhost:5175/reset-password` (development)
     - `https://yourdomain.com/auth/callback` (for auth callbacks)

## Step 2: Configure Email Templates (Optional)

1. **Go to Authentication → Email Templates**
   - Click on **"Password Reset"** template
   - Customize the email template if desired
   - The default template works well, but you can personalize it

2. **Email Template Variables**
   - `{{ .ConfirmationURL }}` - The password reset link
   - `{{ .Email }}` - User's email address
   - `{{ .ExpiresAt }}` - When the reset link expires

## Step 3: Configure SMTP (Recommended for Production)

1. **Set up SMTP for better email delivery**
   - Go to **Authentication** → **Email Templates**
   - Click **"Configure SMTP"**
   - Add your SMTP credentials (Gmail, SendGrid, etc.)

2. **SMTP Configuration Example**
   ```
   Host: smtp.gmail.com
   Port: 587
   Username: your-email@gmail.com
   Password: your-app-password
   ```

## Step 4: Test the Functionality

1. **Test Password Reset Flow**
   - Go to your app's login page
   - Click "Forgot password?"
   - Enter a valid email address
   - Check if the email is received
   - Click the reset link in the email
   - Verify the password reset page loads correctly
   - Test setting a new password

2. **Check Authentication Logs**
   - Go to **Authentication** → **Logs** in your Supabase dashboard
   - Look for password reset events
   - Check for any errors or issues

## Step 5: Environment Variables

Make sure your frontend has the correct environment variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## How It Works

### 1. Password Reset Request
```javascript
// User clicks "Forgot password?" and enters email
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://yourdomain.com/reset-password'
});
```

### 2. Email Sent
- Supabase sends a password reset email
- Email contains a secure link to your reset password page
- Link includes authentication tokens

### 3. Password Reset Page
- User clicks the link in the email
- They are automatically authenticated
- They can set a new password using `updateUser`

### 4. Password Update
```javascript
// User sets new password
await supabase.auth.updateUser({
  password: 'new_password'
});
```

## Troubleshooting

### Common Issues

1. **Email not received**
   - Check spam folder
   - Verify SMTP configuration
   - Check Authentication logs in Supabase dashboard

2. **Reset link not working**
   - Verify redirect URLs are configured correctly
   - Check if the user is properly authenticated
   - Ensure the ResetPassword component is properly routed

3. **Authentication errors**
   - Check Authentication logs in Supabase dashboard
   - Verify environment variables are set correctly
   - Ensure the user has a valid session

### Debugging Steps

1. **Check Authentication Logs**
   - Go to **Authentication** → **Logs** in Supabase dashboard
   - Look for password reset events
   - Check for any error messages

2. **Test with Supabase Dashboard**
   - Go to **Authentication** → **Users**
   - Try sending a password reset email manually
   - Check if it works from the dashboard

3. **Verify Email Template**
   - Test the email template in Supabase dashboard
   - Check if variables are being replaced correctly

## Security Considerations

1. **Token Expiration**
   - Password reset tokens expire after 1 hour by default
   - This can be configured in Supabase settings

2. **Rate Limiting**
   - Supabase automatically implements rate limiting
   - No additional configuration needed

3. **Email Security**
   - Use HTTPS for all reset links
   - Supabase handles secure token generation
   - Consider using a dedicated email service for better deliverability

## Migration from Custom Edge Functions

If you previously used custom Edge Functions:

1. **Remove old Edge Functions**
   ```bash
   supabase functions delete send-password-reset
   supabase functions delete verify-password-reset
   ```

2. **Update your code**
   - Use `supabase.auth.resetPasswordForEmail()` instead of custom Edge Functions
   - Use `supabase.auth.updateUser()` for password updates
   - Remove any custom token handling

3. **Test thoroughly**
   - Test the new flow end-to-end
   - Verify emails are sent correctly
   - Check that password updates work

## Support

If you encounter issues:

1. Check the [Supabase Authentication documentation](https://supabase.com/docs/guides/auth)
2. Review Authentication logs in your Supabase dashboard
3. Test with a simple email template first
4. Verify all environment variables are set correctly 