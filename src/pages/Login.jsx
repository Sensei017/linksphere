// src/pages/Login.jsx
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

export default function Login() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const canvasRef = useRef(null)

  useEffect(() => { if (user) navigate('/') }, [user])

  // Animated floating graph nodes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const NODE_COUNT = 28
    const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 4 + 2,
      pulse: Math.random() * Math.PI * 2,
      color: ['#818cf8','#a78bfa','#34d399','#6366f1'][Math.floor(Math.random()*4)],
    }))

    const CONNECT_DIST = 160

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update positions
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.02
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i+1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist/CONNECT_DIST) * 0.35
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(129,140,248,${alpha})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        const pulse = Math.sin(n.pulse) * 0.5 + 1
        // Glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4 * pulse)
        grd.addColorStop(0, n.color + '55')
        grd.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 4 * pulse, 0, Math.PI*2)
        ctx.fillStyle = grd; ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI*2)
        ctx.fillStyle = n.color
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

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
      background:'radial-gradient(ellipse at 20% 50%, #0d0e1f 0%, #0a0b14 50%, #040a10 100%)',
      padding:16, position:'relative', overflow:'hidden',
    }}>
      {/* Animated canvas background */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, zIndex:0, opacity:0.9 }}/>

      {/* Big ambient glow blobs */}
      <div style={{
        position:'absolute', width:600, height:600, borderRadius:'50%', zIndex:0,
        background:'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)',
        top:'-15%', left:'-10%', animation:'drift1 12s ease-in-out infinite alternate',
        pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', width:500, height:500, borderRadius:'50%', zIndex:0,
        background:'radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 65%)',
        bottom:'-10%', right:'-5%', animation:'drift2 15s ease-in-out infinite alternate',
        pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', width:300, height:300, borderRadius:'50%', zIndex:0,
        background:'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 65%)',
        top:'40%', right:'20%', animation:'drift1 10s ease-in-out infinite alternate',
        pointerEvents:'none',
      }}/>

      <style>{`
        @keyframes drift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(30px, -40px) scale(1.1); } }
        @keyframes drift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-25px, 30px) scale(1.08); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
        @keyframes spin-slow { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .login-card { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        .login-title { animation: fadeUp 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .login-btn:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 8px 32px rgba(99,102,241,0.6) !important; }
        .login-btn:active { transform: translateY(0) scale(0.99); }
        .login-btn { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
      `}</style>

      {/* Card */}
      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div className="login-title" style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ position:'relative', width:72, height:72, margin:'0 auto 20px' }}>
            {/* Rotating ring */}
            <div style={{
              position:'absolute', inset:-6, borderRadius:'50%',
              border:'1.5px dashed rgba(129,140,248,0.35)',
              animation:'spin-slow 12s linear infinite',
            }}/>
            <div style={{
              width:72, height:72, borderRadius:22,
              background:'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'2rem',
              boxShadow:'0 0 0 1px rgba(129,140,248,0.3), 0 8px 32px rgba(99,102,241,0.5)',
            }}>🌐</div>
          </div>
          <div style={{
            fontFamily:'Syne', fontWeight:800, fontSize:'2.2rem',
            letterSpacing:'-0.5px',
            background:'linear-gradient(135deg, #eceaff 30%, #818cf8)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>LinkSphere</div>
          <div style={{ color:'#575470', fontSize:'0.88rem', marginTop:6, letterSpacing:'0.02em' }}>
            Your intelligent social network
          </div>
        </div>

        {/* Main card */}
        <div className="login-card" style={{
          background:'rgba(17,18,33,0.85)',
          backdropFilter:'blur(24px)',
          border:'1px solid rgba(255,255,255,0.09)',
          borderRadius:20,
          padding:'32px 28px',
          boxShadow:'0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(129,140,248,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>

          <div style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:6, color:'#eceaff' }}>
            Sign in to your account
          </div>
          <div style={{ color:'#575470', fontSize:'0.83rem', marginBottom:28, lineHeight:1.65 }}>
            Use your Google account — no password needed.
          </div>

          <button className="login-btn btn btn-primary" onClick={handleLogin} style={{
            width:'100%', padding:'14px', fontSize:'0.92rem', borderRadius:12,
            boxShadow:'0 4px 20px rgba(99,102,241,0.45)',
            background:'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            border:'1px solid rgba(129,140,248,0.3)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
              <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'24px 0' }}>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }}/>
            <span style={{ fontSize:'0.72rem', color:'#575470', letterSpacing:'0.05em' }}>POWERED BY</span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }}/>
          </div>

          {/* Feature pills */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
            {[
              { icon:'⬡', label:'BFS Suggestions', color:'#818cf8' },
              { icon:'⬡', label:'DFS Communities', color:'#34d399' },
              { icon:'⬡', label:'Graph Network', color:'#a78bfa' },
            ].map(f => (
              <div key={f.label} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'6px 12px', borderRadius:99,
                background:`${f.color}12`,
                border:`1px solid ${f.color}28`,
                animation:'shimmer 3s ease-in-out infinite',
              }}>
                <span style={{ fontSize:'0.65rem', color:f.color }}>●</span>
                <span style={{ fontSize:'0.73rem', color:f.color, fontWeight:600 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:'0.71rem', color:'#3a3855' }}>
          By signing in you agree to our terms of service
        </div>
      </div>
    </div>
  )
}
