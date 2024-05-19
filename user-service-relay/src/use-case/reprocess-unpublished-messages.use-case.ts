import { Logger } from '@/shared'
import {
  type UpdateUnpublishedMessageRepository,
  type DeleteUnpublishedMessageRepository,
  type GetPendingUnpublishedMessagesRepository,
  type MessageSender
} from './protocol'
import { type UnpublishedMessage } from '../entity'

export class ReprocessUnpublishedMessages {
  private readonly logger = new Logger(ReprocessUnpublishedMessages.name)

  constructor(
    private readonly getPendingUnpublishedMessagesRepository: GetPendingUnpublishedMessagesRepository,
    private readonly messageSender: MessageSender,
    private readonly deleteUnpublishedMessagesRepository: DeleteUnpublishedMessageRepository,
    private readonly updateUnpublishedMessagesRepository: UpdateUnpublishedMessageRepository
  ) {}

  async execute(): Promise<void> {
    this.logger.info('Reprocessing unpublished messages')

    const unpublishedMessages = await this.getPendingUnpublishedMessagesRepository.findAllPending()

    for (const unpublishedMessage of unpublishedMessages) {
      const { canContinue } = await this.verifyMessageIntegrity(unpublishedMessage)

      if (!canContinue) {
        continue
      }

      try {
        await this.messageSender.send(
          unpublishedMessage.data,
          unpublishedMessage.options
        )
        await this.deleteUnpublishedMessagesRepository.delete(unpublishedMessage.id)
      } catch (error) {
        this.logger.error(`Error processing message ${unpublishedMessage.id}`, error)
      }
    }
  }

  private async verifyMessageIntegrity(message: UnpublishedMessage): Promise<{ canContinue: boolean }> {
    if (!message.options.topic) {
      this.logger.error(`Message ${message.id} does not have a topic`)
      await this.updateUnpublishedMessagesRepository.update(
        {
          ...message,
          error: 'Message does not have a topic',
          hasError: true
        }
      )

      return { canContinue: false }
    } else if (!message.data) {
      this.logger.error(`Message ${message.id} does not have data`)
      await this.updateUnpublishedMessagesRepository.update(
        {
          ...message,
          error: 'Message does not have data',
          hasError: true
        }
      )

      return { canContinue: false }
    }

    return { canContinue: true }
  }
}
