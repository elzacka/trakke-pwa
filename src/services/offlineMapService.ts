// Offline map tile download service
// Downloads and caches map tiles for offline use

import { dbService } from './dbService'
import { MAP_CONFIG, devLog, devError, type BaseLayerType } from '../constants'

export interface DownloadArea {
  id: string
  name: string
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  zoomLevels: {
    min: number
    max: number
  }
  baseLayer: BaseLayerType // Which layer(s) to download
  downloadedAt?: number
  tileCount?: number
}

export interface DownloadProgress {
  totalTiles: number
  downloadedTiles: number
  failedTiles: number
  percentage: number
  estimatedSize: number
  currentSize: number
}

class OfflineMapService {
  private readonly TILE_SIZE_ESTIMATE = 15000 // ~15KB average per tile
  private readonly MAX_TILES = 20000 // Hard limit to prevent browser/device issues
  private readonly WARNING_THRESHOLD = 1000 // Warn user for downloads over this size

  /**
   * Get tile URL template for a specific base layer
   */
  private getTileUrlTemplate(baseLayer: BaseLayerType): string {
    switch (baseLayer) {
      case 'grayscale':
        return MAP_CONFIG.TILE_URL_GRAYSCALE
      case 'satellite':
        return MAP_CONFIG.TILE_URL_SATELLITE
      default:
        return MAP_CONFIG.TILE_URL_TOPO
    }
  }

  /**
   * Calculate number of tiles needed for area
   */
  calculateTileCount(area: DownloadArea): number {
    const { bounds, zoomLevels } = area
    let totalTiles = 0

    for (let z = zoomLevels.min; z <= zoomLevels.max; z++) {
      const xMin = this.lonToTileX(bounds.west, z)
      const xMax = this.lonToTileX(bounds.east, z)
      const yMin = this.latToTileY(bounds.north, z)
      const yMax = this.latToTileY(bounds.south, z)

      const tilesX = Math.abs(xMax - xMin) + 1
      const tilesY = Math.abs(yMax - yMin) + 1
      totalTiles += tilesX * tilesY
    }

    return totalTiles
  }

  /**
   * Download tiles for specified area
   */
  async downloadArea(
    area: DownloadArea,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    const totalTiles = this.calculateTileCount(area)

    // Safety check: hard limit to prevent device/browser issues
    if (totalTiles > this.MAX_TILES) {
      throw new Error(
        `Området er for stort (${totalTiles} fliser). Maksimalt tillatt er ${this.MAX_TILES} fliser. ` +
        `Vennligst zoom inn eller velg et mindre område.`
      )
    }

    let downloadedTiles = 0
    let failedTiles = 0
    let currentSize = 0

    const progress: DownloadProgress = {
      totalTiles,
      downloadedTiles: 0,
      failedTiles: 0,
      percentage: 0,
      estimatedSize: totalTiles * this.TILE_SIZE_ESTIMATE,
      currentSize: 0
    }

    // Download tiles for each zoom level
    for (let z = area.zoomLevels.min; z <= area.zoomLevels.max; z++) {
      const xMin = this.lonToTileX(area.bounds.west, z)
      const xMax = this.lonToTileX(area.bounds.east, z)
      const yMin = this.latToTileY(area.bounds.north, z)
      const yMax = this.latToTileY(area.bounds.south, z)

      // Download tiles in batches to avoid overwhelming the browser
      const batchSize = 5
      const tiles: Array<{ z: number; x: number; y: number }> = []

      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          tiles.push({ z, x, y })
        }
      }

      // Process tiles in batches
      for (let i = 0; i < tiles.length; i += batchSize) {
        const batch = tiles.slice(i, i + batchSize)
        const results = await Promise.allSettled(
          batch.map((tile) => this.downloadTile(tile.z, tile.x, tile.y, area.baseLayer))
        )

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            downloadedTiles++
            currentSize += result.value
          } else {
            failedTiles++
            devError(
              `Failed to download tile ${area.baseLayer}/${batch[index].z}/${batch[index].x}/${batch[index].y}`
            )
          }
        })

        progress.downloadedTiles = downloadedTiles
        progress.failedTiles = failedTiles
        progress.percentage = Math.round((downloadedTiles / totalTiles) * 100)
        progress.currentSize = currentSize

        if (onProgress) {
          onProgress({ ...progress })
        }

        // Small delay between batches to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Save area metadata
    await dbService.saveDownloadedArea({
      ...area,
      downloadedAt: Date.now(),
      tileCount: downloadedTiles
    })
  }

  /**
   * Download single tile and cache it
   */
  private async downloadTile(
    z: number,
    x: number,
    y: number,
    baseLayer: BaseLayerType
  ): Promise<number | null> {
    const urlTemplate = this.getTileUrlTemplate(baseLayer)
    const url = urlTemplate.replace('{z}', z.toString())
      .replace('{x}', x.toString())
      .replace('{y}', y.toString())

    try {
      const response = await fetch(url)
      if (!response.ok) return null

      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()

      // Store in IndexedDB with layer-specific key
      const tileKey = `${baseLayer}/${z}/${x}/${y}`
      await dbService.saveData('tile', {
        key: tileKey,
        data: arrayBuffer,
        timestamp: Date.now()
      })

      return arrayBuffer.byteLength
    } catch (error) {
      devError(`Error downloading tile ${baseLayer}/${z}/${x}/${y}:`, error)
      return null
    }
  }

  /**
   * Get downloaded areas
   */
  async getDownloadedAreas(): Promise<DownloadArea[]> {
    const areas = await dbService.getDownloadedAreas()
    return areas as DownloadArea[]
  }

  /**
   * Delete downloaded area
   */
  async deleteArea(areaId: string): Promise<void> {
    // Delete area metadata from IndexedDB
    await dbService.deleteDownloadedArea(areaId)
    devLog(`Deleted area ${areaId} metadata`)

    // TODO: Optionally delete associated tiles from cache
    // This would require tracking which tiles belong to which area
    // For now, tiles remain in Service Worker cache and will be evicted by LRU policy
  }

  /**
   * Get storage usage estimate
   */
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      }
    }
    return { used: 0, quota: 0 }
  }

  // Utility functions for tile calculations
  private lonToTileX(lon: number, zoom: number): number {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
  }

  private latToTileY(lat: number, zoom: number): number {
    return Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        Math.pow(2, zoom)
    )
  }

}


export const offlineMapService = new OfflineMapService()
