'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import api from '@/lib/api'
import { Model, LLMProvider } from '@/types'
import toast from 'react-hot-toast'

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    llm_provider: LLMProvider.OLLAMA,
    llm_model_name: 'llama2',
    api_key: '',
    api_base_url: '',
  })

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

    try {
      await api.post('/api/models', {
        ...formData,
        user_ids: [],
      })

      toast.success('Model created successfully')
      setShowCreateModal(false)
      setFormData({
        name: '',
        description: '',
        llm_provider: LLMProvider.OLLAMA,
        llm_model_name: 'llama2',
        api_key: '',
        api_base_url: '',
      })
      loadModels()
    } catch (error: any) {
      console.error('Failed to create model:', error)
      toast.error(error.response?.data?.detail || 'Failed to create model')
    }
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

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Models
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ➕ Create Model
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : models.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No models created yet
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Model
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => (
              <div
                key={model.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {model.name}
                  </h3>
                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    {model.llm_provider}
                  </span>
                </div>

                {model.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {model.description}
                  </p>
                )}

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Model:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {model.llm_model_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Created:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(model.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      window.location.href = `/admin/documents?model_id=${model.id}`
                    }}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    📄 Documents
                  </button>
                  <button
                    onClick={() => handleDelete(model.id, model.name)}
                    className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Create New Model
              </h2>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Customer Support Bot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="Brief description of this model's purpose"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    LLM Provider *
                  </label>
                  <select
                    value={formData.llm_provider}
                    onChange={(e) => setFormData({ ...formData, llm_provider: e.target.value as LLMProvider })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={LLMProvider.OLLAMA}>Ollama (Local)</option>
                    <option value={LLMProvider.OPENAI}>OpenAI</option>
                    <option value={LLMProvider.ANTHROPIC}>Anthropic Claude</option>
                    <option value={LLMProvider.CUSTOM}>Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.llm_model_name}
                    onChange={(e) => setFormData({ ...formData, llm_model_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., llama2, gpt-4, claude-3-opus"
                  />
                </div>

                {formData.llm_provider !== LLMProvider.OLLAMA && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Your API key (will be encrypted)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        API Base URL (optional)
                      </label>
                      <input
                        type="url"
                        value={formData.api_base_url}
                        onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Model
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
