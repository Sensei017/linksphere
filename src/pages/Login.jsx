// src/pages/Login.jsx
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

export default function Login() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  useEffect(() => { if (user) navigate('/') }, [user])

  const handleLogin = async () => {
    try {
      await signInWithGoogle()
      toast.success('Welcome to LinkSphere!')
      navigate('/')
    } catch { toast.error('Login failed. Try again.') }
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)',
      padding:16,
    }}>
      <div style={{ width:'100%', maxWidth:400 }}>

        {/* Logo area */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{
            width:56, height:56, borderRadius:16, margin:'0 auto 16px',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'1.6rem', boxShadow:'0 8px 24px rgba(99,102,241,0.3)',
          }}>🌐</div>
          <div style={{ fontFamily:'Inter', fontWeight:700, fontSize:'1.6rem', letterSpacing:'-0.5px', color:'#0f172a' }}>
            LinkSphere
          </div>
          <div style={{ color:'var(--muted)', fontSize:'0.88rem', marginTop:6 }}>
            Your intelligent social network
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding:32 }}>
          <div style={{ fontWeight:600, fontSize:'1rem', marginBottom:6 }}>Sign in to your account</div>
          <div style={{ color:'var(--muted)', fontSize:'0.82rem', marginBottom:24, lineHeight:1.6 }}>
            Use your Google account — no password needed.
          </div>

          <button className="btn btn-primary" onClick={handleLogin} style={{
            width:'100%', padding:'11px', fontSize:'0.88rem', borderRadius:10,
            boxShadow:'0 4px 12px rgba(99,102,241,0.35)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
              <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* DSA features teaser */}
          <div style={{ marginTop:24, padding:'14px', background:'var(--surface2)', borderRadius:10 }}>
            <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text2)', marginBottom:10 }}>
              🧠 Powered by DSA algorithms
            </div>
            {[
              ['BFS', 'Smart friend suggestions'],
              ['DFS', 'Community detection'],
              ['Graph', 'Network visualization'],
            ].map(([algo, desc]) => (
              <div key={algo} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span className="dsa-tag">{algo}</span>
                <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:16, fontSize:'0.72rem', color:'var(--muted)' }}>
          By signing in you agree to our terms of service
        </div>
      </div>
    </div>
  )
}
