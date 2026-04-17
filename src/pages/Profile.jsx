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

  // Calculate degrees of separation via BFS
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

  if (!profile) return <div style={{ textAlign:'center', color:'var(--muted)', padding:40 }}>Loading...</div>

  // Influence bar color
  const barColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#6366f1'

  return (
    <div>
      {/* Profile header */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          <img src={avatarUrl(profile.photo, profile.name, 80)} className="avatar" style={{ width:72, height:72 }} alt=""/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'1.1rem' }}>{profile.name}</div>
                <div style={{ color:'var(--muted)', fontSize:'0.78rem', marginTop:2 }}>{profile.email}</div>
                <div style={{ fontSize:'0.82rem', color:'var(--text2)', marginTop:6 }}>{profile.bio || 'No bio yet.'}</div>
              </div>
              {!isMe && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {isFriend ? (
                    <>
                      <Link to={`/chat/${uid}`} className="btn btn-primary" style={{ fontSize:'0.78rem' }}>💬 Message</Link>
                      <button className="btn btn-danger" style={{ fontSize:'0.78rem' }} onClick={removeFriend}>Remove</button>
                    </>
                  ) : requestSent ? (
                    <button className="btn btn-secondary" disabled style={{ fontSize:'0.78rem' }}>Request Sent</button>
                  ) : (
                    <button className="btn btn-primary" style={{ fontSize:'0.78rem' }} onClick={sendFriendRequest}>+ Add Friend</button>
                  )}
                </div>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display:'flex', gap:20, marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--accent)' }}>{posts.length}</div>
                <div style={{ fontSize:'0.68rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Posts</div>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--accent)' }}>{profile.friends?.length || 0}</div>
                <div style={{ fontSize:'0.68rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Friends</div>
              </div>
              {!isMe && degrees !== null && (
                <div>
                  <div style={{ fontWeight:700, fontSize:'1rem', color: degrees<=2?'#10b981':degrees<=4?'#f59e0b':'#94a3b8' }}>
                    {degrees === -1 ? '∞' : degrees}
                  </div>
                  <div style={{ fontSize:'0.68rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                    <span className="dsa-tag" style={{ fontSize:'0.6rem' }}>BFS</span> Degrees
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Influence score */}
        <div style={{ marginTop:16, padding:'12px 14px', background:'var(--surface2)', borderRadius:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span className="dsa-tag">Graph</span>
              <span style={{ fontSize:'0.78rem', fontWeight:500 }}>Influence Score</span>
            </div>
            <span style={{ fontWeight:700, fontSize:'0.9rem', color:barColor }}>{score}/100</span>
          </div>
          <div style={{ height:6, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${score}%`, background:barColor, borderRadius:99, transition:'width 0.6s ease' }}/>
          </div>
          <div style={{ fontSize:'0.7rem', color:'var(--muted)', marginTop:4 }}>
            Based on degree centrality — {profile.friends?.length || 0} connections
          </div>
        </div>
      </div>

      {/* Posts */}
      <div style={{ fontWeight:600, fontSize:'0.85rem', marginBottom:10, color:'var(--text2)' }}>Posts</div>
      {posts.length === 0 && <div style={{ color:'var(--muted)', fontSize:'0.82rem' }}>No posts yet.</div>}
      {posts.map(post => (
        <div key={post.id} className="card" style={{ marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span className="badge badge-purple">{post.topic}</span>
            <span style={{ fontSize:'0.7rem', color:'var(--muted)' }}>
              {post.createdAt && formatDistanceToNow(post.createdAt.toDate(), { addSuffix:true })}
            </span>
          </div>
          <div style={{ fontSize:'0.88rem', lineHeight:1.7 }}>{post.content}</div>
          <div style={{ marginTop:8, fontSize:'0.75rem', color:'var(--muted)' }}>❤️ {post.likes?.length || 0}</div>
        </div>
      ))}
    </div>
  )
}
