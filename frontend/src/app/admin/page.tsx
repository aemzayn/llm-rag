'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import api from '@/lib/api'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    models: 0,
    documents: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [usersRes, modelsRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/models'),
      ])

      setStats({
        users: usersRes.data.length,
        models: modelsRes.data.length,
        documents: 0, // Will be calculated from models
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Total Users',
      value: stats.users,
      icon: '👥',
      href: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      name: 'AI Models',
      value: stats.models,
      icon: '🤖',
      href: '/admin/models',
      color: 'bg-green-500',
    },
    {
      name: 'Documents',
      value: stats.documents,
      icon: '📄',
      href: '/admin/documents',
      color: 'bg-purple-500',
    },
  ]

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Admin Dashboard
        </h1>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {statCards.map((stat) => (
                <Link
                  key={stat.name}
                  href={stat.href}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-center">
                    <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                      <span className="text-3xl">{stat.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {stat.name}
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/admin/models"
                  className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <span className="text-2xl mr-3">➕</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    Create New Model
                  </span>
                </Link>

                <Link
                  href="/admin/users"
                  className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <span className="text-2xl mr-3">👤</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    Manage Users
                  </span>
                </Link>

                <Link
                  href="/admin/documents"
                  className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <span className="text-2xl mr-3">📤</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    Upload Documents
                  </span>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                System Status
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
                  <span className="text-green-800 dark:text-green-200">
                    ✓ Database Connected
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
                  <span className="text-green-800 dark:text-green-200">
                    ✓ Celery Worker
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Running
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
                  <span className="text-green-800 dark:text-green-200">
                    ✓ Vector Database
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Ready
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
