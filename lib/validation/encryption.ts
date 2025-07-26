import { createHash, createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'crypto'

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16
const SALT_LENGTH = 32

/**
 * Data encryption and hashing utilities for sensitive information
 */
export class DataEncryption {
  private static getEncryptionKey(password: string, salt: Buffer): Buffer {
    return scryptSync(password, salt, KEY_LENGTH)
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  static encrypt(plainText: string, password: string): string {
    try {
      const salt = randomBytes(SALT_LENGTH)
      const iv = randomBytes(IV_LENGTH)
      const key = this.getEncryptionKey(password, salt)
      
      const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
      
      let encrypted = cipher.update(plainText, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ])
      
      return combined.toString('base64')
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Encryption failed')
    }
  }

  /**
   * Decrypt data encrypted with encrypt method
   */
  static decrypt(encryptedData: string, password: string): string {
    try {
      const combined = Buffer.from(encryptedData, 'base64')
      
      const salt = combined.subarray(0, SALT_LENGTH)
      const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
      const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
      const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
      
      const key = this.getEncryptionKey(password, salt)
      
      const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
      decipher.setAuthTag(tag)
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Decryption failed')
    }
  }

  /**
   * Hash passwords securely with salt
   */
  static hashPassword(password: string, salt?: Buffer): { hash: string; salt: string } {
    const passwordSalt = salt || randomBytes(32)
    const hash = scryptSync(password, passwordSalt, 64)
    
    return {
      hash: hash.toString('hex'),
      salt: passwordSalt.toString('hex')
    }
  }

  /**
   * Verify password against hash
   */
  static verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const saltBuffer = Buffer.from(salt, 'hex')
      const hashBuffer = Buffer.from(hash, 'hex')
      
      const derivedHash = scryptSync(password, saltBuffer, 64)
      
      return timingSafeEqual(hashBuffer, derivedHash)
    } catch (error) {
      console.error('Password verification error:', error)
      return false
    }
  }

  /**
   * Generate secure hash for data integrity
   */
  static hashData(data: string, algorithm: string = 'sha256'): string {
    return createHash(algorithm).update(data, 'utf8').digest('hex')
  }

  /**
   * Generate HMAC for message authentication
   */
  static generateHMAC(data: string, secret: string, algorithm: string = 'sha256'): string {
    const hmac = createHash(algorithm)
    hmac.update(data + secret)
    return hmac.digest('hex')
  }

  /**
   * Verify HMAC
   */
  static verifyHMAC(data: string, secret: string, providedHMAC: string, algorithm: string = 'sha256'): boolean {
    const expectedHMAC = this.generateHMAC(data, secret, algorithm)
    const providedBuffer = Buffer.from(providedHMAC, 'hex')
    const expectedBuffer = Buffer.from(expectedHMAC, 'hex')
    
    return providedBuffer.length === expectedBuffer.length && 
           timingSafeEqual(providedBuffer, expectedBuffer)
  }

  /**
   * Generate cryptographically secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex')
  }

  /**
   * Generate UUID-like identifier
   */
  static generateSecureId(): string {
    const bytes = randomBytes(16)
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // Variant bits
    
    const hex = bytes.toString('hex')
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32)
    ].join('-')
  }

  /**
   * Encrypt JSON data
   */
  static encryptJSON<T>(data: T, password: string): string {
    const jsonString = JSON.stringify(data)
    return this.encrypt(jsonString, password)
  }

  /**
   * Decrypt JSON data
   */
  static decryptJSON<T>(encryptedData: string, password: string): T {
    const jsonString = this.decrypt(encryptedData, password)
    return JSON.parse(jsonString)
  }

  /**
   * Encrypt sensitive fields in an object
   */
  static encryptObjectFields<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: (keyof T)[],
    password: string
  ): T {
    const result = { ...obj }
    
    for (const field of sensitiveFields) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.encrypt(result[field] as string, password) as T[keyof T]
      }
    }
    
    return result
  }

  /**
   * Decrypt sensitive fields in an object
   */
  static decryptObjectFields<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: (keyof T)[],
    password: string
  ): T {
    const result = { ...obj }
    
    for (const field of sensitiveFields) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = this.decrypt(result[field] as string, password) as T[keyof T]
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error)
          // Keep original value if decryption fails
        }
      }
    }
    
    return result
  }

  /**
   * Generate deterministic hash for deduplication
   */
  static generateDeduplicationHash(data: string[]): string {
    const sorted = data.sort()
    const combined = sorted.join('|')
    return this.hashData(combined, 'sha256')
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars * 2) {
      return '*'.repeat(data.length)
    }
    
    const start = data.substring(0, visibleChars)
    const end = data.substring(data.length - visibleChars)
    const masked = '*'.repeat(data.length - (visibleChars * 2))
    
    return start + masked + end
  }

  /**
   * Generate API key with metadata
   */
  static generateAPIKey(userId: string, scope: string[]): {
    key: string
    keyId: string
    hash: string
  } {
    const keyId = this.generateSecureId()
    const randomPart = this.generateSecureToken(32)
    const metadata = JSON.stringify({ userId, scope, keyId, created: Date.now() })
    const metadataHash = this.hashData(metadata)
    
    const key = `ck_${keyId}_${randomPart}`
    const hash = this.hashData(key)
    
    return { key, keyId, hash }
  }

  /**
   * Validate API key format
   */
  static validateAPIKeyFormat(key: string): boolean {
    const pattern = /^ck_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}_[0-9a-f]{64}$/
    return pattern.test(key)
  }

  /**
   * Extract key ID from API key
   */
  static extractKeyId(key: string): string | null {
    if (!this.validateAPIKeyFormat(key)) {
      return null
    }
    
    const parts = key.split('_')
    return parts.length >= 3 ? parts[1] : null
  }

  /**
   * Generate session token with expiration
   */
  static generateSessionToken(userId: string, expiresInMs: number = 24 * 60 * 60 * 1000): {
    token: string
    expires: number
    hash: string
  } {
    const expires = Date.now() + expiresInMs
    const tokenData = {
      userId,
      expires,
      random: this.generateSecureToken(16)
    }
    
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64')
    const hash = this.hashData(token)
    
    return { token, expires, hash }
  }

  /**
   * Validate and decode session token
   */
  static validateSessionToken(token: string): {
    valid: boolean
    userId?: string
    expires?: number
  } {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'))
      
      if (!decoded.userId || !decoded.expires || !decoded.random) {
        return { valid: false }
      }
      
      if (Date.now() > decoded.expires) {
        return { valid: false }
      }
      
      return {
        valid: true,
        userId: decoded.userId,
        expires: decoded.expires
      }
    } catch (error) {
      return { valid: false }
    }
  }
}

