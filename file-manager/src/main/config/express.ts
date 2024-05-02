import * as express from 'express'
import * as cors from 'cors'

import { ENVS, Logger } from '@/shared'
import { type UseCases } from '@/presentation/interface/injections'
import { getAlbumRouter, getFileRouter } from '@/presentation/rest/route'
import { logger } from '@/presentation/rest/middleware'

function setDefaultMiddlewares(app: express.Express) {
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cors())
  app.use(logger)
}

function setDefaultRoutes(app: express.Express) {
  app.get('/', (req, res) => {
    res.send('Up and running!')
  })
}

function setRoutes(app: express.Express, useCases: UseCases) {
  const fileRouter = getFileRouter(useCases)
  const albumRouter = getAlbumRouter(useCases)

  app.use(fileRouter)
  app.use(albumRouter)
}

export function bootstrapExpressServer(useCases: UseCases) {
  const logger = new Logger('bootstrapExpressServer')

  const app = express()

  setDefaultMiddlewares(app)
  setDefaultRoutes(app)
  setRoutes(app, useCases)

  const port = ENVS.APP.PORT

  app.listen(port, () => {
    logger.info(`App listening at port ${port}`)
  })
}
