import {
  LayoutDashboard, ClipboardList, MessageSquare, BarChart2, Users,
  Sunrise, Car, MapPin, CheckCircle,
  Home, Calendar, Send,
  HardHat, Clock, Bell, AlertTriangle,
  Plus, Pencil, Trash2, X, Check,
  Search, LogOut, ChevronLeft, ChevronRight,
  Paperclip, Camera, FileText, Download,
  Eye, Filter, RefreshCw,
  User, UserCheck, CalendarDays, Flag,
  ArrowLeft, ArrowRight, CircleCheck, CircleX,
  TriangleAlert, Bookmark, Building2,
  Fingerprint, ShieldCheck, Sparkles,
} from 'lucide-react'

const ICON_MAP = {
  // Admin tabs
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  BarChart2,
  Users,
  // Worker status
  Sunrise,
  Car,
  MapPin,
  CheckCircle,
  // Worker nav
  Home,
  Calendar,
  Send,
  // Misc
  HardHat,
  Clock,
  Bell,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Camera,
  FileText,
  Download,
  Eye,
  Filter,
  RefreshCw,
  User,
  UserCheck,
  CalendarDays,
  Flag,
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CircleX,
  TriangleAlert,
  Bookmark,
  Building2,
  Fingerprint,
  ShieldCheck,
  Sparkles,
}

/**
 * Renders a Lucide icon by name.
 * @param {{ name: string, size?: number, className?: string, style?: object }} props
 */
export function AppIcon({ name, size = 18, className, style, strokeWidth = 1.8, ...rest }) {
  const Component = ICON_MAP[name]
  if (!Component) return null
  return <Component size={size} className={className} style={style} strokeWidth={strokeWidth} {...rest} />
}
