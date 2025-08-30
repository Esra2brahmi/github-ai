'use client'
import { Presentation, Upload } from 'lucide-react'
import { CircularProgressbar } from 'react-circular-progressbar'
import React from 'react' 
import { useDropzone } from 'react-dropzone'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { uploadFile } from '~/lib/supabase'

const MeetingCard =() => {
    const [isUploading,setIsUploading]=React.useState(false)
    const [progress,setProgress]=React.useState(0)
    const {getRootProps,getInputProps}=useDropzone({
        accept:{
            'audio/*':['.mp3','.wav','.m4a']
        },
        multiple:false,
        maxSize:50_000_000,
        onDrop: async acceptedFiles => {
            setIsUploading(true)
            setProgress(0)
            try {
                const file = acceptedFiles[0]
                if (!file) {
                    throw new Error('No file selected')
                }
                
                // Log file details
                console.log('File to be uploaded:', {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    lastModified: new Date(file.lastModified).toISOString(),
                    isFile: file instanceof File,
                    isBlob: file instanceof Blob
                });
                // Upload to 'meetings' bucket in Supabase
                const downloadURL = await uploadFile(
                    file,
                    'meetings',
                    undefined,
                    (progress: number) => {
                        setProgress(progress)
                    }
                )
                window.alert(`File uploaded successfully: ${downloadURL}`)
            } catch (error) {
                console.error('Error uploading file:', error)
                window.alert(error instanceof Error ? error.message : 'Failed to upload file. Please try again.')
            } finally {
                setIsUploading(false)
            }
        }
    
    })
    return (
        <Card className="col-span-2 flex flex-col items-center justify-center p-10" {...getRootProps()}>
            {!isUploading && (
                <>
                  <Presentation className="h-10 w-10 animate-bounce"/>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    Create a new meeting
                  </h3>
                  <p className="mt-1 text-center text-sm text-gray-500">
                    Analyse your meeting with Lupus 
                    <br/>
                    Powered by AI 
                  </p>
                  <div className="mt-6">
                    <Button disabled={isUploading}>
                        <Upload className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true"/>
                        Upload Meeting
                        <input className="hidden" {...getInputProps()}/>
                    </Button>
                  </div>
                    
                </>
            )}
            {isUploading && (
                <div className='flex items-center justify-center'>
                    <CircularProgressbar value={progress}  text={`${progress}%`} className='size-20'/>
                    <p className="text-sm text-gray-500 text-center">Uploading your meeting...</p>
                </div>
            )}

        </Card>
    )
}

export default MeetingCard