// src/pages/Profile.jsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/avatar'
import { influenceScore, degreesOfSeparation, buildAdjList } from '../utils/dsaEngine'
import {
  doc, getDoc, updateDoc, arrayUnion, arrayRemove,
  collection, query, where, orderBy, onSnapshot, getDocs
} from 'firebase/firestore'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const TOPIC_COLORS = {
  Tech:'#818cf8', Lifestyle:'#f472b6', Travel:'#34d399', Books:'#fbbf24',
  Social:'#60a5fa', Study:'#a78bfa', Gaming:'#f87171', Food:'#fb923c',
  Music:'#e879f9', General:'#94a3b8',
}

export default function Profile() {
  const { uid } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [myData, setMyData] = useState(null)
  const [posts, setPosts] = useState([])
  const [degrees, setDegrees] = useState(null)
  const [score, setScore] = useState(0)
  const isMe = uid === user?.uid

  useEffect(() => {
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setProfile(d)
        setScore(influenceScore(d.friends?.length || 0))
      }
    })
    if (!isMe) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) setMyData(snap.data())
      })
    }
  }, [uid])

  useEffect(() => {
    if (isMe || !profile) return
    getDocs(collection(db, 'users')).then(snap => {
      const friendsMap = new Map()
      snap.docs.forEach(d => friendsMap.set(d.id, d.data().friends || []))
      const adj = buildAdjList(friendsMap)
      const deg = degreesOfSeparation(adj, user.uid, uid)
      setDegrees(deg)
    })
  }, [profile])

  useEffect(() => {
    const q = query(collection(db, 'posts'), where('authorId','==',uid), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, snap => setPosts(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
    return unsub
  }, [uid])

  const sendFriendRequest = async () => {
    await updateDoc(doc(db, 'users', user.uid), { friendRequestsSent: arrayUnion(uid) })
    await updateDoc(doc(db, 'users', uid), { friendRequestsReceived: arrayUnion(user.uid) })
    toast.success('Friend request sent!')
  }

  const removeFriend = async () => {
    await updateDoc(doc(db, 'users', user.uid), { friends: arrayRemove(uid) })
    await updateDoc(doc(db, 'users', uid), { friends: arrayRemove(user.uid) })
    toast.success('Friend removed')
  }

  const isFriend = myData?.friends?.includes(uid)
  const requestSent = myData?.friendRequestsSent?.includes(uid)

  if (!profile) return (
    <div style={{ textAlign:'center', color:'var(--muted)', padding:60, fontSize:'0.88rem' }}>
      Loading profile...
    </div>
  )

  const barColor = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#818cf8'

  return (
    <div className="page-enter">
      {/* Profile header */}
      <div className="card" style={{ marginBottom:16 }}>
        {/* Cover strip */}
        <div style={{
          margin:'-20px -20px 20px',
          height:80,
          background:'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(167,139,250,0.15))',
          borderRadius:'14px 14px 0 0',
          borderBottom:'1px solid var(--border)',
          position:'relative',
        }}>
          <div style={{
            position:'absolute', bottom:-28, left:20,
            padding:3, borderRadius:'50%',
            background:'linear-gradient(135deg,#6366f1,#a78bfa)',
          }}>
            <img src={avatarUrl(profile.photo, profile.name, 80)} style={{
              width:72, height:72, borderRadius:'50%', objectFit:'cover',
              border:'3px solid var(--surface)', display:'block',
            }} alt=""/>
          </div>
        </div>

        <div style={{ paddingLeft:96 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:'1.15rem', letterSpacing:'-0.2px' }}>{profile.name}</div>
              <div style={{ color:'var(--muted)', fontSize:'0.76rem', marginTop:2 }}>{profile.email}</div>
              <div style={{ fontSize:'0.84rem', color:'var(--text2)', marginTop:6, maxWidth:400 }}>
                {profile.bio || 'No bio yet.'}
              </div>
            </div>
            {!isMe && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', paddingTop:2 }}>
                {isFriend ? (
                  <>
                    <Link to={`/chat/${uid}`} className="btn btn-primary" style={{ fontSize:'0.78rem' }}>💬 Message</Link>
                    <button className="btn btn-danger" style={{ fontSize:'0.78rem' }} onClick={removeFriend}>Remove</button>
                  </>
                ) : requestSent ? (
                  <button className="btn btn-secondary" disabled style={{ fontSize:'0.78rem', opacity:0.6 }}>Request Sent</button>
                ) : (
                  <button className="btn btn-primary" style={{ fontSize:'0.78rem' }} onClick={sendFriendRequest}>+ Add Friend</button>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display:'flex', gap:24, marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)' }}>
            {[
              { label:'Posts', value:posts.length, color:'var(--accent)' },
              { label:'Friends', value:profile.friends?.length || 0, color:'var(--accent)' },
              ...(!isMe && degrees !== null ? [{
                label:'Degrees',
                value: degrees === -1 ? '∞' : degrees,
                color: degrees <= 2 ? '#34d399' : degrees <= 4 ? '#fbbf24' : 'var(--muted)',
                tag:'BFS',
              }] : []),
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontWeight:800, fontSize:'1.15rem', color:s.color, display:'flex', alignItems:'center', gap:6 }}>
                  {s.value}
                  {s.tag && <span className="dsa-tag" style={{ fontSize:'0.55rem' }}>{s.tag}</span>}
                </div>
                <div style={{ fontSize:'0.65rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Influence score */}
        <div style={{ marginTop:20, padding:'14px 16px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className="dsa-tag">Graph</span>
              <span style={{ fontSize:'0.78rem', fontWeight:600 }}>Influence Score</span>
            </div>
            <span style={{ fontWeight:800, fontSize:'0.95rem', color:barColor }}>{score}/100</span>
          </div>
          <div style={{ height:5, background:'var(--surface3)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${score}%`, background:`linear-gradient(90deg, ${barColor}, ${barColor}99)`, borderRadius:99, transition:'width 0.7s cubic-bezier(0.4,0,0.2,1)' }}/>
          </div>
          <div style={{ fontSize:'0.7rem', color:'var(--muted)', marginTop:6 }}>
            Based on degree centrality — {profile.friends?.length || 0} connections
          </div>
        </div>
      </div>

      {/* Posts */}
      <div style={{ fontWeight:700, fontSize:'0.82rem', marginBottom:12, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
        Posts · {posts.length}
      </div>
      {posts.length === 0 && (
        <div style={{ color:'var(--muted)', fontSize:'0.85rem', padding:'20px 0', textAlign:'center' }}>No posts yet.</div>
      )}
      {posts.map(post => {
        const tc = TOPIC_COLORS[post.topic] || '#94a3b8'
        return (
          <div key={post.id} className="card" style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{
                padding:'2px 10px', borderRadius:99, fontSize:'0.65rem', fontWeight:700,
                background:`${tc}18`, color:tc, border:`1px solid ${tc}33`,
              }}>{post.topic}</span>
              <span style={{ fontSize:'0.7rem', color:'var(--muted)' }}>
                {post.createdAt && formatDistanceToNow(post.createdAt.toDate(), { addSuffix:true })}
              </span>
            </div>
            <div style={{ fontSize:'0.88rem', lineHeight:1.75, color:'var(--text2)' }}>{post.content}</div>
            <div style={{ marginTop:10, fontSize:'0.75rem', color:'var(--muted)' }}>❤️ {post.likes?.length || 0}</div>
          </div>
        )
      })}
    </div>
  )
}
