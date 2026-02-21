import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { FileRecord, FileCategory } from '@/types'

export function useFileUpload(projectId: string) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (
      file: File,
      checklistItemId?: string,
      category: FileCategory = 'upload'
    ): Promise<FileRecord> => {
      if (!user) throw new Error('Not authenticated')
      if (!projectId) throw new Error('Project ID is required')

      setUploading(true)
      setError(null)

      try {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = `${projectId}/${timestamp}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('onboardly-files')
          .upload(filePath, file)
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('onboardly-files')
          .getPublicUrl(filePath)

        const { data: fileRecord, error: insertError } = await supabase
          .from('files')
          .insert({
            project_id: projectId,
            checklist_item_id: checklistItemId ?? null,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type || null,
            uploaded_by: user.id,
            category,
          })
          .select()
          .single()

        if (insertError) throw insertError
        return fileRecord as FileRecord
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setError(message)
        throw err
      } finally {
        setUploading(false)
      }
    },
    [projectId, user]
  )

  return { upload, uploading, error }
}

export function useProjectFiles(projectId: string) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFiles = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setFiles(data ?? [])
    } catch (err) {
      console.error('Failed to fetch files:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  return { files, loading, refetch: fetchFiles }
}
