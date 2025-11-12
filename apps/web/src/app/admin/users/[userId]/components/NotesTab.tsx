'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Send } from 'lucide-react'
import { api } from '~/utils/api'
import type { SupportNoteItem } from '@repo/shared/types'

/**
 * NotesTab Component
 *
 * Displays support notes with inline creation form.
 *
 * FEATURES:
 * - Reverse chronological order (newest first)
 * - Inline note creation with category selection
 * - Optimistic UI (show note immediately, revert if fails)
 * - Character count (1000 char max) for note creation
 * - Admin attribution for each note
 * - Category-based color coding (ISSUE=red, RESOLUTION=green, FOLLOW_UP=yellow, GENERAL=gray)
 * - Keyboard shortcut (Cmd/Ctrl+Enter) to submit
 *
 * MOBILE OPTIMIZATIONS:
 * - Category buttons with 44px touch targets, wrap to multiple rows
 * - Submit button and character count stack vertically
 * - Full-width button on mobile
 * - Smaller text sizing throughout
 * - Notes use break-words for long content
 * - Reduced padding (p-3 vs p-4)
 */

interface NotesTabProps {
  userId: string
  initialNotes: SupportNoteItem[]
}

export function NotesTab({ userId, initialNotes }: NotesTabProps) {
  const [notes, setNotes] = useState<SupportNoteItem[]>(initialNotes)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState<
    'ISSUE' | 'RESOLUTION' | 'FOLLOW_UP' | 'GENERAL'
  >('GENERAL')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ============================================
  // tRPC MUTATION
  // ============================================

  const addNoteMutation = api.admin.userManagement.addSupportNote.useMutation()

  // ============================================
  // ADD NOTE HANDLER (with Optimistic UI)
  // ============================================

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return

    const tempNote: SupportNoteItem = {
      id: `temp-${Date.now()}`,
      content: newNoteContent.trim(),
      adminId: 'temp',
      category: noteCategory,
      adminName: 'You', // Will be replaced with real admin name from server
      createdAt: new Date(),
    }

    // Optimistically add note to UI
    setNotes([tempNote, ...notes])
    setNewNoteContent('')
    setIsSubmitting(true)

    try {
      // Call server
      const savedNote = await addNoteMutation.mutateAsync({
        userId,
        category: noteCategory,
        content: newNoteContent.trim(),
      })

      // Replace temp note with real note from server
      const mappedNote: SupportNoteItem = {
        id: savedNote.id,
        content: savedNote.content,
        adminId: savedNote.adminId,
        category: savedNote.category,
        adminName: savedNote.admin.name ?? savedNote.admin.email,
        createdAt: savedNote.createdAt,
      }

      setNotes((prev) =>
        prev.map((note) => (note.id === tempNote.id ? mappedNote : note))
      )
    } catch {
      // Revert optimistic update on error
      setNotes((prev) => prev.filter((note) => note.id !== tempNote.id))
      alert('Failed to add note. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // KEYBOARD HANDLER
  // ============================================

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleAddNote()
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            Support Notes
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 shrink-0">
          {notes.length} notes
        </p>
      </div>

      {/* ============================================ */}
      {/* ADD NOTE FORM */}
      {/* ============================================ */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
        <label
          htmlFor="new-note"
          className="block text-sm font-medium text-gray-700"
        >
          Add a support note
        </label>

        {/* Category Selection */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(['GENERAL', 'ISSUE', 'RESOLUTION', 'FOLLOW_UP'] as const).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setNoteCategory(cat)}
                className={`
                rounded-md px-3 py-2 text-xs font-medium
                transition-colors min-h-[44px] sm:min-h-0 sm:py-1.5
                ${
                  noteCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }
              `}
              >
                {cat.replace('_', ' ')}
              </button>
            )
          )}
        </div>

        <textarea
          id="new-note"
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Document customer interactions, issues, resolutions..."
          rows={4}
          className="
            mt-3 block w-full rounded-lg border border-gray-300 bg-white
            px-3 py-2.5 sm:px-4 sm:py-3
            text-sm text-gray-900 placeholder-gray-500
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20
            disabled:cursor-not-allowed disabled:bg-gray-100
          "
          disabled={isSubmitting}
          maxLength={1000}
        />

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] sm:text-xs text-gray-500 order-2 sm:order-1">
            <span className="block sm:inline">
              {newNoteContent.length}/1000 characters
            </span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline text-[10px]">
              Press Cmd+Enter to submit
            </span>
          </p>
          <button
            onClick={handleAddNote}
            disabled={!newNoteContent.trim() || isSubmitting}
            className="
              inline-flex items-center justify-center gap-2
              rounded-lg bg-blue-600 px-4 py-2.5 sm:py-2
              text-sm font-medium text-white
              hover:bg-blue-700
              disabled:cursor-not-allowed disabled:opacity-50
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              min-h-[44px] order-1 sm:order-2
            "
          >
            <Send className="h-4 w-4 shrink-0" />
            {isSubmitting ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* NOTES LIST */}
      {/* ============================================ */}
      {notes.length === 0 ? (
        <div className="flex min-h-[150px] sm:min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
          <p className="text-sm text-gray-600 px-4 text-center">
            No support notes yet
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`
                rounded-lg border border-gray-200 bg-white p-3 sm:p-4
                ${note.id.startsWith('temp-') ? 'opacity-60' : ''}
              `}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`
                    inline-block rounded-md px-2 py-0.5 text-xs font-medium
                    ${
                      note.category === 'ISSUE'
                        ? 'bg-red-100 text-red-800'
                        : note.category === 'RESOLUTION'
                          ? 'bg-green-100 text-green-800'
                          : note.category === 'FOLLOW_UP'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                    }
                  `}
                >
                  {note.category.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-900 whitespace-pre-wrap break-words">
                {note.content}
              </p>
              <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
                <span className="font-medium">{note.adminName}</span>
                <span className="hidden sm:inline">•</span>
                <span className="text-[10px] sm:text-xs">
                  {formatDistanceToNow(new Date(note.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
