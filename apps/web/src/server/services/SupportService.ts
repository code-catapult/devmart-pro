import { prisma } from '~/lib/prisma'
import type { NoteCategory, Prisma } from '@prisma/client'

/**
 * SupportService
 *
 * Handles customer support note management for admin panel.
 * Responsibilities:
 * - Create support notes for users
 * - Retrieve note history with filtering
 * - Update existing notes
 * - Track note authors and timestamps
 */
export class SupportService {
  /**
   * Add a support note for a user
   *
   * @param data Note data (userId, adminId, category, content)
   * @returns Created support note with admin author details
   */
  async addNote(data: {
    userId: string
    adminId: string
    category: NoteCategory
    content: string
  }) {
    const note = await prisma.supportNote.create({
      data: {
        userId: data.userId,
        adminId: data.adminId,
        category: data.category,
        content: data.content,
      },
      // Include admin author details for display
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return note
  }

  /**
   * Get support notes for a user
   *
   * @param userId User ID
   * @param category Optional category filter
   * @returns Array of support notes ordered by creation date (newest first)
   */
  async getNotes(userId: string, category?: string) {
    const where: Prisma.SupportNoteWhereInput = {
      userId,
    }

    // Add category filter if specified and not "ALL"
    if (category && category !== 'ALL') {
      where.category = category as NoteCategory
    }

    const notes = await prisma.supportNote.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Newest first
      },
    })

    return notes
  }

  /**
   * Update an existing support note
   *
   * @param noteId Note ID
   * @param updates Updated content and/or category
   * @returns Updated note
   */
  async updateNote(
    noteId: string,
    updates: {
      content?: string
      category?: NoteCategory
    }
  ) {
    const note = await prisma.supportNote.update({
      where: { id: noteId },
      data: {
        ...(updates.content && { content: updates.content }),
        ...(updates.category && { category: updates.category }),
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return note
  }

  /**
   * Get note count by category for a user
   * Used for support note summary
   *
   * @param userId User ID
   * @returns Object with count per category
   */
  async getNoteSummary(userId: string) {
    const notes = await prisma.supportNote.findMany({
      where: { userId },
      select: {
        category: true,
      },
    })

    const summary = {
      total: notes.length,
      byCategory: {
        ISSUE: notes.filter((n) => n.category === 'ISSUE').length,
        RESOLUTION: notes.filter((n) => n.category === 'RESOLUTION').length,
        FOLLOW_UP: notes.filter((n) => n.category === 'FOLLOW_UP').length,
        GENERAL: notes.filter((n) => n.category === 'GENERAL').length,
      },
      lastNoteDate:
        notes.length > 0
          ? await prisma.supportNote
              .findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
              })
              .then((note) => note?.createdAt)
          : null,
    }

    return summary
  }

  /**
   * Search notes across all users (for admin search)
   *
   * @param searchTerm Search term for content
   * @param limit Maximum results
   * @returns Array of matching notes with user details
   */
  async searchNotes(searchTerm: string, limit: number = 50) {
    const notes = await prisma.supportNote.findMany({
      where: {
        content: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return notes
  }

  /**
   * Delete a support note
   *
   * @param noteId Note ID
   * @param adminId Admin requesting deletion (for authorization check)
   * @returns Deleted note
   */
  async deleteNote(noteId: string, adminId: string) {
    // Get note to check if admin is author
    const note = await prisma.supportNote.findUnique({
      where: { id: noteId },
      select: { adminId: true },
    })

    if (!note) {
      throw new Error('Note not found')
    }

    // Only allow deletion by original author
    if (note.adminId !== adminId) {
      throw new Error('Only the note author can delete this note')
    }

    return await prisma.supportNote.delete({
      where: { id: noteId },
    })
  }
}

export const supportService = new SupportService()
