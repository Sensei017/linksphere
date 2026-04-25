// src/components/Layout.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/avatar'
import toast from 'react-hot-toast'

const NAV = [
  { path: '/',        label: 'Feed',    icon: '⬡' },
  { path: '/friends', label: 'Friends', icon: '⬡' },
  { path: '/network', label: 'Network', icon: '⬡' },
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
        padding:'0 24px', height:58, flexShrink:0,
        background:'rgba(10,11,20,0.88)', backdropFilter:'blur(16px)',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        position:'sticky', top:0, zIndex:100,
      }}>
        {/* Brand */}
        <Link to="/" style={{
          fontFamily:'Syne', fontWeight:800, fontSize:'1.08rem', letterSpacing:'-0.3px',
          background:'linear-gradient(135deg, #818cf8, #a78bfa)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          display:'flex', alignItems:'center', gap:8,
        }}>
          <span style={{
            width:28, height:28, borderRadius:8,
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.8rem', WebkitTextFillColor:'white',
            boxShadow:'0 2px 10px rgba(99,102,241,0.4)',
          }}>🌐</span>
          LinkSphere
        </Link>

        {/* Nav */}
        <nav style={{ display:'flex', gap:2 }}>
          {NAV.map(n => {
            const active = loc.pathname === n.path
            return (
              <Link key={n.path} to={n.path} style={{
                padding:'6px 16px', borderRadius:'var(--radius-sm)',
                fontSize:'0.82rem', fontWeight: active ? 700 : 500,
                background: active ? 'rgba(99,102,241,0.18)' : 'none',
                color: active ? 'var(--accent)' : 'var(--muted)',
                border: active ? '1px solid rgba(129,140,248,0.22)' : '1px solid transparent',
                transition:'all 0.15s',
              }}>{n.label}</Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Link to={`/profile/${user?.uid}`} style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{
              padding:2, borderRadius:'50%',
              background:'linear-gradient(135deg,#6366f1,#a78bfa)',
            }}>
              <img src={avatarUrl(user?.photoURL, user?.displayName)} style={{
                width:28, height:28, borderRadius:'50%', objectFit:'cover',
                display:'block', border:'2px solid var(--bg)',
              }} alt=""/>
            </div>
            <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text2)' }}>
              {user?.displayName?.split(' ')[0]}
            </span>
          </Link>
          <button className="btn btn-ghost" style={{ fontSize:'0.76rem', padding:'5px 10px', color:'var(--muted)' }} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main style={{ flex:1, overflowY:'auto', padding:'22px 16px' }}>
        <div style={{ maxWidth:720, margin:'0 auto' }}>{children}</div>
      </main>
    </div>
  )
}
