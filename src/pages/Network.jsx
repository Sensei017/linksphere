// src/pages/Network.jsx
import { useEffect, useRef, useState } from 'react'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/avatar'
import { influenceScore } from '../utils/dsaEngine'
import { collection, getDocs } from 'firebase/firestore'

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6']

export default function Network() {
  const { user } = useAuth()
  const canvasRef = useRef(null)
  const [nodes, setNodes] = useState([])
  const [allUsers, setAllUsers] = useState({})
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState({ users:0, connections:0, communities:0 })
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
          vx: 0, vy: 0,
          color: COLORS[i % COLORS.length],
          isMe: uid === user.uid,
        }
      })

      setNodes(ns)
      nodesRef.current = ns
      setStats({ users: uids.length, connections: edges/2, communities: 0 })
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

      // Light bg
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, W, H)

      const ns = nodesRef.current

      // Forces
      for (let i = 0; i < ns.length; i++) {
        for (let j = i+1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x, dy = ns[j].y - ns[i].y
          const dist = Math.sqrt(dx*dx + dy*dy) || 1
          const f = 2200 / (dist * dist)
          ns[i].vx -= f*dx/dist; ns[i].vy -= f*dy/dist
          ns[j].vx += f*dx/dist; ns[j].vy += f*dy/dist
        }
      }

      // Attraction for edges
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
        n.x = Math.max(30, Math.min(W-30, n.x))
        n.y = Math.max(30, Math.min(H-30, n.y))
      })

      // Draw edges
      ns.forEach(n => {
        const u = allUsers[n.uid]
        if (!u?.friends) return
        u.friends.forEach(fid => {
          if (fid <= n.uid) return
          const nb = ns.find(x => x.uid === fid)
          if (!nb) return
          ctx.beginPath()
          ctx.moveTo(n.x, n.y); ctx.lineTo(nb.x, nb.y)
          ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.stroke()
        })
      })

      // Draw nodes
      ns.forEach(n => {
        const u = allUsers[n.uid]
        if (!u) return
        const deg = u.friends?.length || 0
        const r = 16 + deg * 2.5
        const isSelected = selected === n.uid

        // Shadow for selected
        if (isSelected || n.isMe) {
          ctx.beginPath(); ctx.arc(n.x, n.y, r+4, 0, Math.PI*2)
          ctx.fillStyle = n.color + '25'; ctx.fill()
        }

        // Circle
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2)
        ctx.fillStyle = n.isMe ? n.color : '#ffffff'; ctx.fill()
        ctx.strokeStyle = n.color; ctx.lineWidth = n.isMe ? 0 : 2.5; ctx.stroke()

        // Label
        ctx.fillStyle = n.isMe ? '#ffffff' : n.color
        ctx.font = `600 ${Math.min(r-3, 11)}px Inter, sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(u.name.split(' ')[0].slice(0, 8), n.x, n.y)

        // Degree badge
        if (deg > 0) {
          ctx.beginPath(); ctx.arc(n.x + r - 4, n.y - r + 4, 8, 0, Math.PI*2)
          ctx.fillStyle = n.color; ctx.fill()
          ctx.fillStyle = '#fff'; ctx.font = 'bold 7.5px Inter'
          ctx.fillText(deg, n.x + r - 4, n.y - r + 4)
        }
      })

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [nodes, allUsers, selected])

  // Mouse events
  const getNode = (mx, my) => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    const x = (mx - rect.left) * (c.width / rect.width)
    const y = (my - rect.top) * (c.height / rect.height)
    return nodesRef.current.find(n => Math.hypot(n.x - x, n.y - y) < 24)
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
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'1.1rem' }}>Network Graph</div>
          <div style={{ fontSize:'0.78rem', color:'var(--muted)' }}>Force-directed layout · Drag nodes · Click to inspect</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <span className="dsa-tag">Graph</span>
          <span className="dsa-tag">Force-directed</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        {[
          ['Users', stats.users, '#6366f1'],
          ['Connections', stats.connections, '#10b981'],
          ['Your Friends', Object.values(allUsers).find(u=>u.uid===user.uid)?.friends?.length||0, '#f59e0b'],
        ].map(([label, val, color]) => (
          <div key={label} className="card" style={{ padding:'12px 16px', textAlign:'center' }}>
            <div style={{ fontWeight:700, fontSize:'1.2rem', color }}>{val}</div>
            <div style={{ fontSize:'0.7rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:14 }}>
        <canvas
          ref={canvasRef} style={{ width:'100%', height:480, display:'block', cursor:'grab' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={() => draggingRef.current = null}
        />
      </div>

      {/* Selected user info */}
      {selUser && (
        <div className="card" style={{ display:'flex', alignItems:'center', gap:14 }}>
          <img src={avatarUrl(selUser.photo, selUser.name)} className="avatar" style={{ width:48, height:48 }} alt=""/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600 }}>{selUser.name}</div>
            <div style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{selUser.friends?.length||0} connections · Influence: {influenceScore(selUser.friends?.length||0)}/100</div>
          </div>
          <a href={`/linksphere/profile/${selUser.uid}`} className="btn btn-primary" style={{ fontSize:'0.78rem' }}>View Profile →</a>
        </div>
      )}

      {/* Legend */}
      <div className="card" style={{ marginTop:14 }}>
        <div style={{ fontWeight:600, fontSize:'0.82rem', marginBottom:10 }}>How to read this graph</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:'0.78rem', color:'var(--text2)' }}>
          <div>🔵 <strong>Node size</strong> = influence (more friends = bigger)</div>
          <div>➡️ <strong>Edge</strong> = friendship connection</div>
          <div>🔢 <strong>Badge number</strong> = connection count</div>
          <div>🖱️ <strong>Drag</strong> nodes to rearrange</div>
        </div>
      </div>
    </div>
  )
}
