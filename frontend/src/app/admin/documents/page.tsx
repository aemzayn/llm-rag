'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import api from '@/lib/api'
import { Model, Document, DocumentStatus } from '@/types'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, Trash2, FileText } from 'lucide-react'

function DocumentsContent() {
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
    const variants: Record<DocumentStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [DocumentStatus.UPLOADING]: 'secondary',
      [DocumentStatus.PROCESSING]: 'outline',
      [DocumentStatus.COMPLETED]: 'default',
      [DocumentStatus.FAILED]: 'destructive',
    }

    return <Badge variant={variants[status]}>{status}</Badge>
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage documents for your AI models</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : models.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                No models available. Create a model first.
              </p>
              <Button onClick={() => window.location.href = '/admin/models'}>
                Go to Models
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Model Selector */}
            <div className="space-y-2">
              <Label>Select Model</Label>
              <Select
                value={selectedModel?.toString() || ''}
                onValueChange={(value) => setSelectedModel(parseInt(value))}
              >
                <SelectTrigger className="w-full md:w-96">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select File (PDF or CSV, max 250MB)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.csv"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-md">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleUpload} disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Documents will be processed in the background. Refresh the page to see updates.
                </p>
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Documents in {models.find(m => m.id === selectedModel)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No documents uploaded yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.filename}</TableCell>
                          <TableCell>{doc.file_type.toUpperCase()}</TableCell>
                          <TableCell>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>{new Date(doc.created_at).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doc.id, doc.filename)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </AdminLayout>
    }>
      <DocumentsContent />
    </Suspense>
  )
}
