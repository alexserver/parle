import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler'
import { StorageService, UploadResult, UploadFailedError, FileNotFoundError, AccessDeniedError } from './StorageService'
import { logger } from '../logger'

export class R2StorageService implements StorageService {
  private s3Client: S3Client
  private bucketName: string

  constructor() {
    logger.info('Initializing R2StorageService', {
      accountId: process.env.R2_ACCOUNT_ID ? `***${process.env.R2_ACCOUNT_ID.slice(-4)}` : 'missing',
      region: process.env.R2_REGION || 'auto',
      bucketName: process.env.R2_BUCKET_NAME || 'missing',
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY
    })
    
    this.validateEnvironment()
    
    const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    logger.info('Creating S3Client for R2', { endpoint })
    
    this.s3Client = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      // Use fetch-based HTTP handler for Bun compatibility
      requestHandler: new FetchHttpHandler(),
    })
    this.bucketName = process.env.R2_BUCKET_NAME!
    
    logger.info('R2StorageService initialized successfully', { 
      bucketName: this.bucketName,
      endpoint 
    })
  }

  private validateEnvironment(): void {
    logger.info('Validating R2 environment variables')
    
    const requiredEnvVars = [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID', 
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      logger.error('Missing required R2 environment variables', { missingVars })
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }
    
    logger.info('R2 environment validation passed', { 
      providedVars: requiredEnvVars.filter(varName => !!process.env[varName])
    })
  }

  async uploadFile(file: File, key: string): Promise<UploadResult> {
    logger.info('Starting R2 file upload', {
      key,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bucketName: this.bucketName
    })
    
    try {
      logger.info('Converting file to buffer', { 
        fileName: file.name,
        originalSize: file.size 
      })
      
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      logger.info('File converted to buffer successfully', {
        fileName: file.name,
        bufferLength: buffer.length,
        expectedSize: file.size,
        sizeMatch: buffer.length === file.size
      })

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        ContentLength: file.size,
      }
      
      logger.info('Creating S3 Upload instance', {
        bucket: uploadParams.Bucket,
        key: uploadParams.Key,
        contentType: uploadParams.ContentType,
        contentLength: uploadParams.ContentLength
      })

      const upload = new Upload({
        client: this.s3Client,
        params: uploadParams,
      })

      logger.info('Starting upload to R2...', { key })
      const result = await upload.done()
      
      logger.info('Upload completed', {
        key,
        location: result.Location,
        etag: result.ETag,
        bucket: result.Bucket,
        versionId: result.VersionId
      })
      
      if (!result.Location) {
        logger.error('Upload completed but no location returned', { 
          key,
          result: JSON.stringify(result)
        })
        throw new UploadFailedError('Upload completed but no location returned')
      }

      const uploadResult = {
        key,
        url: result.Location,
        etag: result.ETag,
        size: file.size,
      }
      
      logger.info('R2 upload successful', uploadResult)
      return uploadResult
      
    } catch (error) {
      logger.error('R2 upload failed', {
        key,
        fileName: file.name,
        fileSize: file.size,
        bucketName: this.bucketName,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      })
      
      if (error instanceof Error) {
        if (error.message.includes('Access Denied') || error.message.includes('403')) {
          throw new AccessDeniedError('Access denied to R2 storage', error)
        }
        throw new UploadFailedError(`Failed to upload file: ${error.message}`, error)
      }
      throw new UploadFailedError('Unknown upload error', error as Error)
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await this.s3Client.send(command)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('NoSuchKey') || error.message.includes('404')) {
          throw new FileNotFoundError(`File not found: ${key}`, error)
        }
        if (error.message.includes('Access Denied') || error.message.includes('403')) {
          throw new AccessDeniedError('Access denied to delete file', error)
        }
        throw new Error(`Failed to delete file: ${error.message}`)
      }
      throw new Error('Unknown delete error')
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.bucketName}/${key}`
  }

  async generatePresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      })

      return signedUrl
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('NoSuchKey') || error.message.includes('404')) {
          throw new FileNotFoundError(`File not found for presigned URL: ${key}`, error)
        }
        if (error.message.includes('Access Denied') || error.message.includes('403')) {
          throw new AccessDeniedError('Access denied to generate presigned URL', error)
        }
        throw new Error(`Failed to generate presigned URL: ${error.message}`)
      }
      throw new Error('Unknown presigned URL generation error')
    }
  }
}