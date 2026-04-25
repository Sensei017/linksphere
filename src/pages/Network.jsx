// src/pages/Network.jsx
import { useEffect, useRef, useState } from 'react'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/avatar'
import { influenceScore } from '../utils/dsaEngine'
import { collection, getDocs } from 'firebase/firestore'
import { Link } from 'react-router-dom'

const COLORS = ['#818cf8','#34d399','#fbbf24','#f87171','#a78bfa','#22d3ee','#fb923c','#e879f9']

export default function Network() {
  const { user } = useAuth()
  const canvasRef = useRef(null)
  const [allUsers, setAllUsers] = useState({})
  const [nodes, setNodes] = useState([])
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState({ users:0, connections:0, myFriends:0 })
  const nodesRef = useRef([])
  const draggingRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      const map = {}
      snap.docs.forEach(d => { map[d.id] = { uid: d.id, ...d.data() } })
      setAllUsers(map)

      const uids = snap.docs.map(d => d.id)
      let edges = 0
      const c = canvasRef.current
      const W = c?.offsetWidth || 700, H = 480

      const ns = uids.map((uid, i) => {
        const angle = (2 * Math.PI / uids.length) * i
        const r = Math.min(W, H) * 0.3
        const u = map[uid]
        edges += (u.friends?.length || 0)
        return {
          uid, x: W/2 + r * Math.cos(angle), y: H/2 + r * Math.sin(angle),
          vx: 0, vy: 0, color: COLORS[i % COLORS.length], isMe: uid === user.uid,
        }
      })

      const myFriends = map[user.uid]?.friends?.length || 0
      setNodes(ns)
      nodesRef.current = ns
      setStats({ users: uids.length, connections: Math.floor(edges/2), myFriends })
    })
  }, [])

  useEffect(() => {
    if (!nodes.length) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth
    canvas.height = 480

    const draw = () => {
      const W = canvas.width, H = canvas.height
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = '#0a0b14'
      ctx.fillRect(0, 0, W, H)

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

      const ns = nodesRef.current

      // Forces
      for (let i = 0; i < ns.length; i++) {
        for (let j = i+1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x, dy = ns[j].y - ns[i].y
          const dist = Math.sqrt(dx*dx + dy*dy) || 1
          const f = 2400 / (dist * dist)
          ns[i].vx -= f*dx/dist; ns[i].vy -= f*dy/dist
          ns[j].vx += f*dx/dist; ns[j].vy += f*dy/dist
        }
      }

      ns.forEach(n => {
        const u = allUsers[n.uid]
        if (!u?.friends) return
        u.friends.forEach(fid => {
          const nb = ns.find(x => x.uid === fid)
          if (!nb) return
          const dx = nb.x - n.x, dy = nb.y - n.y
          const dist = Math.sqrt(dx*dx + dy*dy) || 1
          const f = (dist - 130) * 0.025
          n.vx += f*dx/dist; n.vy += f*dy/dist
          nb.vx -= f*dx/dist; nb.vy -= f*dy/dist
        })
      })

      ns.forEach(n => {
        if (n === draggingRef.current) { n.vx = 0; n.vy = 0; return }
        n.vx *= 0.68; n.vy *= 0.68
        n.x += n.vx; n.y += n.vy
        n.x = Math.max(32, Math.min(W-32, n.x))
        n.y = Math.max(32, Math.min(H-32, n.y))
      })

      // Draw edges
      ns.forEach(n => {
        const u = allUsers[n.uid]
        if (!u?.friends) return
        u.friends.forEach(fid => {
          if (fid <= n.uid) return
          const nb = ns.find(x => x.uid === fid)
          if (!nb) return
          const isSelectedEdge = selected === n.uid || selected === nb.uid
          ctx.beginPath()
          ctx.moveTo(n.x, n.y); ctx.lineTo(nb.x, nb.y)
          if (isSelectedEdge) {
            ctx.strokeStyle = `${n.color}88`; ctx.lineWidth = 2
          } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
          }
          ctx.stroke()
        })
      })

      // Draw nodes
      ns.forEach(n => {
        const u = allUsers[n.uid]
        if (!u) return
        const deg = u.friends?.length || 0
        const r = 14 + deg * 2.5
        const isSelected = selected === n.uid

        // Glow for selected/me
        if (isSelected || n.isMe) {
          const grd = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r+18)
          grd.addColorStop(0, `${n.color}44`)
          grd.addColorStop(1, 'transparent')
          ctx.beginPath(); ctx.arc(n.x, n.y, r+18, 0, Math.PI*2)
          ctx.fillStyle = grd; ctx.fill()
        }

        // Node
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2)
        if (n.isMe) {
          const grd = ctx.createRadialGradient(n.x-r*0.3, n.y-r*0.3, 0, n.x, n.y, r)
          grd.addColorStop(0, '#a78bfa')
          grd.addColorStop(1, '#6366f1')
          ctx.fillStyle = grd
        } else {
          ctx.fillStyle = `${n.color}18`
        }
        ctx.fill()
        ctx.strokeStyle = n.color; ctx.lineWidth = n.isMe ? 0 : 1.5; ctx.stroke()

        // Label
        ctx.fillStyle = n.isMe ? '#ffffff' : n.color
        ctx.font = `700 ${Math.min(r-2, 10)}px Syne, sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(u.name.split(' ')[0].slice(0, 8), n.x, n.y)

        // Degree badge
        if (deg > 0) {
          ctx.beginPath(); ctx.arc(n.x + r - 3, n.y - r + 3, 8, 0, Math.PI*2)
          ctx.fillStyle = n.color; ctx.fill()
          ctx.fillStyle = '#fff'; ctx.font = 'bold 7px Syne'
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(deg, n.x + r - 3, n.y - r + 3)
        }
      })

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [nodes, allUsers, selected])

  const getNode = (mx, my) => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    const x = (mx - rect.left) * (c.width / rect.width)
    const y = (my - rect.top) * (c.height / rect.height)
    return nodesRef.current.find(n => Math.hypot(n.x - x, n.y - y) < 28)
  }

  const onMouseDown = e => { const n = getNode(e.clientX, e.clientY); if (n) draggingRef.current = n }
  const onMouseMove = e => {
    if (!draggingRef.current) return
    const c = canvasRef.current, rect = c.getBoundingClientRect()
    draggingRef.current.x = (e.clientX - rect.left) * (c.width / rect.width)
    draggingRef.current.y = (e.clientY - rect.top) * (c.height / rect.height)
  }
  const onMouseUp = e => {
    const n = getNode(e.clientX, e.clientY)
    if (n && n === draggingRef.current) setSelected(s => s === n.uid ? null : n.uid)
    draggingRef.current = null
  }

  const selUser = selected ? allUsers[selected] : null

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'1.15rem', letterSpacing:'-0.2px' }}>Network Graph</div>
          <div style={{ fontSize:'0.78rem', color:'var(--muted)', marginTop:3 }}>
            Force-directed layout · Drag nodes · Click to inspect
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <span className="dsa-tag">Graph</span>
          <span className="dsa-tag">Force-directed</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        {[
          { label:'Users', value:stats.users, color:'#818cf8' },
          { label:'Connections', value:stats.connections, color:'#34d399' },
          { label:'Your Friends', value:stats.myFriends, color:'#fbbf24' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:'1.4rem', color:s.color, letterSpacing:'-0.5px' }}>{s.value}</div>
            <div style={{ fontSize:'0.68rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:14, border:'1px solid var(--border)' }}>
        <canvas
          ref={canvasRef}
          style={{ width:'100%', height:480, display:'block', cursor:'grab' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove}
          onMouseUp={onMouseUp} onMouseLeave={() => draggingRef.current = null}
        />
      </div>

      {/* Selected user */}
      {selUser && (
        <div className="card" style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14, border:'1px solid rgba(129,140,248,0.25)', background:'linear-gradient(135deg, rgba(99,102,241,0.08), var(--surface))' }}>
          <div style={{ padding:2, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#a78bfa)' }}>
            <img src={avatarUrl(selUser.photo, selUser.name)} style={{ width:46, height:46, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--surface)', display:'block' }} alt=""/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{selUser.name}</div>
            <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:3 }}>
              {selUser.friends?.length||0} connections · Influence: <span style={{ color:'var(--accent)' }}>{influenceScore(selUser.friends?.length||0)}/100</span>
            </div>
          </div>
          <Link to={`/profile/${selUser.uid}`} className="btn btn-primary" style={{ fontSize:'0.78rem' }}>View Profile →</Link>
        </div>
      )}

      {/* Legend */}
      <div className="card" style={{ border:'1px solid var(--border)' }}>
        <div style={{ fontWeight:700, fontSize:'0.8rem', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--muted)' }}>How to read this graph</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:'0.8rem', color:'var(--text2)' }}>
          <div>🔵 <strong>Node size</strong> = influence level</div>
          <div>➡️ <strong>Edge</strong> = friendship connection</div>
          <div>🔢 <strong>Badge</strong> = connection count</div>
          <div>🖱️ <strong>Drag</strong> nodes to rearrange</div>
        </div>
      </div>
    </div>
  )
}
