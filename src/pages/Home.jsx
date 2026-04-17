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

export default function Home() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [topic, setTopic] = useState('General')
  const [posts, setPosts] = useState([])
  const [myFriends, setMyFriends] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [allUsers, setAllUsers] = useState({})

  // Load friends
  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setMyFriends(snap.data().friends || [])
    })
    return unsub
  }, [user])

  // Load all users for name lookup + BFS suggestions
  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      const map = {}
      snap.docs.forEach(d => { map[d.id] = d.data() })
      setAllUsers(map)

      // Build adjacency list from all users' friends
      const friendsMap = new Map()
      snap.docs.forEach(d => {
        friendsMap.set(d.id, d.data().friends || [])
      })
      const adj = buildAdjList(friendsMap)
      const sugg = friendSuggestions(adj, user.uid, myFriends)
      setSuggestions(sugg.slice(0, 4))
    })
  }, [myFriends])

  // Real-time feed
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

  return (
    <div style={{ display:'flex', gap:20 }}>

      {/* ── MAIN FEED ── */}
      <div style={{ flex:1, minWidth:0 }}>

        {/* Create post */}
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ display:'flex', gap:10, marginBottom:10 }}>
            <img src={avatarUrl(user?.photoURL, user?.displayName)} className="avatar" style={{ width:36, height:36, marginTop:2 }} alt=""/>
            <textarea
              rows={2} placeholder="What's on your mind?"
              value={content} onChange={e => setContent(e.target.value)}
              style={{ resize:'none', flex:1 }}
            />
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {TOPICS.slice(0,5).map(t => (
                <button key={t} onClick={() => setTopic(t)} style={{
                  padding:'3px 10px', borderRadius:99, border:'1px solid',
                  borderColor: topic===t ? 'var(--accent)' : 'var(--border)',
                  background: topic===t ? 'var(--accent-light)' : 'none',
                  color: topic===t ? 'var(--accent)' : 'var(--muted)',
                  fontSize:'0.72rem', cursor:'pointer', fontFamily:'Inter', fontWeight:500,
                }}>{t}</button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={createPost} style={{ padding:'7px 18px' }}>Post</button>
          </div>
        </div>

        {/* Posts */}
        {posts.length === 0 && (
          <div style={{ textAlign:'center', color:'var(--muted)', padding:'40px 0', fontSize:'0.88rem' }}>
            No posts yet — be the first! 🚀
          </div>
        )}
        {posts.map(post => (
          <div key={post.id} className="card" style={{ marginBottom:12 }}>
            <div style={{ display:'flex', gap:10, marginBottom:10 }}>
              <Link to={`/profile/${post.authorId}`}>
                <img src={avatarUrl(post.authorPhoto, post.authorName)} className="avatar" style={{ width:38, height:38 }} alt=""/>
              </Link>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <Link to={`/profile/${post.authorId}`}>
                    <span style={{ fontWeight:600, fontSize:'0.88rem' }}>{post.authorName}</span>
                  </Link>
                  <span className="badge badge-purple" style={{ fontSize:'0.65rem' }}>{post.topic}</span>
                  {post.authorId === user.uid && <span className="badge badge-gray">You</span>}
                </div>
                <div style={{ fontSize:'0.72rem', color:'var(--muted)' }}>
                  {post.createdAt && formatDistanceToNow(post.createdAt.toDate(), { addSuffix:true })}
                </div>
              </div>
            </div>

            <div style={{ fontSize:'0.88rem', lineHeight:1.7, color:'var(--text2)', marginBottom:12 }}>{post.content}</div>

            <div style={{ display:'flex', gap:12, paddingTop:10, borderTop:'1px solid var(--border)' }}>
              <button onClick={() => toggleLike(post)} style={{
                background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5,
                color: post.likes?.includes(user.uid) ? 'var(--danger)' : 'var(--muted)',
                fontSize:'0.8rem', fontFamily:'Inter', fontWeight:500, padding:0,
                transition:'color 0.15s',
              }}>
                {post.likes?.includes(user.uid) ? '❤️' : '🤍'} {post.likes?.length || 0}
              </button>
              <Link to={`/profile/${post.authorId}`} style={{ fontSize:'0.78rem', color:'var(--muted)', display:'flex', alignItems:'center' }}>
                View profile →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* ── RIGHT SIDEBAR: BFS Suggestions ── */}
      {suggestions.length > 0 && (
        <div style={{ width:240, flexShrink:0, display:'none' }} className="suggestions-panel">
          <div className="card" style={{ position:'sticky', top:76 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
              <span style={{ fontWeight:600, fontSize:'0.85rem' }}>People you may know</span>
            </div>
            <div style={{ marginBottom:6 }}>
              <span className="dsa-tag">BFS</span>
              <span style={{ fontSize:'0.7rem', color:'var(--muted)', marginLeft:6 }}>mutual friend scoring</span>
            </div>
            <div className="divider"/>
            {suggestions.map(({ uid, mutualCount }) => {
              const u = allUsers[uid]
              if (!u) return null
              return (
                <div key={uid} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <Link to={`/profile/${uid}`}>
                    <img src={avatarUrl(u.photo, u.name)} className="avatar" style={{ width:34, height:34 }} alt=""/>
                  </Link>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:500, fontSize:'0.8rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--muted)' }}>{mutualCount} mutual</div>
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
