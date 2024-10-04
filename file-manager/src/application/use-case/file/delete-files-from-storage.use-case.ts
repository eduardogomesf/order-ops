import { ENVS, Logger } from '@/shared'
import {
  type UseCaseResponse,
  type UseCase,
  type DeleteFileFromStorageUseCaseParams
} from '../../interface'
import {
  DeleteFilesFromStorageService,
  MessageSender
} from '../../protocol'

export class DeleteFilesFromStorageUseCase implements UseCase {
  private logger = new Logger(DeleteFilesFromStorageUseCase.name)

  constructor(
    private readonly deleteFilesFromStorageService: DeleteFilesFromStorageService,
    private readonly deleteFilesFromStorageSender: MessageSender,
  ) {}

  async execute(params: DeleteFileFromStorageUseCaseParams): Promise<UseCaseResponse<null>> {
    const groups = this.separateFilesIntoGroups(params.filesIds)

    this.logger.info(
      `Number of files groups to delete: ${groups.length.toString()}`, 
      params.id
    )

    let counter = 0

    for (const filesGroup of groups) {
      if(params.retryCount && params.retryCount > 3) {
        this.logger.info('FilesIds ')
      }

      this.logger.verbose(`Starting deletion of group ${counter}...`, params.id)

      const wasDeleted = await this.deleteFilesFromStorageService.deleteMany(
        params.filesIds,
        params.userId
      )

      if (!wasDeleted) {
        this.logger.verbose(`Deletion of group ${counter} was not successful. A retry will be performed.`, params.id) 
        this.logger.verbose(`filesIds of ${JSON.stringify(filesGroup)} of group ${counter}`, params.id)

        const newMessage = { ...params }
        
        newMessage.filesIds = [...filesGroup]
        newMessage.lastAttempt = new Date().toString()
        newMessage.retryCount = newMessage.retryCount ? newMessage.retryCount + 1 : 1
  
        setTimeout(async () => {
          this.logger.verbose(`Publishing retry message of group ${counter}...`, params.id) 
          await this.deleteFilesFromStorageSender.send(newMessage)
        }, ENVS.KAFKA.RETRY_TIMEOUT.DELETE_MANY_FILES)
      } else {
        this.logger.verbose(`Deletion of group ${counter} finished successfully`, params.id)
      }

      counter++
    }

    return {
      ok: true
    }
  }

  private separateFilesIntoGroups(filesIds: string[]) {
    const groups = [] as string[][]

    filesIds.forEach((id, index) => {
      const groupIndex = Math.floor(index / 10)

      let group = groups[groupIndex]

      if(!group?.length) {
        group = []
        groups[groupIndex] = group
      }

      group.push(id)
    })

    return groups
  }
}
