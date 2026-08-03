'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();

    // Real Supabase magic-link auth. No mock login: a user's identity is
    // only ever established through a verified session Supabase issues
    // after this email link is clicked.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/' }
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>כניסה</h1>
      <p className="subtitle">התחברות עם קישור חד-פעמי לדוא&quot;ל</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="הכניסו כתובת דוא&quot;ל"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 8,
            border: '1px solid #e3d9c4',
            fontSize: 16,
            marginBottom: 12
          }}
        />
        <button className="action" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'שולח...' : 'שלחו קישור כניסה'}
        </button>
      </form>
      {status === 'sent' && <p className="status-match">קישור נשלח, בדקו את תיבת הדוא&quot;ל.</p>}
      {status === 'error' && <p className="status-missing">{errorMsg}</p>}
    </div>
  );
}
