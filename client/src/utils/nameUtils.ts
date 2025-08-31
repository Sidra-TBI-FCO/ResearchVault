// Utility functions for consistent name formatting throughout the application

export interface PersonName {
  honorificTitle?: string | null;
  firstName: string;
  lastName: string;
}

/**
 * Formats a person's full name with optional honorific title
 * @param person - Object containing name components
 * @param includeHonorific - Whether to include the honorific title (default: true)
 * @returns Formatted full name string
 */
export function formatFullName(person: PersonName, includeHonorific: boolean = true): string {
  const parts: string[] = [];
  
  if (includeHonorific && person.honorificTitle && person.honorificTitle !== "none") {
    parts.push(person.honorificTitle);
  }
  
  parts.push(person.firstName);
  parts.push(person.lastName);
  
  return parts.join(' ').trim();
}

/**
 * Gets initials from a person's name
 * @param person - Object containing name components
 * @returns Two-character initials string
 */
export function getInitials(person: PersonName): string {
  const firstInitial = person.firstName?.charAt(0) || '';
  const lastInitial = person.lastName?.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

/**
 * Formats a name for display in dropdowns or lists
 * @param person - Object containing name components  
 * @param jobTitle - Optional job title to append
 * @returns Formatted name with optional job title
 */
export function formatNameWithJobTitle(person: PersonName & { jobTitle?: string | null }, includeJobTitle: boolean = true): string {
  const fullName = formatFullName(person);
  
  if (includeJobTitle && person.jobTitle) {
    return `${fullName} - ${person.jobTitle}`;
  }
  
  return fullName;
}