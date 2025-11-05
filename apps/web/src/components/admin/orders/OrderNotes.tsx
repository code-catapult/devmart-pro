'use client'

import { useState } from 'react'
import { api } from '~/utils/api'
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Switch,
  Textarea,
} from '@repo/ui'

import { MessageSquare, Send, Loader2, Lock, Eye } from 'lucide-react'
import { formatDateTime } from '@repo/shared/utils'

interface OrderNotesProps {
  orderId: string
}

export function OrderNotes({ orderId }: OrderNotesProps) {
  const [noteContent, setNoteContent] = useState('')
  const [isInternal, setIsInternal] = useState(true)

  // Fetch notes
  const {
    data: notes,
    isLoading,
    error,
  } = api.admin.orders.getOrderNotes.useQuery({
    orderId,
  })

  // tRPC utilities
  const utils = api.useUtils()

  // Add note mutation
  const addNoteMutation = api.admin.orders.addOrderNote.useMutation({
    // Optimistic update
    onMutate: async (newNote) => {
      // Cancel outgoing refetches
      await utils.admin.orders.getOrderNotes.cancel({ orderId })

      // Snapshot previous value
      const previousNotes = utils.admin.orders.getOrderNotes.getData({
        orderId,
      })

      // Optimistically add new note
      utils.admin.orders.getOrderNotes.setData({ orderId }, (old) => {
        if (!old) return old

        return [
          ...old,
          {
            id: `temp-${Date.now()}`, // Temporary ID
            orderId,
            adminId: 'current-user', // Will be replaced by server
            admin: {
              id: 'current-user',
              name: 'You', // Placeholder
              email: '',
            },
            content: newNote.content,
            isInternal: newNote.isInternal ?? true,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as const,
        ]
      })

      return { previousNotes }
    },

    onError: (_err, _newNote, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        utils.admin.orders.getOrderNotes.setData(
          { orderId },
          context.previousNotes
        )
      }
    },

    onSettled: () => {
      // Always refetch to get real data
      void utils.admin.orders.getOrderNotes.invalidate({ orderId })
    },

    onSuccess: () => {
      // Clear form
      setNoteContent('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!noteContent.trim()) return

    addNoteMutation.mutate({
      orderId,
      content: noteContent.trim(),
      isInternal,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Order Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Note Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Add a note about this order..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={3}
            disabled={addNoteMutation.isPending}
          />

          <div className="flex items-center justify-between">
            {/* Internal/Customer-Visible Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="internal-toggle"
                checked={isInternal}
                onCheckedChange={setIsInternal}
                disabled={addNoteMutation.isPending}
              />
              <Label
                htmlFor="internal-toggle"
                className="flex items-center gap-2"
              >
                {isInternal ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Internal Note (Team Only)
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Customer-Visible
                  </>
                )}
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!noteContent.trim() || addNoteMutation.isPending}
              size="sm"
            >
              {addNoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Add Note
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {addNoteMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {addNoteMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
        </form>

        {/* Notes List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load notes: {error.message}
              </AlertDescription>
            </Alert>
          ) : !notes || notes.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-gray-500">
                No notes yet. Add the first note above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`rounded-lg border p-4 ${
                    note.isInternal
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  {/* Note Header */}
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-gray-700">
                        {note.admin.name}
                      </p>
                      <Badge
                        variant={note.isInternal ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {note.isInternal ? (
                          <>
                            <Lock className="mr-1 h-3 w-3" />
                            Internal
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1 h-3 w-3" />
                            Customer-Visible
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(note.createdAt)}
                    </p>
                  </div>

                  {/* Note Content */}
                  <p className="text-sm whitespace-pre-wrap text-gray-500">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
