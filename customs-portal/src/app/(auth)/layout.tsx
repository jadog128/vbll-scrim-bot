import Providers from "@/components/Providers";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <Providers>{children}</Providers>
    </div>
  );
}
