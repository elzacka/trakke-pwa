// Input validation utilities
// Prevents XSS attacks and ensures safe user input

import { VALIDATION } from '../config/timings'

/**
 * Validate and sanitize user-provided names (routes, waypoints, projects, etc.)
 * Prevents XSS attacks by rejecting any input with HTML/script-related characters
 *
 * @param name - The name to validate
 * @param maxLength - Maximum allowed length (default from VALIDATION config)
 * @returns The validated and trimmed name, or null if invalid
 */
export function validateName(name: string | null, maxLength: number = VALIDATION.MAX_NAME_LENGTH): string | null {
  if (!name) return null
  const trimmed = name.trim()

  if (trimmed.length === 0) {
    alert('Navn kan ikke være tomt')
    return null
  }

  if (trimmed.length > maxLength) {
    alert(`Navn kan ikke være lengre enn ${maxLength} tegn`)
    return null
  }

  // Strict XSS protection: reject any input with HTML/script-related characters
  // This includes: <, >, ", ', /, \, and common script keywords
  const dangerousPatterns = [
    /</, />/, /"/, /'/, // HTML/attribute delimiters
    /&lt;/, /&gt;/, /&quot;/, /&#/, // HTML entities
    /javascript:/i, /on\w+=/i, // Event handlers
    /<script/i, /<iframe/i, /<object/i, /<embed/i, // Script tags
    /\\/  // Backslash (escape sequences)
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      alert('Navn inneholder ugyldige tegn. Kun bokstaver, tall og vanlige tegn er tillatt.')
      return null
    }
  }

  // Additional check: ensure only safe characters (letters, numbers, spaces, basic punctuation)
  const safePattern = /^[a-zA-ZæøåÆØÅ0-9\s\-_.,()']+$/
  if (!safePattern.test(trimmed)) {
    alert('Navn inneholder ugyldige tegn. Kun bokstaver, tall og vanlige tegn er tillatt.')
    return null
  }

  return trimmed
}
