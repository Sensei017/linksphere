// src/components/Layout.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/avatar'
import toast from 'react-hot-toast'

const NAV = [
  { path: '/',        label: 'Feed'    },
  { path: '/friends', label: 'Friends' },
  { path: '/network', label: 'Network' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()

  const handleLogout = async () => {
    await logout(); toast.success('Signed out'); nav('/login')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <header style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 24px', height:56, flexShrink:0,
        background:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid var(--border)',
        position:'sticky', top:0, zIndex:100,
      }}>
        <Link to="/" style={{
          fontFamily:'Inter', fontWeight:700, fontSize:'1.05rem', letterSpacing:'-0.3px',
          background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        }}>LinkSphere</Link>

        <nav style={{ display:'flex', gap:2 }}>
          {NAV.map(n => {
            const active = loc.pathname === n.path
            return (
              <Link key={n.path} to={n.path} style={{
                padding:'6px 14px', borderRadius:'var(--radius-sm)',
                fontSize:'0.82rem', fontWeight: active?600:400,
                background: active?'var(--accent-light)':'none',
                color: active?'var(--accent)':'var(--muted)',
                transition:'all 0.15s',
              }}>{n.label}</Link>
            )
          })}
        </nav>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Link to={`/profile/${user?.uid}`} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <img src={avatarUrl(user?.photoURL, user?.displayName)} className="avatar" style={{ width:30, height:30 }} alt=""/>
            <span style={{ fontSize:'0.82rem', fontWeight:500, color:'var(--text2)' }}>{user?.displayName?.split(' ')[0]}</span>
          </Link>
          <button className="btn btn-ghost" style={{ fontSize:'0.78rem', padding:'5px 10px' }} onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main style={{ flex:1, overflowY:'auto', padding:'20px 16px' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>{children}</div>
      </main>
    </div>
  )
}
