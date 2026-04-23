/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validates email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validates password strength
   */
  static isValidPassword(password: string): { valid: boolean; reason?: string } {
    if (password.length < 6) {
      return {
        valid: false,
        reason: 'Password must be at least 6 characters long',
      }
    }

    return { valid: true }
  }

  /**
   * Validates UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  /**
   * Validates class code format
   */
  static isValidClassCode(code: string): boolean {
    // Class code should be alphanumeric, 3-20 characters
    const codeRegex = /^[a-zA-Z0-9]{3,20}$/
    return codeRegex.test(code)
  }

  /**
   * Sanitizes string input
   */
  static sanitizeString(input: string, maxLength = 255): string {
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, '') // Remove potential HTML
  }

  /**
   * Validates profile type
   */
  static isValidProfileType(
    type: string
  ): type is 'platform_owner' | 'school_superadmin' | 'teacher' | 'student' {
    return ['platform_owner', 'school_superadmin', 'teacher', 'student'].includes(type)
  }

  /**
   * Validates organization type
   */
  static isValidOrganizationType(
    type: string
  ): type is 'school' | 'university' | 'institution' | 'academy' | 'other' {
    return ['school', 'university', 'institution', 'academy', 'other'].includes(type)
  }
}
