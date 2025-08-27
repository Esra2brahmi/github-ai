'use client'
import MDEditor from '@uiw/react-md-editor'
import React from "react"
import Image from "next/image"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog"
import { Textarea } from "~/components/ui/textarea"
import useProject from "~/hooks/use-project"
import { askQuestion } from "./actions"
import { readStreamableValue } from "@ai-sdk/rsc"
import CodeReferences from './code-references'
import { api } from '~/trpc/react'
import { toast } from 'sonner'

const AskQuestionCard=()=>{
    const {project} = useProject()
    const [open, setOpen] = React.useState(false)
    const [question, setQuestion] = React.useState('')
    const [loading,setLoading] = React.useState(false)
    const [filesReferences,setFilesReferences]=React.useState<{fileName:string;sourceCode:string;summary:string}[]>([])
    const [answer,setAnswer]=React.useState('')
    const saveAnswer = api.project.saveAnswer.useMutation()

    const onSumbit=async (e:React.FormEvent<HTMLFormElement>)=>{
        setAnswer('')
        setFilesReferences([])
        e.preventDefault()
        if(!project?.id) return
        setLoading(true)
        const {output,filesReferences}=await askQuestion(question,project.id)
        setOpen(true)
        setFilesReferences(filesReferences)

        for await (const delta of readStreamableValue(output)){
            if(delta){
                setAnswer(ans => ans+delta)
            }
        }
        setLoading(false)
    }
    return (
        <>


        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[80vw] p-0 border-0 shadow-none bg-transparent">
                <div className='bg-white p-6 rounded-lg'>
                    <DialogHeader className='mb-4'>
                        <div className='flex items-center gap-2'>
                            <DialogTitle>
                            <Image src='/github-alt-svgrepo-com.svg' alt='dionysus' width={32} height={32}/>
                            </DialogTitle>
                            <Button disabled={saveAnswer.isPending} variant={'outline'} onClick={()=>{
                                saveAnswer.mutate({
                                    projectId:project!.id,
                                    question,
                                    answer,
                                    filesReferences
                                },{
                                    onSuccess:()=>{
                                        toast.success('Answer saved successfully')
                                    },
                                    onError:()=>{
                                        toast.error('Failed to save the answer!')
                                    }
                                })
                            }}>
                                Save Answer
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className='bg-white rounded-lg'>
                        <MDEditor.Markdown 
                            source={answer} 
                            className='w-full !h-full max-h-[40vh] overflow-auto prose dark:prose-invert prose-slate p-4'
                            style={{ 
                                background: 'transparent',
                                color: '#1e293b'
                            }}
                        />
                    </div>
                    <div className='mt-4'>
                        <CodeReferences filesReferences={filesReferences}/>
                    </div>
                    <div className='mt-6 flex justify-end'>
                        <Button 
                            type='button' 
                            variant='outline' 
                            onClick={()=>{setOpen(false);setAnswer('')}}
                            className='px-6'
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>         
        </Dialog>


       <Card className="relative col-span-3">
        <CardHeader>
            <CardTitle>Ask a question</CardTitle>
        </CardHeader>
        <CardContent>
            <form onSubmit={onSumbit}>
                <Textarea placeholder="which file should I edit to change the home page?" value={question} onChange={e=> setQuestion(e.target.value)}/>
                <div className="h-4"></div>
                <Button type="submit" disabled={loading}>
                    Ask Lupus
                </Button>
            </form>
        </CardContent>
       </Card>      
</>
)
}

export default AskQuestionCard