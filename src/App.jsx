// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Friends from './pages/Friends'
import Chat from './pages/Chat'
import Network from './pages/Network'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function PrivatePage({ children }) {
  return (
    <PrivateRoute>
      <Layout>{children}</Layout>
    </PrivateRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivatePage><Home /></PrivatePage>} />
      <Route path="/profile/:uid" element={<PrivatePage><Profile /></PrivatePage>} />
      <Route path="/friends" element={<PrivatePage><Friends /></PrivatePage>} />
      <Route path="/chat/:uid" element={<PrivatePage><Chat /></PrivatePage>} />
      <Route path="/network" element={<PrivatePage><Network /></PrivatePage>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
