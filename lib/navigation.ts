import { type UserRole, UserRoles } from "@/types"
import {
  LayoutDashboard,
  Users,
  Book,
  Hash,
  LucideListChecks,
  Briefcase,
  UserRoundPen,
} from "lucide-react"

export interface NavigationItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  roles: UserRole[]
}

export const navigationConfig: NavigationItem[] = [
    {
        title: "Tableau de bord",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: [UserRoles.ADMIN, UserRoles.TEACHER, UserRoles.STUDENT, UserRoles.COMPANY],
    },
    // Admin specific
    {
        title: "Conventions",
        href: "/dashboard/conventions",
        icon: Book,
        roles: [UserRoles.ADMIN],
    },
    {
        title: "Offres",
        href: "/dashboard/offers",
        icon: LucideListChecks,
        roles: [UserRoles.ADMIN],
    },
    {
        title: "Secteurs",
        href: "/dashboard/sectors",
        icon: Hash,
        roles: [UserRoles.ADMIN],
    },
    {
        title: "Utilisateurs",
        href: "/dashboard/users",
        icon: Users,
        roles: [UserRoles.ADMIN],
    },
    
    // Teacher specific
    {
        title: "Validation des conventions",
        href: "/dashboard/conventions",
        icon: Book,
        roles: [UserRoles.TEACHER],
    },
    // Student specific
    {
        title: "Mes candidatures",
        href: "/dashboard/applications",
        icon: Users,
        roles: [UserRoles.STUDENT],
    },
    {
        title: "Offres de stage",
        href: "/dashboard/offers",
        icon: Briefcase,
        roles: [UserRoles.STUDENT],
    },
    // Company specific
    {
        title: "Mes Offres",
        href: "/dashboard/offers",
        icon: Briefcase,
        roles: [UserRoles.COMPANY],
    },
    {
        title: "Candidatures",
        href: "/dashboard/applications",
        icon: Users,
        roles: [UserRoles.COMPANY],
    },
    {
        title: "Conventions",
        href: "/dashboard/conventions",
        icon: Book,
        roles: [UserRoles.COMPANY],
    },

    {
        title: "Profil",
        href: "/dashboard/profile",
        icon: UserRoundPen,
        roles: [UserRoles.ADMIN, UserRoles.TEACHER, UserRoles.STUDENT, UserRoles.COMPANY],
    },
]

export function getNavigationForRole(role: UserRole): NavigationItem[] {
  return navigationConfig.filter((item) => item.roles.includes(role))
}
