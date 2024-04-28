import { DomainError, File } from '@/domain/entity'
import { AlbumStatus, FileStatus } from '@/domain/enum'
import { type UseCase, type UseCaseResponse } from '../../interface'
import {
  type SaveFileStorageService,
  type GetCurrentStorageUsageRepository,
  type SaveFileRepository
} from '../../protocol/files'
import { type GetAlbumByIdRepository } from '../../protocol'
import { ERROR_MESSAGES } from '../../constant'

export interface AddNewFileParams {
  name: string
  albumId: string
  size: number
  encoding: string
  type: string
  extension: string
  userId: string
  content: Buffer
}

export class AddNewFileUseCase implements UseCase {
  constructor(
    private readonly getCurrentStorageUsageRepository: GetCurrentStorageUsageRepository,
    private readonly saveFileStorageService: SaveFileStorageService,
    private readonly saveFileRepository: SaveFileRepository,
    private readonly getAlbumByIdRepository: GetAlbumByIdRepository
  ) {}

  async execute(params: AddNewFileParams): Promise<UseCaseResponse> {
    try {
      const album = await this.getAlbumByIdRepository.getById(params.albumId, params.userId)

      if (!album) {
        return {
          ok: false,
          message: ERROR_MESSAGES.ALBUM.NOT_FOUND
        }
      }

      if (album.status !== AlbumStatus.ACTIVE) {
        return {
          ok: false,
          message: ERROR_MESSAGES.ALBUM.DELETED_PLEASE_RESTORE
        }
      }

      const file = new File({
        name: params.name,
        status: FileStatus.ACTIVE,
        albumId: params.albumId,
        size: params.size,
        encoding: params.encoding,
        type: params.type,
        extension: params.extension
      })

      const isValidExtension = this.validateExtension(file.extension)

      if (!isValidExtension) {
        return {
          ok: false,
          message: 'Invalid extension'
        }
      }

      const isValidSize = this.validateSize(file.size)

      if (!isValidSize) {
        return {
          ok: false,
          message: 'The file is too large. Max 10MB'
        }
      }

      const canAddMoreFilesValidation = await this.canAddMoreFiles(params.userId, file.size)

      if (!canAddMoreFilesValidation.canAdd) {
        return {
          ok: false,
          message: `You don't have enough space. Free space: ${canAddMoreFilesValidation.freeSpace} bytes`
        }
      }

      await this.saveFileStorageService.save({
        fileId: file.id,
        name: file.name,
        content: params.content,
        encoding: file.encoding,
        type: file.type,
        userId: params.userId
      })

      await this.saveFileRepository.save(file)

      return {
        ok: true,
        data: file
      }
    } catch (error) {
      if (error instanceof DomainError) {
        return {
          ok: false,
          message: error.message
        }
      }

      throw error
    }
  }

  private async canAddMoreFiles(userId: string, size: number): Promise<{ freeSpace: number, canAdd: boolean }> {
    const { usage } = await this.getCurrentStorageUsageRepository.getUsage(userId)

    const maxStorageSize = 1024 * 1024 * 50 // 50MB

    const freeSpace = maxStorageSize - usage

    return {
      freeSpace,
      canAdd: freeSpace >= size
    }
  }

  private validateExtension(extension: string): boolean {
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4']

    return allowedExtensions.includes(extension)
  }

  private validateSize(size: number): boolean {
    const allowedSize = 1024 * 1024 * 10 // 10MB

    return size <= allowedSize
  }
}
