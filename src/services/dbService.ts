// IndexedDB service for Tråkke PWA
// Manages offline data storage for user preferences and cached data

const DB_NAME = 'trakke-db'
const DB_VERSION = 3
const STORE_NAME = 'userData'
const TILES_STORE = 'offlineTiles'
const AREAS_STORE = 'downloadedAreas'
const ROUTES_STORE = 'routes'
const WAYPOINTS_STORE = 'waypoints'
const PROJECTS_STORE = 'projects'

class DatabaseService {
  private db: IDBDatabase | null = null

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message || 'Unknown error'}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB initialized successfully')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion

        // Create userData store (v1)
        if (oldVersion < 1 && !db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          })

          store.createIndex('type', 'type', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })

          console.log('Object store created:', STORE_NAME)
        }

        // Create offline tiles store (v2)
        if (oldVersion < 2 && !db.objectStoreNames.contains(TILES_STORE)) {
          const tilesStore = db.createObjectStore(TILES_STORE, {
            keyPath: 'key'
          })

          tilesStore.createIndex('timestamp', 'timestamp', { unique: false })

          console.log('Object store created:', TILES_STORE)
        }

        // Create downloaded areas store (v2)
        if (oldVersion < 2 && !db.objectStoreNames.contains(AREAS_STORE)) {
          const areasStore = db.createObjectStore(AREAS_STORE, {
            keyPath: 'id'
          })

          areasStore.createIndex('downloadedAt', 'downloadedAt', { unique: false })

          console.log('Object store created:', AREAS_STORE)
        }

        // Create routes store (v3)
        if (oldVersion < 3 && !db.objectStoreNames.contains(ROUTES_STORE)) {
          const routesStore = db.createObjectStore(ROUTES_STORE, {
            keyPath: 'id'
          })

          routesStore.createIndex('createdAt', 'createdAt', { unique: false })
          routesStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          routesStore.createIndex('completedAt', 'completedAt', { unique: false })

          console.log('Object store created:', ROUTES_STORE)
        }

        // Create waypoints store (v3)
        if (oldVersion < 3 && !db.objectStoreNames.contains(WAYPOINTS_STORE)) {
          const waypointsStore = db.createObjectStore(WAYPOINTS_STORE, {
            keyPath: 'id'
          })

          waypointsStore.createIndex('createdAt', 'createdAt', { unique: false })
          waypointsStore.createIndex('updatedAt', 'updatedAt', { unique: false })

          console.log('Object store created:', WAYPOINTS_STORE)
        }

        // Create projects store (v3)
        if (oldVersion < 3 && !db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projectsStore = db.createObjectStore(PROJECTS_STORE, {
            keyPath: 'id'
          })

          projectsStore.createIndex('createdAt', 'createdAt', { unique: false })
          projectsStore.createIndex('updatedAt', 'updatedAt', { unique: false })

          console.log('Object store created:', PROJECTS_STORE)
        }
      }
    })
  }

  async saveData(type: string, data: unknown): Promise<number> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const item = {
        type,
        data,
        timestamp: Date.now()
      }

      const request = store.add(item)

      request.onsuccess = () => {
        resolve(request.result as number)
      }

      request.onerror = () => {
        reject(new Error(`Failed to save data (type: ${type}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async getData(type: string): Promise<unknown[]> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('type')

      const request = index.getAll(type)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error(`Failed to retrieve data (type: ${type}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async clearData(): Promise<void> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const request = store.clear()

      request.onsuccess = () => {
        console.log('Database cleared')
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`Failed to clear database: ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  // Downloaded Areas methods (using dedicated downloadedAreas store)
  async saveDownloadedArea(area: unknown): Promise<void> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AREAS_STORE], 'readwrite')
      const store = transaction.objectStore(AREAS_STORE)

      const request = store.put(area)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`Failed to save downloaded area: ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async getDownloadedAreas(): Promise<unknown[]> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AREAS_STORE], 'readonly')
      const store = transaction.objectStore(AREAS_STORE)

      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error(`Failed to retrieve downloaded areas: ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async deleteDownloadedArea(areaId: string): Promise<void> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AREAS_STORE], 'readwrite')
      const store = transaction.objectStore(AREAS_STORE)

      const request = store.delete(areaId)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`Failed to delete downloaded area (ID: ${areaId}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }
}

export const dbService = new DatabaseService()
