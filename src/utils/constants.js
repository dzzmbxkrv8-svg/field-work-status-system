/** @type {readonly string[]} Field status options shared across UI. */
export const STATUS_OPTIONS = ['Not Started', 'Ready for Dispatch', 'In Progress', 'Delayed', 'Completed']

/** @type {readonly string[]} Priority options ordered from highest to lowest urgency. */
export const PRIORITY_OPTIONS = ['High', 'Medium', 'Low']

/** Number of characters used when generating admin access codes. */
export const ADMIN_ACCESS_LENGTH = 8

/** Quick action presets for the worker dashboard. */
export const STATUS_QUICK_ACTIONS = [
  { status: 'Not Started', icon: '🛌', variant: 'primary' },
  { status: 'Ready for Dispatch', icon: '🚚', variant: 'success' },
  { status: 'In Progress', icon: '📍', variant: 'warning' },
  { status: 'Completed', icon: '🏁', variant: 'danger' },
]

/** Role tabs rendered on the admin dashboard header. */
export const ROLE_TABS = [
  { id: 'overview', icon: '🧭' },
  { id: 'monitoring', icon: '📡' },
  { id: 'orders', icon: '📋' },
  { id: 'messages', icon: '💬' },
  { id: 'reports', icon: '📈' },
]


/** Default values for the admin work-order creation form. */
export const defaultFormState = {
  team: '',
  supervisor: '',
  location: '',
  status: STATUS_OPTIONS[0],
  startDate: '',
  dueDate: '',
  priority: PRIORITY_OPTIONS[1],
  crewCount: 4,
  progress: 0,
  safetyCheck: 'Pending',
  notes: '',
}

/** Lookup table to allow deterministic ordering of status columns. */
export const STATUS_ORDER = STATUS_OPTIONS.reduce((lookup, status, index) => {
  lookup[status] = index
  return lookup
}, {})
