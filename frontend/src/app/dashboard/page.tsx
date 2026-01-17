'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { User, UserRole } from '@/types'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const response = await api.get('/api/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to load user:', error)
      toast.error('Session expired. Please login again.')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    toast.success('Logged out successfully')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            LLM RAG Chatbot
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user?.full_name} ({user?.role})
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Welcome to your Dashboard
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {/* Chat Card */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Chat</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Chat with your AI models
              </p>
              <a
                href="/chat"
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center"
              >
                Start Chat
              </a>
            </div>

            {/* Admin Panel Card (Admin only) */}
            {(user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN) && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Admin Panel</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Manage models, documents, and users
                </p>
                <a
                  href="/admin"
                  className="block w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-center"
                >
                  Go to Admin
                </a>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Your Profile</h3>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Email:</dt>
                <dd className="text-gray-900 dark:text-white">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Name:</dt>
                <dd className="text-gray-900 dark:text-white">{user?.full_name}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Role:</dt>
                <dd className="text-gray-900 dark:text-white capitalize">{user?.role}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Status:</dt>
                <dd className="text-gray-900 dark:text-white">
                  {user?.is_active ? 'Active' : 'Inactive'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
    </div>
  )
}
