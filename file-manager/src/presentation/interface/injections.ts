import {
  type AddNewAlbumUseCase,
  type AddNewFileUseCase,
  type AddNewUserUseCase,
  type GetFilesByAlbumIdUseCase,
  type GetAlbumsUseCase,
  type MoveFilesToOtherAlbumUseCase,
  type DeleteFilesUseCase,
  type DeleteAlbumUseCase,
  type RestoreAlbumUseCase,
  type GetAvailableStorageUseCase
} from '@/application/use-case'
import { type Consumer } from 'kafkajs'

export interface UseCases {
  addNewUserUseCase: AddNewUserUseCase
  addNewFileUseCase: AddNewFileUseCase
  addNewAlbumUseCase: AddNewAlbumUseCase
  getAlbumsUseCase: GetAlbumsUseCase
  getFilesByAlbumIdUseCase: GetFilesByAlbumIdUseCase
  moveFilesToOtherAlbumUseCase: MoveFilesToOtherAlbumUseCase
  deleteFileUseCase: DeleteFilesUseCase
  deleteAlbumUseCase: DeleteAlbumUseCase
  restoreAlbumUseCase: RestoreAlbumUseCase
  getAvailableStorageUseCase: GetAvailableStorageUseCase
}

export interface Injections extends UseCases {
  addNewUseKafkaConsumer: Consumer
}
