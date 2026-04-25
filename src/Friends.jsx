// src/pages/Friends.jsx
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/avatar'
import { friendSuggestions, detectCommunities, buildAdjList } from '../utils/dsaEngine'
import { Link } from 'react-router-dom'
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore'
import toast from 'react-hot-toast'

const TABS = [
  { id:'friends', label:'My Friends' },
  { id:'requests', label:'Requests' },
  { id:'discover', label:'Discover' },
  { id:'communities', label:'Communities' },
]
const COMM_COLORS = ['#818cf8','#34d399','#fbbf24','#f87171','#a78bfa','#22d3ee']

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

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setMyData(snap.data())
    })
    return unsub
  }, [])

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      const map = {}
      snap.docs.forEach(d => { map[d.id] = { uid: d.id, ...d.data() } })
      setAllUsers(map)
    })
  }, [])

  useEffect(() => {
    if (!myData || !Object.keys(allUsers).length) return
    setFriends((myData.friends || []).map(uid => allUsers[uid]).filter(Boolean))
    setRequests((myData.friendRequestsReceived || []).map(uid => allUsers[uid]).filter(Boolean))
    const friendsMap = new Map()
    Object.values(allUsers).forEach(u => friendsMap.set(u.uid, u.friends || []))
    const adj = buildAdjList(friendsMap)
    setSuggestions(friendSuggestions(adj, user.uid, myData.friends || []).filter(s => !myData.friendRequestsSent?.includes(s.uid)))
    setCommunities(detectCommunities(adj))
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

  const UserCard = ({ u, action }) => (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 0', borderBottom:'1px solid var(--border)' }}>
      <Link to={`/profile/${u.uid}`}>
        <div style={{ padding:2, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#a78bfa)' }}>
          <img src={avatarUrl(u.photo, u.name)} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--surface)', display:'block' }} alt=""/>
        </div>
      </Link>
      <div style={{ flex:1, minWidth:0 }}>
        <Link to={`/profile/${u.uid}`}>
          <div style={{ fontWeight:700, fontSize:'0.86rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
        </Link>
        <div style={{ fontSize:'0.7rem', color:'var(--muted)', marginTop:1 }}>{u.friends?.length||0} friends</div>
      </div>
      {action}
    </div>
  )

  return (
    <div className="page-enter">
      <div style={{ fontWeight:800, fontSize:'1.15rem', marginBottom:20, letterSpacing:'-0.2px' }}>Friends</div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:20, padding:'4px', background:'var(--surface2)', borderRadius:11, width:'fit-content', border:'1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'7px 16px', border:'none', cursor:'pointer',
            fontFamily:'Syne', fontSize:'0.8rem', fontWeight: tab===t.id ? 700 : 500,
            background: tab===t.id ? 'linear-gradient(135deg,var(--accent-deep),var(--accent2))' : 'none',
            color: tab===t.id ? '#fff' : 'var(--muted)',
            borderRadius:8, transition:'all 0.15s',
            boxShadow: tab===t.id ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
            position:'relative',
          }}>
            {t.label}
            {t.id === 'requests' && requests.length > 0 && (
              <span style={{ marginLeft:6, background:'var(--danger)', color:'#fff', borderRadius:99, padding:'1px 6px', fontSize:'0.6rem', fontWeight:700 }}>
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MY FRIENDS */}
      {tab === 'friends' && (
        <div className="card">
          <div style={{ fontWeight:700, marginBottom:2 }}>Your Friends</div>
          <div style={{ fontSize:'0.76rem', color:'var(--muted)', marginBottom:14 }}>{friends.length} connections</div>
          {friends.length === 0
            ? <div style={{ color:'var(--muted)', fontSize:'0.85rem', padding:'20px 0', textAlign:'center' }}>No friends yet. Try Discover!</div>
            : friends.map(f => (
              <UserCard key={f.uid} u={f} action={
                <Link to={`/chat/${f.uid}`} className="btn btn-primary" style={{ fontSize:'0.75rem', padding:'6px 14px' }}>💬 Chat</Link>
              }/>
            ))
          }
        </div>
      )}

      {/* REQUESTS */}
      {tab === 'requests' && (
        <div className="card">
          <div style={{ fontWeight:700, marginBottom:14 }}>Friend Requests</div>
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

      {/* DISCOVER */}
      {tab === 'discover' && (
        <div>
          {suggestions.length > 0 && (
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontWeight:700, fontSize:'0.9rem' }}>Suggested for you</span>
                <span className="dsa-tag">BFS</span>
              </div>
              <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginBottom:14 }}>Based on mutual friend connections</div>
              {suggestions.map(({ uid, mutualCount }) => {
                const u = allUsers[uid]; if (!u) return null
                return (
                  <UserCard key={uid} u={u} action={
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                      <span style={{ fontSize:'0.68rem', color:'var(--accent)', fontWeight:600 }}>{mutualCount} mutual</span>
                      <button className="btn btn-primary" style={{ fontSize:'0.72rem', padding:'5px 12px' }} onClick={() => sendRequest(uid)}>+ Add</button>
                    </div>
                  }/>
                )
              })}
            </div>
          )}
          <div className="card">
            <div style={{ fontWeight:700, marginBottom:12 }}>All People</div>
            <input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom:14 }}/>
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
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <span className="dsa-tag">DFS</span>
            <span style={{ fontSize:'0.82rem', color:'var(--muted)' }}>Connected components via Depth-First Search</span>
          </div>
          {communities.map((comm, i) => {
            const color = COMM_COLORS[i % COMM_COLORS.length]
            const myComm = comm.includes(user.uid)
            return (
              <div key={i} className="card" style={{ marginBottom:12, borderLeft:`3px solid ${color}`, background: myComm ? `linear-gradient(135deg, ${color}08, var(--surface))` : 'var(--surface)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontWeight:700, fontSize:'0.88rem' }}>Community {i + 1}</span>
                    {myComm && <span className="badge badge-green">Your community</span>}
                  </div>
                  <span style={{ fontSize:'0.74rem', color:'var(--muted)' }}>{comm.length} member{comm.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {comm.slice(0, 14).map(uid => {
                    const u = allUsers[uid]; if (!u) return null
                    return (
                      <Link key={uid} to={`/profile/${uid}`} title={u.name}>
                        <div style={{ padding:2, borderRadius:'50%', background: uid === user.uid ? `linear-gradient(135deg, ${color}, ${color}88)` : 'var(--border2)' }}>
                          <img src={avatarUrl(u.photo, u.name)} style={{ width:30, height:30, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--surface)', display:'block' }} alt=""/>
                        </div>
                      </Link>
                    )
                  })}
                  {comm.length > 14 && (
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.62rem', color:'var(--muted)', fontWeight:700 }}>
                      +{comm.length - 14}
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
