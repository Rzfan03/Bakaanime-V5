import { Home, Search, History, User } from "lucide-react"
import { NavLink } from "react-router"
import { useAuth } from "../lib/auth"

const tabs = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/search', label: 'Cari', icon: Search },
  { to: '/library', label: 'Library', icon: History },
  { to: '/profile', label: 'Profile', icon: User },
]

const Navigation = () => {
  const { user } = useAuth()
  const avatar = user?.avatar ?? null

  return (
    <nav className="pointer-events-none z-50 fixed inset-x-0 bottom-0 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <ul className="pointer-events-auto flex items-center gap-1 rounded-full bg-[#2B2930] p-2 shadow-lg shadow-black/40">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex h-12 items-center rounded-full px-3.5 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[#EADDFF] ${
                  isActive
                    ? 'bg-[#D0BCFF] hover:bg-[#DCCBFF]'
                    : 'bg-transparent hover:bg-[#D0BCFF]/[0.08]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {to === '/profile' && avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      className={`h-6 w-6 shrink-0 rounded-full object-cover ring-2 ${
                        isActive ? 'ring-[#381E72]' : 'ring-[#D0BCFF]/50'
                      }`}
                    />
                  ) : (
                    <Icon
                      size={24}
                      className={isActive ? 'text-[#381E72]' : 'text-[#CAC4D0]'}
                    />
                  )}
                  <span
                    className={`overflow-hidden whitespace-nowrap text-sm font-semibold text-[#381E72] transition-all duration-300 ${
                      isActive ? 'max-w-24 pl-2 opacity-100' : 'max-w-0 pl-0 opacity-0'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Navigation