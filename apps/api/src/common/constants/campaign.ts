// Definimos los valores válidos para todo el sistema
export const VOTE_INTENT_OPTIONS = [
  "SURE", 
  "PROBABLE", 
  "OPPOSITION_INTERNAL", 
  "OPPOSITION_PARTY", 
  "WONT_VOTE", 
  "UNDECIDED"
] as const;

export const CAMPAIGN_STATUS_OPTIONS = [
  "NOT_VISITED", 
  "TO_VISIT", 
  "CONTACTED", 
  "VISITED", 
  "VISITED_PC",
  "DO_NOT_DISTURB",
  // Day D / Extended statuses (match DB CHECK constraint)
  "PENDING",
  "NEW",
  "CALLED",
  "SCANNED",
  "NOT_FOUND",
  "CHECKED_IN",
  "REJECTED"
] as const;

export const TRANSPORT_STATUS_OPTIONS = [
  "PENDING", 
  "ASSIGNED",
  "COMPLETED"
] as const;
