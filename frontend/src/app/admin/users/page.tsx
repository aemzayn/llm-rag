'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import api from '@/lib/api'
import { User, UserRole } from '@/types'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, Info } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await api.get('/api/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    try {
      await api.patch(`/api/users/${userId}`, { role: newRole })
      toast.success('User role updated')
      loadUsers()
    } catch (error: any) {
      console.error('Failed to update role:', error)
      toast.error(error.response?.data?.detail || 'Failed to update role')
    }
  }

  const handleToggleActive = async (userId: number, isActive: boolean) => {
    try {
      await api.patch(`/api/users/${userId}`, { is_active: !isActive })
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`)
      loadUsers()
    } catch (error) {
      console.error('Failed to toggle active status:', error)
      toast.error('Failed to update user status')
    }
  }

  const handleDelete = async (userId: number, email: string) => {
    if (!confirm(`Delete user "${email}"? This action cannot be undone.`)) return

    try {
      await api.delete(`/api/users/${userId}`)
      toast.success('User deleted')
      loadUsers()
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      toast.error(error.response?.data?.detail || 'Failed to delete user')
    }
  }

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
      [UserRole.SUPERADMIN]: 'default',
      [UserRole.ADMIN]: 'secondary',
      [UserRole.USER]: 'outline',
    }

    return <Badge variant={variants[role]}>{role}</Badge>
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground mt-1">Manage user accounts and permissions</p>
          </div>
          <Badge variant="outline">{users.length} total</Badge>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === UserRole.SUPERADMIN ? (
                          getRoleBadge(user.role)
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UserRole.USER}>user</SelectItem>
                              <SelectItem value={UserRole.ADMIN}>admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={user.is_active ? "default" : "destructive"}
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          disabled={user.role === UserRole.SUPERADMIN}
                          className="h-7 text-xs"
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role !== UserRole.SUPERADMIN && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id, user.email)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {users.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  No users found
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-500">Note</p>
              <p className="text-muted-foreground">
                New users can sign up through the registration page.
                Admins can promote users to admin role or deactivate accounts.
                Superadmin accounts cannot be deleted or modified.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
