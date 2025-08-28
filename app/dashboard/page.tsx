"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { LogOut } from "lucide-react"

export default function DashboardPage() {
  return (
    <AuthGuard requireAuth={true}>
      <DashboardContent />
    </AuthGuard>
  )
}

function DashboardContent() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div>
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start rtl:justify-end">
              <a className="flex ms-2 md:me-24">
                <img
                  src="/img/SFAC_LOGO_Edited.png"
                  className="h-8 me-3"
                  alt="Logo"
                />
                <span className="self-center text-xl font-semibold sm:text-2xl whitespace-nowrap dark:text-white">
                  THE FRANCISCanteen Admin
                </span>
              </a>
            </div>
            <div className="flex items-center gap-4">
              {/* Show logged in user */}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name || "No Name"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-300">
                  {user?.email}
                </p>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-900 rounded hover:bg-[#a64949]"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        id="logo-sidebar"
        className="fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full border-r border-gray-200 sm:translate-x-0 dark:border-gray-700"
        aria-label="Sidebar"
        style={{ backgroundColor: "#670E10", color: "#fff" }}
      >
        <div className="h-full px-3 pb-4 overflow-y-auto">
          <ul className="space-y-2 font-medium">
            <li>
              <a href="#" className="flex items-center p-2 rounded-lg hover:bg-[#8B1C20]">
                <span className="flex-1 ms-3 whitespace-nowrap">
                  Transaction History
                </span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center p-2 rounded-lg hover:bg-[#8B1C20]">
                <span className="flex-1 ms-3 whitespace-nowrap">Users</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="sm:ml-64">
        <section className="text-gray-600 body-font">
          <div className="container px-5 py-24 mx-auto">
            <div className="flex flex-wrap -mx-4 -mb-10 text-center">
              <div className="sm:w-1/2 mb-10 px-4">
                <div className="rounded-lg h-64 overflow-hidden">
                  <img
                    alt="content"
                    className="object-cover object-center h-full w-full"
                    src="/img/SWASTIKA.png"
                  />
                </div>
                <h2 className="title-font text-2xl font-medium text-gray-900 mt-6 mb-3">
                  Buy YouTube Videos
                </h2>
                <div className="text-center">
                  <button
                    className="flex mx-auto mt-6 text-white bg-red-900 border-0 py-2 px-5 focus:outline-none hover:bg-[#a64949] rounded"
                    type="button"
                  >
                    Manage this order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
