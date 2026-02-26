'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { UserProfile, Locale } from '@/types'
import { UserService } from '@/services/UserService'

interface UserContextType {
  userId: string
  role: string
  profile: UserProfile | null
  isProfileComplete: boolean
  updateProfile: (profile: Partial<UserProfile>) => void
  logout: () => void
}

const defaultContext: UserContextType = {
  userId: '',
  role: 'guest',
  profile: null,
  isProfileComplete: false,
  updateProfile: () => {},
  logout: () => {},
}

const UserContext = createContext<UserContextType>(defaultContext)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [userId, setUserId] = useState<string>('')
  const [role, setRole] = useState<string>('guest')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const user = UserService.getCurrentUser()
    setUserId(user.id)
    setRole(user.role)
    setProfile(UserService.getUserProfile())
  }, [])

  const isProfileComplete = !!profile && !!profile.region && !!profile.ageGroup

  const updateProfile = (profileData: Partial<UserProfile>) => {
    const newProfile = UserService.saveUserProfile(profileData)
    setProfile(newProfile)
  }

  const logout = () => {
    UserService.logout()
    const user = UserService.getCurrentUser()
    setUserId(user.id)
    setRole(user.role)
    setProfile(null)
  }

  const value: UserContextType = {
    userId,
    role,
    profile,
    isProfileComplete,
    updateProfile,
    logout,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  return context
}
