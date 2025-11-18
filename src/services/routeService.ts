// Route and Waypoint service for Tråkke PWA
// Manages hiking routes, waypoints, and track recording

export interface Waypoint {
  id: string
  name: string
  description?: string
  category?: string // User-defined category (e.g., "Hengekøyeplass")
  coordinates: [number, number] // [lon, lat]
  elevation?: number
  icon?: string // Material symbol name
  color?: string
  createdAt: number
  updatedAt: number
}

export interface Route {
  id: string
  name: string
  description?: string
  coordinates: Array<[number, number]> // Array of [lon, lat] points
  waypoints: string[] // Array of waypoint IDs
  distance?: number // meters
  elevationGain?: number // meters
  elevationLoss?: number // meters
  duration?: number // estimated minutes
  difficulty?: 'easy' | 'moderate' | 'hard'
  color?: string
  createdAt: number
  updatedAt: number
  completedAt?: number // timestamp when route was completed
}

export interface Project {
  id: string
  name: string
  description?: string
  routes: string[] // Array of route IDs
  waypoints: string[] // Array of waypoint IDs
  color?: string
  createdAt: number
  updatedAt: number
}

import { dbService } from './dbService'

const ROUTES_STORE = 'routes'
const WAYPOINTS_STORE = 'waypoints'
const PROJECTS_STORE = 'projects'

class RouteService {
  // Use dbService instead of maintaining separate database connection
  private async getDB(): Promise<IDBDatabase> {
    return await dbService.init()
  }

  // Waypoint methods
  async createWaypoint(waypoint: Omit<Waypoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<Waypoint> {
    const db = await this.getDB()

    const newWaypoint: Waypoint = {
      ...waypoint,
      id: `wp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WAYPOINTS_STORE], 'readwrite')
      const store = transaction.objectStore(WAYPOINTS_STORE)

      const request = store.add(newWaypoint)

      request.onsuccess = () => {
        console.log('Waypoint created:', newWaypoint.id)
        resolve(newWaypoint)
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to create waypoint: ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async getWaypoint(id: string): Promise<Waypoint | null> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WAYPOINTS_STORE], 'readonly')
      const store = transaction.objectStore(WAYPOINTS_STORE)

      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to get waypoint (ID: ${id}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async getAllWaypoints(): Promise<Waypoint[]> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WAYPOINTS_STORE], 'readonly')
      const store = transaction.objectStore(WAYPOINTS_STORE)
      const index = store.index('updatedAt')

      const request = index.openCursor(null, 'prev') // Most recent first
      const waypoints: Waypoint[] = []

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          waypoints.push(cursor.value)
          cursor.continue()
        } else {
          resolve(waypoints)
        }
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to get waypoints: ${(event.target as IDBRequest).error?.message || 'Unknown error'}`))
      }
    })
  }

  async updateWaypoint(id: string, updates: Partial<Omit<Waypoint, 'id' | 'createdAt'>>): Promise<Waypoint> {
    const db = await this.getDB()
    const existing = await this.getWaypoint(id)

    if (!existing) {
      throw new Error('Waypoint not found')
    }

    const updated: Waypoint = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WAYPOINTS_STORE], 'readwrite')
      const store = transaction.objectStore(WAYPOINTS_STORE)

      const request = store.put(updated)

      request.onsuccess = () => {
        console.log('Waypoint updated:', id)
        resolve(updated)
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to update waypoint (ID: ${id}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async deleteWaypoint(id: string): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WAYPOINTS_STORE], 'readwrite')
      const store = transaction.objectStore(WAYPOINTS_STORE)

      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('Waypoint deleted:', id)
        resolve()
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to delete waypoint (ID: ${id}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  // Route methods
  async createRoute(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route> {
    const db = await this.getDB()

    const newRoute: Route = {
      ...route,
      id: `route-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ROUTES_STORE], 'readwrite')
      const store = transaction.objectStore(ROUTES_STORE)

      const request = store.add(newRoute)

      request.onsuccess = () => {
        console.log('Route created:', newRoute.id)
        resolve(newRoute)
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to create route: ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async getRoute(id: string): Promise<Route | null> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ROUTES_STORE], 'readonly')
      const store = transaction.objectStore(ROUTES_STORE)

      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to get route (ID: ${id}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async getAllRoutes(): Promise<Route[]> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ROUTES_STORE], 'readonly')
      const store = transaction.objectStore(ROUTES_STORE)
      const index = store.index('updatedAt')

      const request = index.openCursor(null, 'prev') // Most recent first
      const routes: Route[] = []

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          routes.push(cursor.value)
          cursor.continue()
        } else {
          resolve(routes)
        }
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to get routes: ${(event.target as IDBRequest).error?.message || 'Unknown error'}`))
      }
    })
  }

  async updateRoute(id: string, updates: Partial<Omit<Route, 'id' | 'createdAt'>>): Promise<Route> {
    const db = await this.getDB()
    const existing = await this.getRoute(id)

    if (!existing) {
      throw new Error('Route not found')
    }

    const updated: Route = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ROUTES_STORE], 'readwrite')
      const store = transaction.objectStore(ROUTES_STORE)

      const request = store.put(updated)

      request.onsuccess = () => {
        console.log('Route updated:', id)
        resolve(updated)
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to update route (ID: ${id}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async deleteRoute(id: string): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ROUTES_STORE], 'readwrite')
      const store = transaction.objectStore(ROUTES_STORE)

      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('Route deleted:', id)
        resolve()
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to delete route (ID: ${id}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  // Project methods
  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const db = await this.getDB()

    const newProject: Project = {
      ...project,
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECTS_STORE)

      const request = store.add(newProject)

      request.onsuccess = () => {
        console.log('Project created:', newProject.id)
        resolve(newProject)
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to create project: ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async getProject(id: string): Promise<Project | null> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readonly')
      const store = transaction.objectStore(PROJECTS_STORE)

      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to get project (ID: ${id}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async getAllProjects(): Promise<Project[]> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readonly')
      const store = transaction.objectStore(PROJECTS_STORE)
      const index = store.index('updatedAt')

      const request = index.openCursor(null, 'prev') // Most recent first
      const projects: Project[] = []

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          projects.push(cursor.value)
          cursor.continue()
        } else {
          resolve(projects)
        }
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to get projects: ${(event.target as IDBRequest).error?.message || 'Unknown error'}`))
      }
    })
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project> {
    const db = await this.getDB()
    const existing = await this.getProject(id)

    if (!existing) {
      throw new Error('Project not found')
    }

    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECTS_STORE)

      const request = store.put(updated)

      request.onsuccess = () => {
        console.log('Project updated:', id)
        resolve(updated)
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to update project (ID: ${id}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECTS_STORE)

      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('Project deleted:', id)
        resolve()
      }

      request.onerror = (event: Event) => {
        reject(new Error(`Failed to delete project (ID: ${id}): ${request.error?.message || 'Unknown error'}`))
      }
    })
  }

  // Utility method to calculate route distance
  calculateDistance(coordinates: Array<[number, number]>): number {
    if (coordinates.length < 2) return 0

    let totalDistance = 0

    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lon1, lat1] = coordinates[i]
      const [lon2, lat2] = coordinates[i + 1]

      // Haversine formula for distance between two points
      const R = 6371000 // Earth radius in meters
      const φ1 = (lat1 * Math.PI) / 180
      const φ2 = (lat2 * Math.PI) / 180
      const Δφ = ((lat2 - lat1) * Math.PI) / 180
      const Δλ = ((lon2 - lon1) * Math.PI) / 180

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      totalDistance += R * c
    }

    return totalDistance
  }
}

export const routeService = new RouteService()
