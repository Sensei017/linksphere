// src/pages/Home.jsx
import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/avatar'
import { friendSuggestions, buildAdjList } from '../utils/dsaEngine'
import { Link } from 'react-router-dom'
import {
  collection, addDoc, serverTimestamp, query,
  orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDocs
} from 'firebase/firestore'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const TOPICS = ['Tech','Lifestyle','Travel','Books','Social','Study','Gaming','Food','Music','General']
const TOPIC_COLORS = {
  Tech:'#818cf8', Lifestyle:'#f472b6', Travel:'#34d399', Books:'#fbbf24',
  Social:'#60a5fa', Study:'#a78bfa', Gaming:'#f87171', Food:'#fb923c',
  Music:'#e879f9', General:'#94a3b8',
}

export default function Home() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [topic, setTopic] = useState('General')
  const [posts, setPosts] = useState([])
  const [myFriends, setMyFriends] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [allUsers, setAllUsers] = useState({})

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setMyFriends(snap.data().friends || [])
    })
    return unsub
  }, [user])

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      const map = {}
      snap.docs.forEach(d => { map[d.id] = d.data() })
      setAllUsers(map)
      const friendsMap = new Map()
      snap.docs.forEach(d => { friendsMap.set(d.id, d.data().friends || []) })
      const adj = buildAdjList(friendsMap)
      const sugg = friendSuggestions(adj, user.uid, myFriends)
      setSuggestions(sugg.slice(0, 4))
    })
  }, [myFriends])

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  const createPost = async () => {
    if (!content.trim()) { toast.error('Write something!'); return }
    await addDoc(collection(db, 'posts'), {
      content: content.trim(), topic,
      authorId: user.uid, authorName: user.displayName,
      authorPhoto: user.photoURL, likes: [],
      createdAt: serverTimestamp(),
    })
    setContent(''); toast.success('Posted!')
  }

  const toggleLike = async (post) => {
    const ref = doc(db, 'posts', post.id)
    const liked = post.likes?.includes(user.uid)
    await updateDoc(ref, { likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) })
  }

  const sendRequest = async (toUid) => {
    await updateDoc(doc(db, 'users', user.uid), { friendRequestsSent: arrayUnion(toUid) })
    await updateDoc(doc(db, 'users', toUid), { friendRequestsReceived: arrayUnion(user.uid) })
    toast.success('Friend request sent!')
    setSuggestions(s => s.filter(x => x.uid !== toUid))
  }

  const topicColor = TOPIC_COLORS[topic] || '#94a3b8'

  return (
    <div style={{ display:'flex', gap:20 }} className="page-enter">

      {/* ── MAIN FEED ── */}
      <div style={{ flex:1, minWidth:0 }}>

        {/* Compose card */}
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ display:'flex', gap:12, marginBottom:12 }}>
            <div style={{ padding:2, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#a78bfa)', flexShrink:0 }}>
              <img src={avatarUrl(user?.photoURL, user?.displayName)} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--bg)', display:'block' }} alt=""/>
            </div>
            <textarea
              rows={2} placeholder="What's on your mind?"
              value={content} onChange={e => setContent(e.target.value)}
              style={{ resize:'none', flex:1, lineHeight:1.6 }}
            />
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {TOPICS.slice(0, 6).map(t => {
                const c = TOPIC_COLORS[t]
                const sel = topic === t
                return (
                  <button key={t} onClick={() => setTopic(t)} style={{
                    padding:'3px 11px', borderRadius:99, border:`1px solid`,
                    borderColor: sel ? c : 'var(--border2)',
                    background: sel ? `${c}18` : 'none',
                    color: sel ? c : 'var(--muted)',
                    fontSize:'0.72rem', cursor:'pointer', fontFamily:'Syne', fontWeight:600,
                    transition:'all 0.15s',
                  }}>{t}</button>
                )
              })}
            </div>
            <button className="btn btn-primary" onClick={createPost} style={{ padding:'8px 20px' }}>
              Post
            </button>
          </div>
        </div>

        {/* Feed */}
        {posts.length === 0 && (
          <div style={{ textAlign:'center', color:'var(--muted)', padding:'50px 0', fontSize:'0.88rem' }}>
            No posts yet — be the first! 🚀
          </div>
        )}
        {posts.map((post, i) => {
          const liked = post.likes?.includes(user.uid)
          const tc = TOPIC_COLORS[post.topic] || '#94a3b8'
          return (
            <div key={post.id} className="card" style={{ marginBottom:12, animationDelay:`${i*0.04}s` }}>
              <div style={{ display:'flex', gap:11, marginBottom:12 }}>
                <Link to={`/profile/${post.authorId}`}>
                  <div style={{ padding:2, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#a78bfa)' }}>
                    <img src={avatarUrl(post.authorPhoto, post.authorName)} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--surface)', display:'block' }} alt=""/>
                  </div>
                </Link>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <Link to={`/profile/${post.authorId}`}>
                      <span style={{ fontWeight:700, fontSize:'0.88rem' }}>{post.authorName}</span>
                    </Link>
                    <span style={{
                      padding:'1px 8px', borderRadius:99, fontSize:'0.65rem', fontWeight:700,
                      background:`${tc}18`, color:tc, border:`1px solid ${tc}33`,
                    }}>{post.topic}</span>
                    {post.authorId === user.uid && <span className="badge badge-gray">You</span>}
                  </div>
                  <div style={{ fontSize:'0.72rem', color:'var(--muted)', marginTop:2 }}>
                    {post.createdAt && formatDistanceToNow(post.createdAt.toDate(), { addSuffix:true })}
                  </div>
                </div>
              </div>

              <div style={{ fontSize:'0.88rem', lineHeight:1.75, color:'var(--text2)', marginBottom:12 }}>
                {post.content}
              </div>

              <div style={{ display:'flex', gap:14, paddingTop:10, borderTop:'1px solid var(--border)' }}>
                <button onClick={() => toggleLike(post)} style={{
                  background:'none', border:'none', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:6,
                  color: liked ? '#f87171' : 'var(--muted)',
                  fontSize:'0.8rem', fontFamily:'Syne', fontWeight:600, padding:0,
                  transition:'all 0.15s',
                }}>
                  <span style={{ fontSize:'1rem' }}>{liked ? '❤️' : '🤍'}</span>
                  {post.likes?.length || 0}
                </button>
                <Link to={`/profile/${post.authorId}`} style={{ fontSize:'0.78rem', color:'var(--muted)', display:'flex', alignItems:'center', gap:4, transition:'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color='var(--muted)'}
                >
                  View profile →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      {suggestions.length > 0 && (
        <div style={{ width:240, flexShrink:0 }} className="suggestions-panel">
          <div className="card" style={{ position:'sticky', top:76 }}>
            <div style={{ fontWeight:700, fontSize:'0.85rem', marginBottom:4 }}>People you may know</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
              <span className="dsa-tag">BFS</span>
              <span style={{ fontSize:'0.7rem', color:'var(--muted)' }}>mutual scoring</span>
            </div>
            {suggestions.map(({ uid, mutualCount }) => {
              const u = allUsers[uid]
              if (!u) return null
              return (
                <div key={uid} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
                  <Link to={`/profile/${uid}`}>
                    <img src={avatarUrl(u.photo, u.name)} className="avatar" style={{ width:34, height:34 }} alt=""/>
                  </Link>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'0.8rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--accent)' }}>{mutualCount} mutual</div>
                  </div>
                  <button className="btn btn-primary" style={{ padding:'4px 10px', fontSize:'0.7rem' }} onClick={() => sendRequest(uid)}>+</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
