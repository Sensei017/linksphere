// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth, provider, db } from "../firebase/config";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Google Sign In
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, provider);
    const u = result.user;

    // Create user doc in Firestore if first time
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: u.uid,
        name: u.displayName,
        email: u.email,
        photo: u.photoURL,
        bio: "",
        friends: [],
        friendRequestsSent: [],
        friendRequestsReceived: [],
        createdAt: serverTimestamp(),
      });
    }
    return result;
  };

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
