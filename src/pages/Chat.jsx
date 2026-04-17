// src/pages/Chat.jsx
import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/avatar'
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { formatDistanceToNow } from 'date-fns'

const getChatId = (a, b) => [a, b].sort().join('_')

export default function Chat() {
  const { uid } = useParams()
  const { user } = useAuth()
  const [otherUser, setOtherUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const chatId = getChatId(user.uid, uid)

  useEffect(() => {
    getDoc(doc(db, 'users', uid)).then(snap => { if (snap.exists()) setOtherUser(snap.data()) })
  }, [uid])

  useEffect(() => {
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50)
    })
    return unsub
  }, [chatId])

  const send = async () => {
    if (!text.trim()) return
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: text.trim(), senderId: user.uid,
      senderName: user.displayName, senderPhoto: user.photoURL,
      createdAt: serverTimestamp(),
    })
    setText('')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 56px - 40px)' }}>

      {/* Header */}
      {otherUser && (
        <div className="card" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, padding:'12px 16px' }}>
          <img src={avatarUrl(otherUser.photo, otherUser.name)} className="avatar" style={{ width:40, height:40 }} alt=""/>
          <div style={{ flex:1 }}>
            <Link to={`/profile/${uid}`}>
              <div style={{ fontWeight:600 }}>{otherUser.name}</div>
            </Link>
            <div style={{ fontSize:'0.72rem', color:'var(--accent3)', display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent3)', display:'inline-block' }}/>
              Active now
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:10, paddingBottom:8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', color:'var(--muted)', fontSize:'0.85rem', margin:'auto', padding:40 }}>
            No messages yet. Say hi! 👋
          </div>
        )}
        {messages.map(msg => {
          const mine = msg.senderId === user.uid
          return (
            <div key={msg.id} style={{ display:'flex', justifyContent: mine?'flex-end':'flex-start', gap:8, alignItems:'flex-end' }}>
              {!mine && <img src={avatarUrl(msg.senderPhoto, msg.senderName)} className="avatar" style={{ width:28, height:28, flexShrink:0 }} alt=""/>}
              <div style={{
                maxWidth:'72%', padding:'10px 14px',
                borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: mine ? 'var(--accent)' : 'var(--surface)',
                color: mine ? '#fff' : 'var(--text)',
                border: mine ? 'none' : '1px solid var(--border)',
                boxShadow: 'var(--shadow)',
                fontSize:'0.85rem', lineHeight:1.5,
              }}>
                {msg.text}
                <div style={{ fontSize:'0.62rem', marginTop:4, color: mine?'rgba(255,255,255,0.6)':'var(--muted)', textAlign:'right' }}>
                  {msg.createdAt && formatDistanceToNow(msg.createdAt.toDate(), { addSuffix:true })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ display:'flex', gap:8, paddingTop:12, borderTop:'1px solid var(--border)', flexShrink:0 }}>
        <input
          placeholder="Type a message..."
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }}
          style={{ flex:1 }}
        />
        <button className="btn btn-primary" onClick={send} style={{ padding:'9px 20px' }}>Send</button>
      </div>
    </div>
  )
}
