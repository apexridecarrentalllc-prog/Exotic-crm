export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left: branding (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-primary/90 via-primary to-primary/80 flex-col justify-center px-12 xl:px-20 text-primary-foreground">
        <div className="max-w-md">
          <h1 className="text-3xl xl:text-4xl font-bold tracking-tight">
            IE Manager
          </h1>
          <p className="mt-3 text-lg text-primary-foreground/90">
            Import/Export Business Management
          </p>
          <p className="mt-6 text-sm text-primary-foreground/80">
            Manage companies, shipments, invoices, and documents in one place.
          </p>
        </div>
      </div>
      {/* Right: form (desktop) / full width (mobile) */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
