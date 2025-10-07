import { StorageService } from './StorageService'
import { R2StorageService } from './R2StorageService'

export class StorageFactory {
  static createStorageService(): StorageService {
    const provider = process.env.STORAGE_PROVIDER || 'r2'
    
    switch (provider.toLowerCase()) {
      case 'r2':
        return new R2StorageService()
      default:
        throw new Error(`Unsupported storage provider: ${provider}`)
    }
  }
}