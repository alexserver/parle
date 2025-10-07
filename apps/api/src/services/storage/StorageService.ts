export interface StorageService {
  uploadFile(file: File, key: string): Promise<UploadResult>
  deleteFile(key: string): Promise<void>
  getFileUrl(key: string): Promise<string>
  generatePresignedUrl(key: string, expiresIn?: number): Promise<string>
}

export interface UploadResult {
  key: string
  url: string
  etag?: string
  size: number
}

export class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

export class UploadFailedError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, 'UPLOAD_FAILED', cause)
    this.name = 'UploadFailedError'
  }
}

export class FileNotFoundError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, 'FILE_NOT_FOUND', cause)
    this.name = 'FileNotFoundError'
  }
}

export class AccessDeniedError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, 'ACCESS_DENIED', cause)
    this.name = 'AccessDeniedError'
  }
}