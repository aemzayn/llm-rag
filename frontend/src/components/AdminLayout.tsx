'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'
import AppLayout from '@/components/AppLayout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      const userData = response.data

      // Check if user is admin or superadmin
      if (userData.role !== UserRole.ADMIN && userData.role !== UserRole.SUPERADMIN) {
        toast.error('Access denied. Admin privileges required.')
        router.push('/dashboard')
        return
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return <AppLayout>{children}</AppLayout>
}
