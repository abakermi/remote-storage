import fetch from 'cross-fetch'
import { isWeb, uuid } from './utils'
import { HEADER_REMOTE_STORAGE_INSTANCE_ID, HEADER_REMOTE_STORAGE_USER_ID } from './constants'

const apiPrefix = `/entities/`

interface RemoteStorageConfig {
  /**
   * The server address to use for remote storage. Defaults to https://rs.frigade.com
   */
  serverAddress?: string
  /**
   * The user ID to use for remote storage. Defaults to a random UUID if not provided.
   */
  userId?: string
  /**
   * The instance ID to use for remote storage. Defaults to "default"
   * Instance IDs are used to create a distinct namespace for your application and should not change for the same application.
   */
  instanceId?: string
}

export class RemoteStorage {
  private readonly serverAddress: string
  private readonly instanceId: string
  private readonly userId: string

  constructor(config?: RemoteStorageConfig) {
    const { serverAddress, instanceId, userId } = config ?? {}
    this.serverAddress = serverAddress ?? 'https://api.remote.storage'
    this.instanceId = instanceId ?? 'default'
    this.userId = userId ?? this.getUserId()
  }

  /**
   * Get an item from remote storage
   * @param key the key that corresponds to the item to get
   * @param fetchOptions optional fetch options to pass to the underlying fetch call. Currently only headers for authorization are supported.
   */
  async getItem<T>(key: string, fetchOptions?: any): Promise<T> {
    const response = await this.call('GET', `${apiPrefix}${key}`, fetchOptions, null)
    // Check for 404 and return null if so
    if (response.status === 404) {
      return null
    }
    const data = await response.text()
    // Check if valid JSON
    if (!data.startsWith('{')) {
      if (data === 'true') {
        return true as unknown as T
      }
      if (data === 'false') {
        return false as unknown as T
      }
      if (!isNaN(Number(data))) {
        return Number(data) as unknown as T
      }

      return data as T
    }
    return JSON.parse(data) as T
  }

  /**
   * Set an item in remote storage
   * @param key the key that corresponds to the item to set
   * @param value the value to set
   * @param fetchOptions optional fetch options to pass to the underlying fetch call. Currently only headers for authorization are supported.
   */
  async setItem<T>(key: string, value: T, fetchOptions?: any): Promise<void> {
    await this.call('PUT', `${apiPrefix}${key}`, fetchOptions, value)
  }

  /**
   * Remove an item from remote storage
   * @param key the key that corresponds to the item to remove
   * @param fetchOptions optional fetch options to pass to the underlying fetch call. Currently only headers for authorization are supported.
   */
  async removeItem(key: string, fetchOptions?: any): Promise<void> {
    await this.call('DELETE', `${apiPrefix}${key}`, fetchOptions, null)
  }

  async call(method: string, path: string, options?: any, data?: any) {
    return fetch(new URL(path, this.serverAddress).toString(), {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        [HEADER_REMOTE_STORAGE_INSTANCE_ID]: this.instanceId,
        [HEADER_REMOTE_STORAGE_USER_ID]: this.userId,
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  private getUserId(): string | null {
    const key = `rs-user-id`
    if (isWeb()) {
      if (window.localStorage.getItem(key)) {
        return window.localStorage.getItem(key)
      }
    }
    const userId = uuid()
    if (isWeb()) {
      window.localStorage.setItem(key, userId)
    }
    return userId
  }
}
