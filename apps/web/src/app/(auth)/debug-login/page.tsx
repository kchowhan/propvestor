'use client';

import { useState } from 'react';
import { apiFetch } from '@/api/client';

export default function DebugLoginPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('admin@propvestor.dev');
  const [password, setPassword] = useState('password123');

  const testLogin = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setResult({ success: true, data });
    } catch (error: any) {
      setResult({ 
        success: false, 
        error: error.message,
        errorData: error.errorData,
        stack: error.stack 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Login Debug Page</h1>
      
      <div className="card mb-4">
        <div className="card-header">Test Login</div>
        <div className="card-body space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            onClick={testLogin} 
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Testing...' : 'Test Login'}
          </button>
        </div>
      </div>

      {result && (
        <div className="card">
          <div className="card-header">
            {result.success ? '✓ Success' : '✗ Error'}
          </div>
          <div className="card-body">
            <pre className="bg-slate-50 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="card mt-4">
        <div className="card-header">API Configuration</div>
        <div className="card-body">
          <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}</p>
          <p><strong>Local Storage Token:</strong> {typeof window !== 'undefined' ? (localStorage.getItem('propvestor_token') ? 'Present' : 'Not found') : 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}

