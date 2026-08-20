import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'

type MessageHandler<T> = (payload: T) => void

class WebSocketService {
  private client: Client | null = null
  private subscriptions = new Map<string, StompSubscription>()
  /** Destinations requested before CONNECTED arrived; replayed on connect. */
  private pending = new Map<string, MessageHandler<unknown>>()

  connect(token: string, userName: string): void {
    if (this.client?.active) return

    this.client = new Client({
      brokerURL: import.meta.env.VITE_MESSAGE_URL,

      // Sent as native headers on the STOMP CONNECT frame.
      connectHeaders: { Authorization: `Bearer ${token}`, 'User-Name': userName },

      reconnectDelay: 5000, // 0 disables automatic reconnect
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      debug: import.meta.env.VITE_APP_DEV_MODE ? (msg) => console.log('[STOMP]', msg) : () => {},

      onConnect: () => {
        // A reconnect creates a brand-new session on the server, so every
        // subscription must be re-created. This is NOT automatic.
        this.pending.forEach((handler, destination) => {
          this.doSubscribe(destination, handler)
        })
      },

      onStompError: (frame) => {
        console.error('Broker error:', frame.headers['message'], frame.body)
      },
    })

    this.client.activate()
  }

  subscribe<T>(destination: string, handler: MessageHandler<T>): void {
    this.pending.set(destination, handler as MessageHandler<unknown>)
    if (this.client?.connected) {
      this.doSubscribe(destination, handler as MessageHandler<unknown>)
    }
  }

  private doSubscribe(destination: string, handler: MessageHandler<unknown>): void {
    this.subscriptions.get(destination)?.unsubscribe()
    const sub = this.client!.subscribe(destination, (message: IMessage) => {
      handler(JSON.parse(message.body))
    })
    this.subscriptions.set(destination, sub)
  }

  publish(destination: string, body: unknown): void {
    if (!this.client?.connected) {
      console.warn('Cannot publish, socket is not connected:', destination)
      return
    }
    this.client.publish({ destination, body: JSON.stringify(body) })
  }

  async disconnect(): Promise<void> {
    this.subscriptions.forEach((s) => s.unsubscribe())
    this.subscriptions.clear()
    this.pending.clear()
    await this.client?.deactivate()
    this.client = null
  }
}

export const websocket = new WebSocketService()
