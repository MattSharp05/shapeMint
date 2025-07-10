// src/components/SupabaseTest.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing connection...')

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      // Test connection using auth endpoint
      const { data: { user }, error } = await supabase.auth.getUser()
      
      // Both scenarios indicate a successful connection:
      if (error && error.message === 'Auth session missing!') {
        setConnectionStatus('✅ Successfully connected to Supabase! (No user logged in)')
      } else if (error) {
        setConnectionStatus(`❌ Connection error: ${error.message}`)
      } else if (user) {
        setConnectionStatus(`✅ Connected to Supabase! Logged in as: ${user.email}`)
      } else {
        setConnectionStatus('✅ Successfully connected to Supabase! (No user logged in)')
      }
    } catch (error) {
      setConnectionStatus(`❌ Connection failed: ${error}`)
      console.error('Supabase connection error:', error)
    }
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h3>Supabase Connection Test</h3>
      <p>{connectionStatus}</p>
      <small style={{ color: '#666' }}>
        If you see a checkmark, your Supabase integration is ready to use!
      </small>
    </div>
  )
}