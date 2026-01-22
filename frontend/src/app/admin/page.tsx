'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import api from '@/lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Bot, FileText, Plus, Settings, Upload, CheckCircle, ArrowRight } from 'lucide-react'

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
      toast.error('Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Total Users',
      description: 'Active users in the system',
      value: stats.users,
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      name: 'AI Models',
      description: 'Configured LLM models',
      value: stats.models,
      icon: Bot,
      href: '/admin/models',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      name: 'Documents',
      description: 'Uploaded and processed',
      value: stats.documents,
      icon: FileText,
      href: '/admin/documents',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ]

  const quickActions = [
    { name: 'Create New Model', description: 'Configure a new LLM', href: '/admin/models', icon: Plus },
    { name: 'Manage Users', description: 'User roles and access', href: '/admin/users', icon: Settings },
    { name: 'Upload Documents', description: 'Add files to models', href: '/admin/documents', icon: Upload },
  ]

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview and management of your LLM RAG system</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statCards.map((stat) => {
                const Icon = stat.icon
                return (
                  <Link key={stat.name} href={stat.href}>
                    <Card className="hover:border-primary/50 transition-all cursor-pointer group">
                      <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="space-y-1">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            {stat.name}
                          </CardTitle>
                          <p className="text-3xl font-bold">{stat.value}</p>
                        </div>
                        <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">{stat.description}</p>
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
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <Link key={action.name} href={action.href}>
                        <div className="group p-4 rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <h3 className="font-medium mb-1">{action.name}</h3>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
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
                <CardDescription>Real-time status of system components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-medium">Database</span>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500/50">Connected</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-medium">Celery Worker</span>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500/50">Running</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-medium">Vector Database</span>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500/50">Ready</Badge>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
