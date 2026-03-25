import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, doc, getDoc, onAuthStateChanged, signInWithPopup, googleProvider, signOut, setDoc, updateDoc, FirebaseUser } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'director' | 'engineer' | 'staff' | 'viewer';
  position?: string;
  photoURL?: string;
  createdAt?: string;
  id?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isDirector: boolean;
  isEngineer: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          // Auto-upgrade designated admin email if role is not admin
          if (user.email === 'samapon047@gmail.com' && data.role !== 'admin') {
            await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
            data.role = 'admin';
          }
          setProfile(data);
        } else {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || '',
            role: 'viewer',
          };
          if (user.email === 'samapon047@gmail.com') {
            newProfile.role = 'admin';
          }
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isDirector = profile?.role === 'director' || isAdmin;
  const isEngineer = profile?.role === 'engineer' || isAdmin;
  const isStaff = profile?.role === 'staff' || isAdmin;

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, login, logout, 
      isAdmin, isDirector, isEngineer, isStaff 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
