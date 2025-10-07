import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler'
import { StorageService, UploadResult, UploadFailedError, FileNotFoundError, AccessDeniedError } from './StorageService'

export class R2StorageService implements StorageService {
  private s3Client: S3Client
  private bucketName: string

  constructor() {
    this.validateEnvironment()
    
    this.s3Client = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      // Use fetch-based HTTP handler for Bun compatibility
      requestHandler: new FetchHttpHandler(),
    })
    this.bucketName = process.env.R2_BUCKET_NAME!
  }

  private validateEnvironment(): void {
    const requiredEnvVars = [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID', 
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }
  }

  async uploadFile(file: File, key: string): Promise<UploadResult> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: file.type,
          ContentLength: file.size,
        },
      })

      const result = await upload.done()
      
      if (!result.Location) {
        throw new UploadFailedError('Upload completed but no location returned')
      }

      return {
        key,
        url: result.Location,
        etag: result.ETag,
        size: file.size,
      }
    } catch (error) {
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