'use client'

import React from 'react'
import { Button } from '~/components/ui/button'
import { Archive } from 'lucide-react'
import { api } from '~/trpc/react'
import useProject from '~/hooks/use-project'
import { useRouter } from 'next/navigation'

const ArchiveButton: React.FC = () => {
  const router = useRouter()
  const { projectId, setProjectId } = useProject()
  const utils = api.useUtils()
  const archive = api.project.archiveProject.useMutation({
    onSuccess: async (_, { projectId }) => {
      // Invalidate projects list so archived project disappears
      await utils.project.getProjects.invalidate()
      // If the archived project is selected, clear it
      if (projectId) {
        setProjectId('')
      }
      router.refresh()
    }
  })

  const onClick = async () => {
    if (!projectId || !projectId.trim()) {
      window.alert('Please select a project from the sidebar first.')
      return
    }
    const ok = window.confirm('Archive this project? This hides it from your list. You can unarchive manually in the database for now.')
    if (!ok) return
    await archive.mutateAsync({ projectId })
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={archive.isPending} title="Archive project">
      <Archive className="mr-2 h-4 w-4" />
      {archive.isPending ? 'Archiving…' : 'Archive'}
    </Button>
  )
}

export default ArchiveButton
