import { WebSocketServer } from 'ws'
import { verifyAccessToken } from '../../features/auth/auth.tokens.js'
import { cadenzaAuthRepository } from '../../apps/cadenza-client/features/auth/auth.repository.js'

const SOCKET_PATH = '/ws/cadenza-client/enrollments'
const clients = new Set()

const send = (socket, payload) => {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload))
}

const broadcastEnrollmentsChanged = () => {
  for (const client of clients) send(client, { type: 'enrollments-changed' })
}

const attachEnrollmentsSocket = (server) => {
  const socketServer = new WebSocketServer({ noServer: true })

  socketServer.on('connection', (socket) => {
    const timer = setTimeout(() => socket.close(4001, 'Authentication required'), 5000)
    timer.unref?.()
    socket.once('message', async (message) => {
      try {
        const payload = JSON.parse(message.toString())
        const claims = verifyAccessToken(payload?.type === 'authenticate' ? payload.token : null)
        const application = await cadenzaAuthRepository.findApplication()
        if (claims.type !== 'access' || !application || claims.appId !== application.id) throw new Error('Invalid access token')
        clearTimeout(timer)
        clients.add(socket)
        send(socket, { type: 'authenticated' })
      } catch {
        clearTimeout(timer)
        socket.close(4003, 'Authentication failed')
      }
    })
    socket.on('close', () => { clearTimeout(timer); clients.delete(socket) })
  })

  server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url, 'http://localhost')
    if (requestUrl.pathname !== SOCKET_PATH) return
    socketServer.handleUpgrade(request, socket, head, (client) => socketServer.emit('connection', client))
  })
}

export { attachEnrollmentsSocket, broadcastEnrollmentsChanged }
