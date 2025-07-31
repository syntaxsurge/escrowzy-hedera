import { MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ChatPage() {
  return (
    <div className='bg-muted/5 flex h-full items-center justify-center'>
      <div className='space-y-4 text-center'>
        <MessageSquare className='text-muted-foreground/50 mx-auto h-16 w-16' />
        <div>
          <h2 className='text-2xl font-semibold'>Welcome to Chat</h2>
          <p className='text-muted-foreground mt-2'>
            Select a team or team member to start chatting
          </p>
        </div>
      </div>
    </div>
  )
}
