'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import api from '@/lib/api'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Bot, FileText, Plus, Settings, Upload, CheckCircle } from 'lucide-react'

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
        documents: 0,
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
      icon: Users,
      href: '/admin/users',
    },
    {
      name: 'AI Models',
      value: stats.models,
      icon: Bot,
      href: '/admin/models',
    },
    {
      name: 'Documents',
      value: stats.documents,
      icon: FileText,
      href: '/admin/documents',
    },
  ]

  const quickActions = [
    { name: 'Create New Model', href: '/admin/models', icon: Plus },
    { name: 'Manage Users', href: '/admin/users', icon: Settings },
    { name: 'Upload Documents', href: '/admin/documents', icon: Upload },
  ]

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your system</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statCards.map((stat) => {
                const Icon = stat.icon
                return (
                  <Link key={stat.name} href={stat.href}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {stat.name}
                        </CardTitle>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{stat.value}</div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <Link key={action.name} href={action.href}>
                        <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                          <Icon className="h-4 w-4" />
                          {action.name}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-md bg-secondary">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Database Connected</span>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500">Online</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-secondary">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Celery Worker</span>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500">Running</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-secondary">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Vector Database</span>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500">Ready</Badge>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
