import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import Header from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider" // Import Provider

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Attribute "class" penting agar Tailwind dark mode bekerja
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Pastikan Header menerima props atau memiliki ModeToggle di dalamnya */}
          <Header /> 
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-zinc-50 dark:bg-black transition-colors duration-300">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  )
}