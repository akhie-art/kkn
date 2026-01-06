export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        {children}
      </div>
    </div>
  )
}