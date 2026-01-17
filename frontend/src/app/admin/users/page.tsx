'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import api from '@/lib/api'
import { User, UserRole } from '@/types'
import toast from 'react-hot-toast'

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
    const styles = {
      [UserRole.SUPERADMIN]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      [UserRole.ADMIN]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      [UserRole.USER]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    }

    return (
      <span className={`px-2 py-1 text-xs rounded font-medium ${styles[role]}`}>
        {role}
      </span>
    )
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Users
          </h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {users.length}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === UserRole.SUPERADMIN ? (
                          getRoleBadge(user.role)
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value={UserRole.USER}>user</option>
                            <option value={UserRole.ADMIN}>admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          disabled={user.role === UserRole.SUPERADMIN}
                          className={`px-2 py-1 text-xs rounded ${
                            user.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          } ${user.role === UserRole.SUPERADMIN ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.role !== UserRole.SUPERADMIN && (
                          <button
                            onClick={() => handleDelete(user.id, user.email)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No users found
              </div>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> New users can sign up through the registration page.
            Admins can promote users to admin role or deactivate accounts.
            Superadmin accounts cannot be deleted or modified.
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}
