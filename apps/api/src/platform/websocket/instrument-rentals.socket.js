import { WebSocketServer } from 'ws'

import { verifyAccessToken } from '../../features/auth/auth.tokens.js'

const SOCKET_PATH = '/ws/cadenza-client/instrument-rentals'
const clients = new Set()

const send = (socket, payload) => {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload))
  }
}

const broadcastInstrumentRentalsChanged = () => {
  for (const client of clients) {
    send(client, { type: 'instrument-rentals-changed' })
  }
}

const attachInstrumentRentalsSocket = (server) => {
  const socketServer = new WebSocketServer({ noServer: true })

  socketServer.on('connection', (socket) => {
    const authenticationTimer = setTimeout(() => socket.close(4001, 'Authentication required'), 5000)
    authenticationTimer.unref?.()

    socket.once('message', (message) => {
      try {
        const payload = JSON.parse(message.toString())
        const token = payload?.type === 'authenticate' ? payload.token : null
        const claims = verifyAccessToken(token)

        if (claims.type !== 'access') throw new Error('Invalid access token')

        clearTimeout(authenticationTimer)
        clients.add(socket)
        send(socket, { type: 'authenticated' })
      } catch {
        clearTimeout(authenticationTimer)
        socket.close(4003, 'Authentication failed')
      }
    })

    socket.on('close', () => {
      clearTimeout(authenticationTimer)
      clients.delete(socket)
    })
  })

  server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url, 'http://localhost')
    if (requestUrl.pathname !== SOCKET_PATH) {
      socket.destroy()
      return
    }

    socketServer.handleUpgrade(request, socket, head, (client) => {
      socketServer.emit('connection', client, request)
    })
  })
}

export {
  SOCKET_PATH,
  attachInstrumentRentalsSocket,
  broadcastInstrumentRentalsChanged,
}
