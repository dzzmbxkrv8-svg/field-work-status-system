export const STATUS_OPTIONS = ['Not Started', 'Ready for Dispatch', 'In Progress', 'Delayed', 'Completed', 'woke_up', 'departed', 'arrived', 'finished']

/** @type {readonly string[]} Priority options ordered from highest to lowest urgency. */
export const PRIORITY_OPTIONS = ['High', 'Medium', 'Low']

/** Number of characters used when generating admin access codes. */
export const ADMIN_ACCESS_LENGTH = 8

/** Quick action presets for the worker dashboard. */
export const STATUS_QUICK_ACTIONS = [
  { status: 'woke_up', icon: 'Sunrise', variant: 'primary' },
  { status: 'departed', icon: 'Car', variant: 'success' },
  { status: 'arrived', icon: 'MapPin', variant: 'warning' },
  { status: 'finished', icon: 'CheckCircle', variant: 'danger' },
]

/** Role tabs rendered on the admin dashboard header. */
export const ROLE_TABS = [
  { id: 'dashboard', icon: 'LayoutDashboard' },
  { id: 'orders', icon: 'ClipboardList' },
  { id: 'messages', icon: 'MessageSquare' },
  { id: 'reports', icon: 'BarChart2' },
  { id: 'teams', icon: 'Users' },
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
