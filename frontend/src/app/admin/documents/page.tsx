'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import api from '@/lib/api'
import { Model, Document, DocumentStatus } from '@/types'
import toast from 'react-hot-toast'

export default function DocumentsPage() {
  const searchParams = useSearchParams()
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState<number | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    loadModels()
  }, [])

  useEffect(() => {
    const modelId = searchParams.get('model_id')
    if (modelId) {
      setSelectedModel(parseInt(modelId))
    }
  }, [searchParams])

  useEffect(() => {
    if (selectedModel) {
      loadDocuments()
    }
  }, [selectedModel])

  const loadModels = async () => {
    try {
      const response = await api.get('/api/models')
      setModels(response.data)
      if (response.data.length > 0 && !selectedModel) {
        setSelectedModel(response.data[0].id)
      }
    } catch (error) {
      console.error('Failed to load models:', error)
      toast.error('Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  const loadDocuments = async () => {
    if (!selectedModel) return

    try {
      const response = await api.get(`/api/documents/models/${selectedModel}/documents`)
      setDocuments(response.data)
    } catch (error) {
      console.error('Failed to load documents:', error)
      toast.error('Failed to load documents')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file type
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext !== 'pdf' && ext !== 'csv') {
        toast.error('Only PDF and CSV files are supported')
        return
      }

      // Check file size (250MB)
      const maxSize = 250 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('File size must be less than 250MB')
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedModel) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      await api.post(
        `/api/documents/models/${selectedModel}/documents`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      )

      toast.success('Document uploaded successfully. Processing in background.')
      setSelectedFile(null)

      // Reload documents after a short delay
      setTimeout(() => {
        loadDocuments()
      }, 1000)
    } catch (error: any) {
      console.error('Upload failed:', error)
      toast.error(error.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number, filename: string) => {
    if (!confirm(`Delete document "${filename}"?`)) return

    try {
      await api.delete(`/api/documents/documents/${id}`)
      toast.success('Document deleted')
      loadDocuments()
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast.error('Failed to delete document')
    }
  }

  const getStatusBadge = (status: DocumentStatus) => {
    const styles = {
      [DocumentStatus.UPLOADING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      [DocumentStatus.PROCESSING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      [DocumentStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      [DocumentStatus.FAILED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    }

    return (
      <span className={`px-2 py-1 text-xs rounded ${styles[status]}`}>
        {status}
      </span>
    )
  }

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Documents
        </h1>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : models.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No models available. Create a model first.
            </p>
            <button
              onClick={() => window.location.href = '/admin/models'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Models
            </button>
          </div>
        ) : (
          <>
            {/* Model Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Model
              </label>
              <select
                value={selectedModel || ''}
                onChange={(e) => setSelectedModel(parseInt(e.target.value))}
                className="w-full md:w-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Upload Document
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select File (PDF or CSV, max 250MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.csv"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Documents will be processed in the background. Refresh the page to see updates.
                </p>
              </div>
            </div>

            {/* Documents List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Documents in {models.find(m => m.id === selectedModel)?.name}
                </h2>
              </div>

              {documents.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Filename
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {doc.filename}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {doc.file_type.toUpperCase()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(doc.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(doc.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleDelete(doc.id, doc.filename)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
