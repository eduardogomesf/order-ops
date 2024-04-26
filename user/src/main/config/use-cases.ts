import { type UseCases } from '@/presentation/interface/use-cases'
import { ENVS } from '@/shared'
import { generateCreateNewUserUseCase, generateRefreshTokenUseCase, generateUserLoginUseCase } from '../factory/use-case'
import { generateKafkaProducer } from '../factory/messaging'
import { generateMongoRefreshTokenRepository, generateMongoUnpublishedMessagesRepository, generateMongoUserRepository } from '../factory/repository'
import {
  generateBcryptPasswordValidator,
  generateBcryptHashPassword,
  generateJwtTokenGenerator,
  generateSendEmailNotificationUtil,
  generateJwtTokenValidator
} from '../factory/util'
import { Subscriber } from '@/application/interface'

export const getApplicationUseCases = async (): Promise<UseCases> => {
  // Repositories
  const userRepository = generateMongoUserRepository()
  const unpublishedMessagesRepository = generateMongoUnpublishedMessagesRepository()
  const refreshTokenRepository = generateMongoRefreshTokenRepository()

  // Utils
  const hashPassword = generateBcryptHashPassword()
  const passwordValidator = generateBcryptPasswordValidator()
  const jwtTokenGenerator = generateJwtTokenGenerator()
  const refreshTokenGenerator = generateJwtTokenGenerator(
    ENVS.REFRESH_TOKEN.SECRET_KEY,
    ENVS.REFRESH_TOKEN.EXPIRATION_TIME
  )
  const refreshTokenValidator = generateJwtTokenValidator(ENVS.REFRESH_TOKEN.SECRET_KEY)

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
    jwtTokenGenerator,
    refreshTokenGenerator,
    refreshTokenRepository
  )
  const refreshToken = generateRefreshTokenUseCase(
    userRepository,
    jwtTokenGenerator,
    refreshTokenGenerator,
    refreshTokenRepository,
    refreshTokenRepository,
    refreshTokenValidator,
    refreshTokenRepository
  )

  // Subscribers
  const newUserCreatedSenderSubscriber = new Subscriber(
    'NewUserCreatedSendeer',
    newUserCreatedSender.send.bind(newUserCreatedSender)
  )
  createNewUser.addSubscriber(newUserCreatedSenderSubscriber)

  return {
    createNewUser,
    userLogin,
    refreshToken
  }
}
