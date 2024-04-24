import { type UseCases } from '@/presentation/interface/use-cases'
import { ENVS } from '@/shared'
import { generateCreateNewUserUseCase, generateUserLoginUseCase } from '../factory/use-case'
import { generateKafkaProducer } from '../factory/messaging'
import { generateMongoUnpublishedMessagesRepository, generateMongoUserRepository } from '../factory/repository'
import {
  generateBcryptPasswordValidator,
  generateBcryptHashPassword,
  generateJwtTokenGenerator,
  generateSendEmailNotificationUtil
} from '../factory/util'
import { Subscriber } from '@/application/interface'

export const getApplicationUseCases = async (): Promise<UseCases> => {
  // Repositories
  const userRepository = generateMongoUserRepository()
  const unpublishedMessagesRepository = generateMongoUnpublishedMessagesRepository()

  // Utils
  const hashPassword = generateBcryptHashPassword()
  const passwordValidator = generateBcryptPasswordValidator()
  const jwtTokenGenerator = generateJwtTokenGenerator()

  // Message senders
  const newUserCreatedSender = await generateKafkaProducer(
    ENVS.KAFKA.TOPICS.USER.CREATED,
    unpublishedMessagesRepository
  )
  const sendWelcomeNotification = await generateSendEmailNotificationUtil(
    unpublishedMessagesRepository
  )

  // Use cases
  const createNewUser = generateCreateNewUserUseCase(
    userRepository,
    hashPassword,
    userRepository,
    sendWelcomeNotification
  )
  const userLogin = generateUserLoginUseCase(
    userRepository,
    passwordValidator,
    jwtTokenGenerator
  )

  // Subscribers
  // Subscribers
  const newUserCreatedSenderSubscriber = new Subscriber(
    'NewUserCreatedSendeer',
    newUserCreatedSender.send.bind(newUserCreatedSender)
  )

  createNewUser.addSubscriber(newUserCreatedSenderSubscriber)

  return {
    createNewUser,
    userLogin
  }
}
