import { type GetFilesByAlbumIdRepository, type GetCurrentStorageUsageRepository, type GetCurrentStorageUsageRepositoryResponse, type SaveFileRepository } from '@/application/protocol/files'
import { File } from '@/domain/entity'
import { Logger } from '@/shared'
import { prisma } from '../client'
import { type GetFilesFilters } from '@/application/use-case'

const logger = new Logger('PrismaFileRepository')

export class PrismaFileRepository implements SaveFileRepository, GetCurrentStorageUsageRepository, GetFilesByAlbumIdRepository {
  async getManyWithFilters(albumId: string, filters: GetFilesFilters): Promise<File[]> {
    const limit = filters.limit
    const offset = (filters.page - 1) * filters.limit

    try {
      const files = await prisma.file.findMany({
        where: {
          albumId,
          isDeleted: false
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      })
      return files
        ? files.map(file => new File({
          ...file,
          size: Number(file.size)
        }))
        : []
    } catch (error) {
      logger.error(error.message)
      throw new Error(error)
    }
  }

  async save(file: File): Promise<void> {
    try {
      await prisma.file.create({
        data: {
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          encoding: file.encoding,
          extension: file.extension,
          albumId: file.albumId,
          isDeleted: file.isDeleted ?? false
        }
      })
    } catch (error) {
      logger.error(error.message)
      throw new Error(error)
    }
  }

  async getUsage(userId: string): Promise<GetCurrentStorageUsageRepositoryResponse> {
    const usage = await prisma.$executeRaw`
      SELECT SUM(size) as usage FROM "files" WHERE "album_id" IN (SELECT id FROM "albums" WHERE "user_id" = ${userId})
    `

    return {
      usage: usage || 0
    }
  }
}
