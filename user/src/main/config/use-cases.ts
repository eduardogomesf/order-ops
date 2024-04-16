import { type UseCases } from '@/presentation/interface/use-cases'
import { ENVS } from '@/shared'
import { generateCreateNewUserUseCase, generateUserLoginUseCase } from '../factory/use-case'
import { generateKafkaProducer } from '../factory/messaging'
import { generateMongoUserRepository } from '../factory/repository'
import { generateBcrypPasswordValidator, generateBcryptHashPassword, generateJwtTokenGenerator, generateSendEmailNotificationUtil } from '../factory/util'

export const getApplicationUseCases = async (): Promise<UseCases> => {
  // Repositories
  const userRepository = generateMongoUserRepository()

  // Utils
  const hashPassword = generateBcryptHashPassword()
  const passwordValidator = generateBcrypPasswordValidator()
  const jwtTokenGenerator = generateJwtTokenGenerator()

  // Message senders
  const newUserCreatedSender = await generateKafkaProducer(ENVS.KAFKA.TOPICS.USER.CREATED)
  const sendWelcomeNotification = await generateSendEmailNotificationUtil()

  // Use cases
  const createNewUser = generateCreateNewUserUseCase(
    userRepository,
    hashPassword,
    userRepository,
    newUserCreatedSender,
    sendWelcomeNotification
  )
  const userLogin = generateUserLoginUseCase(
    userRepository,
    passwordValidator,
    jwtTokenGenerator
  )

  return {
    createNewUser,
    userLogin
  }
}
