'use client'

import React from 'react'
import useProject from '~/hooks/use-project'
import MeetingCard from '../dashboard/meeting-card'
import { api, type RouterOutputs } from '~/trpc/react'
import { Card } from '~/components/ui/card'
import { Button } from '~/components/ui/button'

type Meeting = RouterOutputs['project']['getMeetings'][number]

export default function MeetingsPage(){
  const { projectId, project } = useProject()
  const { data: meetings, refetch, isLoading } = api.project.getMeetings.useQuery(
    { projectId: projectId || '' },
    { enabled: Boolean(projectId && projectId.trim()) }
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meetings {project?.name ? `• ${project.name}` : ''}</h1>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload card */}
        <MeetingCard />

        {/* Meetings list */}
        <div className="md:col-span-2 space-y-4">
          {(!projectId || !projectId.trim()) && (
            <Card className="p-4">
              <p className="text-sm text-gray-600">Select a project from the sidebar to view its meetings.</p>
            </Card>
          )}

          {projectId && meetings?.length === 0 && (
            <Card className="p-4">
              <p className="text-sm text-gray-600">No meetings uploaded yet for this project.</p>
            </Card>
          )}

          {projectId && meetings?.map((m: Meeting) => (
            <Card key={m.id} className="p-4 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{m.fileName}</p>
                  <span className="text-xs text-gray-500">{
                    m.createdAt instanceof Date
                      ? m.createdAt.toLocaleString()
                      : new Date(m.createdAt as unknown as string).toLocaleString()
                  }</span>
                </div>
                <audio controls src={m.url} className="mt-2 w-full" />
              </div>
              <a href={m.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Open</a>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
