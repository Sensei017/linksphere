// src/pages/Friends.jsx
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/avatar'
import { friendSuggestions, detectCommunities, buildAdjList } from '../utils/dsaEngine'
import { Link } from 'react-router-dom'
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore'
import toast from 'react-hot-toast'

const TABS = ['friends','requests','discover','communities']

export default function Friends() {
  const { user } = useAuth()
  const [myData, setMyData] = useState(null)
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [allUsers, setAllUsers] = useState({})
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('friends')
  const [suggestions, setSuggestions] = useState([])
  const [communities, setCommunities] = useState([])

  // Live my data
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setMyData(snap.data())
    })
    return unsub
  }, [])

  // All users
  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      const map = {}
      snap.docs.forEach(d => { map[d.id] = { uid: d.id, ...d.data() } })
      setAllUsers(map)
    })
  }, [])

  // Friends + requests + BFS suggestions + DFS communities
  useEffect(() => {
    if (!myData || !Object.keys(allUsers).length) return

    // Friends
    setFriends((myData.friends || []).map(uid => allUsers[uid]).filter(Boolean))

    // Requests
    setRequests((myData.friendRequestsReceived || []).map(uid => allUsers[uid]).filter(Boolean))

    // BFS suggestions
    const friendsMap = new Map()
    Object.values(allUsers).forEach(u => friendsMap.set(u.uid, u.friends || []))
    const adj = buildAdjList(friendsMap)
    const sugg = friendSuggestions(adj, user.uid, myData.friends || [])
    setSuggestions(sugg.filter(s => !myData.friendRequestsSent?.includes(s.uid)))

    // DFS community detection
    const comms = detectCommunities(adj)
    setCommunities(comms)
  }, [myData, allUsers])

  const acceptRequest = async (fromUid) => {
    await updateDoc(doc(db, 'users', user.uid), { friends: arrayUnion(fromUid), friendRequestsReceived: arrayRemove(fromUid) })
    await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(user.uid), friendRequestsSent: arrayRemove(user.uid) })
    toast.success('Friend request accepted!')
  }

  const declineRequest = async (fromUid) => {
    await updateDoc(doc(db, 'users', user.uid), { friendRequestsReceived: arrayRemove(fromUid) })
    await updateDoc(doc(db, 'users', fromUid), { friendRequestsSent: arrayRemove(user.uid) })
    toast('Request declined')
  }

  const sendRequest = async (toUid) => {
    await updateDoc(doc(db, 'users', user.uid), { friendRequestsSent: arrayUnion(toUid) })
    await updateDoc(doc(db, 'users', toUid), { friendRequestsReceived: arrayUnion(user.uid) })
    toast.success('Friend request sent!')
    setSuggestions(s => s.filter(x => x.uid !== toUid))
  }

  const discover = Object.values(allUsers).filter(u =>
    u.uid !== user.uid &&
    !myData?.friends?.includes(u.uid) &&
    !myData?.friendRequestsSent?.includes(u.uid) &&
    u.name?.toLowerCase().includes(search.toLowerCase())
  )

  const TabBtn = ({ id, label, count }) => (
    <button onClick={() => setTab(id)} style={{
      padding:'8px 16px', border:'none', cursor:'pointer',
      fontFamily:'Inter', fontSize:'0.82rem', fontWeight: tab===id?600:400,
      background: tab===id?'var(--accent-light)':'none',
      color: tab===id?'var(--accent)':'var(--muted)',
      borderRadius:'var(--radius-sm)',
      transition:'all 0.15s',
    }}>
      {label}
      {count > 0 && (
        <span style={{ marginLeft:6, background:'var(--danger)', color:'#fff', borderRadius:99, padding:'1px 6px', fontSize:'0.65rem' }}>{count}</span>
      )}
    </button>
  )

  const UserCard = ({ u, action }) => (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
      <Link to={`/profile/${u.uid}`}>
        <img src={avatarUrl(u.photo, u.name)} className="avatar" style={{ width:42, height:42 }} alt=""/>
      </Link>
      <div style={{ flex:1, minWidth:0 }}>
        <Link to={`/profile/${u.uid}`}>
          <div style={{ fontWeight:600, fontSize:'0.85rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
        </Link>
        <div style={{ fontSize:'0.7rem', color:'var(--muted)' }}>{u.friends?.length||0} friends</div>
      </div>
      {action}
    </div>
  )

  const COMM_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

  return (
    <div>
      <div style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:16 }}>Friends</div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, padding:'4px', background:'var(--surface2)', borderRadius:10, width:'fit-content' }}>
        <TabBtn id="friends" label="My Friends" count={0}/>
        <TabBtn id="requests" label="Requests" count={requests.length}/>
        <TabBtn id="discover" label="Discover" count={0}/>
        <TabBtn id="communities" label="Communities" count={0}/>
      </div>

      {/* MY FRIENDS */}
      {tab === 'friends' && (
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:4 }}>Your Friends</div>
          <div style={{ fontSize:'0.78rem', color:'var(--muted)', marginBottom:12 }}>{friends.length} connections</div>
          {friends.length === 0
            ? <div style={{ color:'var(--muted)', fontSize:'0.85rem', padding:'20px 0', textAlign:'center' }}>No friends yet. Try Discover!</div>
            : friends.map(f => (
              <UserCard key={f.uid} u={f} action={
                <Link to={`/chat/${f.uid}`} className="btn btn-primary" style={{ fontSize:'0.75rem', padding:'6px 12px' }}>💬 Chat</Link>
              }/>
            ))
          }
        </div>
      )}

      {/* REQUESTS */}
      {tab === 'requests' && (
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:12 }}>Friend Requests</div>
          {requests.length === 0
            ? <div style={{ color:'var(--muted)', fontSize:'0.85rem', padding:'20px 0', textAlign:'center' }}>No pending requests.</div>
            : requests.map(r => (
              <UserCard key={r.uid} u={r} action={
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-success" style={{ fontSize:'0.75rem', padding:'5px 12px' }} onClick={() => acceptRequest(r.uid)}>Accept</button>
                  <button className="btn btn-danger" style={{ fontSize:'0.75rem', padding:'5px 12px' }} onClick={() => declineRequest(r.uid)}>Decline</button>
                </div>
              }/>
            ))
          }
        </div>
      )}

      {/* DISCOVER with BFS suggestions */}
      {tab === 'discover' && (
        <div>
          {suggestions.length > 0 && (
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontWeight:600, fontSize:'0.88rem' }}>Suggested for you</span>
                <span className="dsa-tag">BFS</span>
              </div>
              <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginBottom:12 }}>Based on mutual friend connections</div>
              {suggestions.map(({ uid, mutualCount }) => {
                const u = allUsers[uid]; if (!u) return null
                return (
                  <UserCard key={uid} u={u} action={
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                      <span style={{ fontSize:'0.68rem', color:'var(--accent)', fontWeight:500 }}>{mutualCount} mutual</span>
                      <button className="btn btn-primary" style={{ fontSize:'0.72rem', padding:'5px 12px' }} onClick={() => sendRequest(uid)}>+ Add</button>
                    </div>
                  }/>
                )
              })}
            </div>
          )}

          <div className="card">
            <div style={{ fontWeight:600, marginBottom:10 }}>All People</div>
            <input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom:12 }}/>
            {discover.length === 0
              ? <div style={{ color:'var(--muted)', fontSize:'0.85rem', padding:'10px 0', textAlign:'center' }}>No users found.</div>
              : discover.map(u => (
                <UserCard key={u.uid} u={u} action={
                  <button className="btn btn-secondary" style={{ fontSize:'0.75rem', padding:'5px 12px' }} onClick={() => sendRequest(u.uid)}>+ Add</button>
                }/>
              ))
            }
          </div>
        </div>
      )}

      {/* DFS COMMUNITIES */}
      {tab === 'communities' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <span className="dsa-tag">DFS</span>
            <span style={{ fontSize:'0.82rem', color:'var(--muted)' }}>Connected components detected via Depth-First Search</span>
          </div>
          {communities.map((comm, i) => {
            const color = COMM_COLORS[i % COMM_COLORS.length]
            const myComm = comm.includes(user.uid)
            return (
              <div key={i} className="card" style={{ marginBottom:12, borderLeft:`3px solid ${color}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontWeight:600, fontSize:'0.85rem' }}>Community {i + 1}</span>
                    {myComm && <span className="badge badge-green">Your community</span>}
                  </div>
                  <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{comm.length} member{comm.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {comm.slice(0, 12).map(uid => {
                    const u = allUsers[uid]; if (!u) return null
                    return (
                      <Link key={uid} to={`/profile/${uid}`} title={u.name}>
                        <img src={avatarUrl(u.photo, u.name)} className="avatar"
                          style={{ width:32, height:32, border:`2px solid ${uid === user.uid ? color : 'var(--border)'}` }} alt=""/>
                      </Link>
                    )
                  })}
                  {comm.length > 12 && (
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--surface2)', border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', color:'var(--muted)' }}>
                      +{comm.length - 12}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