/**
 * Environment-specific encryption helpers
 */
export class EnvironmentEncryption {
  private static getSecret(key: string): string {
    const secret = process.env[key]
    if (!secret) {
      throw new Error(`Environment secret ${key} not found`)
    }
    return secret
  }

  /**
   * Encrypt using environment-specific key
   */
  static encryptWithEnvKey(data: string, keyName: string = 'ENCRYPTION_KEY'): string {
    const secret = this.getSecret(keyName)
    return DataEncryption.encrypt(data, secret)
  }

  /**
   * Decrypt using environment-specific key
   */
  static decryptWithEnvKey(encryptedData: string, keyName: string = 'ENCRYPTION_KEY'): string {
    const secret = this.getSecret(keyName)
    return DataEncryption.decrypt(encryptedData, secret)
  }

  /**
   * Generate HMAC using environment secret
   */
  static generateEnvHMAC(data: string, keyName: string = 'HMAC_SECRET'): string {
    const secret = this.getSecret(keyName)
    return DataEncryption.generateHMAC(data, secret)
  }

  /**
   * Verify HMAC using environment secret
   */
  static verifyEnvHMAC(data: string, hmac: string, keyName: string = 'HMAC_SECRET'): boolean {
    const secret = this.getSecret(keyName)
    return DataEncryption.verifyHMAC(data, secret, hmac)
  }
}

/**
 * Database field encryption helpers
 */
export class DatabaseFieldEncryption {
  /**
   * Encrypt PII before database storage
   */
  static encryptPII(data: {
    email?: string
    phone?: string
    address?: string
    name?: string
  }): Record<string, string> {
    const encrypted: Record<string, string> = {}
    
    try {
      const key = process.env.PII_ENCRYPTION_KEY
      if (!key) {
        throw new Error('PII encryption key not configured')
      }

      for (const [field, value] of Object.entries(data)) {
        if (value && typeof value === 'string') {
          encrypted[field] = DataEncryption.encrypt(value, key)
        }
      }
    } catch (error) {
      console.error('PII encryption error:', error)
      throw new Error('Failed to encrypt PII data')
    }
    
    return encrypted
  }

  /**
   * Decrypt PII from database
   */
  static decryptPII(encryptedData: Record<string, string>): Record<string, string> {
    const decrypted: Record<string, string> = {}
    
    try {
      const key = process.env.PII_ENCRYPTION_KEY
      if (!key) {
        throw new Error('PII encryption key not configured')
      }

      for (const [field, value] of Object.entries(encryptedData)) {
        if (value && typeof value === 'string') {
          decrypted[field] = DataEncryption.decrypt(value, key)
        }
      }
    } catch (error) {
      console.error('PII decryption error:', error)
      throw new Error('Failed to decrypt PII data')
    }
    
    return decrypted
  }
}

// Export utilities
export const {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  hashData,
  generateHMAC,
  verifyHMAC,
  generateSecureToken,
  generateSecureId,
  encryptJSON,
  decryptJSON,
  encryptObjectFields,
  decryptObjectFields,
  generateDeduplicationHash,
  maskSensitiveData,
  generateAPIKey,
  validateAPIKeyFormat,
  extractKeyId,
  generateSessionToken,
  validateSessionToken
} = DataEncryption

export default DataEncryption