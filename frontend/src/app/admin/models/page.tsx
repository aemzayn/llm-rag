'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import api from '@/lib/api'
import { Model, LLMProvider } from '@/types'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, FileText, Trash2, Pencil } from 'lucide-react'

interface ModelFormData {
  name: string
  description: string
  llm_provider: LLMProvider
  llm_model_name: string
  api_key: string
  api_base_url: string
}

const initialFormData: ModelFormData = {
  name: '',
  description: '',
  llm_provider: LLMProvider.OLLAMA,
  llm_model_name: 'llama2',
  api_key: '',
  api_base_url: '',
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [formData, setFormData] = useState<ModelFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const response = await api.get('/api/models')
      setModels(response.data)
    } catch (error) {
      console.error('Failed to load models:', error)
      toast.error('Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await api.post('/api/models', {
        ...formData,
        user_ids: [],
      })

      toast.success('Model created successfully')
      setShowCreateModal(false)
      setFormData(initialFormData)
      loadModels()
    } catch (error: any) {
      console.error('Failed to create model:', error)
      toast.error(error.response?.data?.detail || 'Failed to create model')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingModel) return
    setSubmitting(true)

    try {
      await api.put(`/api/models/${editingModel.id}`, {
        name: formData.name,
        description: formData.description,
        llm_provider: formData.llm_provider,
        llm_model_name: formData.llm_model_name,
        api_key: formData.api_key || undefined,
        api_base_url: formData.api_base_url || undefined,
      })

      toast.success('Model updated successfully')
      setShowEditModal(false)
      setEditingModel(null)
      setFormData(initialFormData)
      loadModels()
    } catch (error: any) {
      console.error('Failed to update model:', error)
      toast.error(error.response?.data?.detail || 'Failed to update model')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (model: Model) => {
    setEditingModel(model)
    setFormData({
      name: model.name,
      description: model.description || '',
      llm_provider: model.llm_provider,
      llm_model_name: model.llm_model_name,
      api_key: '',
      api_base_url: '',
    })
    setShowEditModal(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete model "${name}"? This will also delete all associated documents.`)) {
      return
    }

    try {
      await api.delete(`/api/models/${id}`)
      toast.success('Model deleted')
      loadModels()
    } catch (error) {
      console.error('Failed to delete model:', error)
      toast.error('Failed to delete model')
    }
  }

  const ModelForm = ({ onSubmit, submitText }: { onSubmit: (e: React.FormEvent) => void; submitText: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Model Name *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Customer Support Bot"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this model's purpose"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>LLM Provider *</Label>
        <Select
          value={formData.llm_provider}
          onValueChange={(value) => setFormData({ ...formData, llm_provider: value as LLMProvider })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LLMProvider.OLLAMA}>Ollama (Local)</SelectItem>
            <SelectItem value={LLMProvider.OPENAI}>OpenAI</SelectItem>
            <SelectItem value={LLMProvider.ANTHROPIC}>Anthropic Claude</SelectItem>
            <SelectItem value={LLMProvider.CUSTOM}>Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="llm_model_name">Model Name *</Label>
        <Input
          id="llm_model_name"
          required
          value={formData.llm_model_name}
          onChange={(e) => setFormData({ ...formData, llm_model_name: e.target.value })}
          placeholder="e.g., llama2, gpt-4, claude-3-opus"
        />
      </div>

      {formData.llm_provider !== LLMProvider.OLLAMA && (
        <>
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key</Label>
            <Input
              id="api_key"
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder="Your API key (will be encrypted)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_base_url">API Base URL (optional)</Label>
            <Input
              id="api_base_url"
              type="url"
              value={formData.api_base_url}
              onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </div>
        </>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            setEditingModel(null)
            setFormData(initialFormData)
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitText}
        </Button>
      </DialogFooter>
    </form>
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI Models</h1>
            <p className="text-muted-foreground mt-1">Manage your AI models and configurations</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Model
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : models.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                No models created yet
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create Your First Model
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
              <Card key={model.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    <Badge variant="secondary">{model.llm_provider}</Badge>
                  </div>
                  {model.description && (
                    <CardDescription>{model.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-medium">{model.llm_model_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(model.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.location.href = `/admin/documents?model_id=${model.id}`}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Documents
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(model)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(model.id, model.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Model</DialogTitle>
              <DialogDescription>
                Configure a new AI model for your chatbot
              </DialogDescription>
            </DialogHeader>
            <ModelForm onSubmit={handleCreate} submitText="Create Model" />
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={(open) => {
          setShowEditModal(open)
          if (!open) {
            setEditingModel(null)
            setFormData(initialFormData)
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Model</DialogTitle>
              <DialogDescription>
                Update the model configuration
              </DialogDescription>
            </DialogHeader>
            <ModelForm onSubmit={handleEdit} submitText="Save Changes" />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
