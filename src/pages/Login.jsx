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
      background:'var(--bg)', padding:16, position:'relative', overflow:'hidden',
    }}>
      {/* Background glow orbs */}
      <div style={{
        position:'absolute', width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        top:'-10%', left:'-10%', pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
        bottom:'5%', right:'-5%', pointerEvents:'none',
      }}/>

      <div style={{ width:'100%', maxWidth:400, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{
            width:64, height:64, borderRadius:20, margin:'0 auto 18px',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'1.8rem',
            boxShadow:'0 8px 32px rgba(99,102,241,0.45), 0 0 0 1px rgba(129,140,248,0.2)',
          }}>🌐</div>
          <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:'2rem', letterSpacing:'-0.5px', color:'var(--text)' }}>
            LinkSphere
          </div>
          <div style={{ color:'var(--muted)', fontSize:'0.88rem', marginTop:6 }}>
            Your intelligent social network
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding:32, border:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontWeight:700, fontSize:'1.05rem', marginBottom:6, color:'var(--text)' }}>
            Sign in to your account
          </div>
          <div style={{ color:'var(--muted)', fontSize:'0.82rem', marginBottom:26, lineHeight:1.65 }}>
            Use your Google account — no password needed.
          </div>

          <button className="btn btn-primary" onClick={handleLogin} style={{
            width:'100%', padding:'13px', fontSize:'0.9rem', borderRadius:10,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
              <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* DSA teaser */}
          <div style={{
            marginTop:24, padding:'16px', background:'var(--surface2)',
            borderRadius:10, border:'1px solid var(--border)',
          }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--accent)', marginBottom:12, letterSpacing:'0.04em', textTransform:'uppercase' }}>
              Powered by DSA algorithms
            </div>
            {[
              'Smart friend suggestions',
              'Community detection',
              'Network visualization',
            ].map(desc => (
              <div key={desc} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:'0.78rem', color:'var(--text2)' }}>· {desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:18, fontSize:'0.72rem', color:'var(--muted)' }}>
          By signing in you agree to our terms of service
        </div>
      </div>
    </div>
  )
}
