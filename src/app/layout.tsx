import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClubShell from "@/components/club/ClubShell";
import AuthProvider from "@/components/providers/AuthProvider";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export const metadata: Metadata = {
  title: { default: "CLUB Core", template: "%s · CLUB Core" },
  description: "Простий операційний інструмент спортивного клубу",
  manifest: "/manifest.webmanifest",
  applicationName: "CLUB Core",
  appleWebApp: { capable: true, title: "CLUB Core", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const club = user?.clubId
    ? await prisma.club.findUnique({ where: { id: user.clubId }, select: { name: true } })
    : null;
  return (
    <html lang="uk">
      <body>
        {user ? (
          <AuthProvider
            user={{ id: user.id, name: user.name, mail: user.email, url: user.image ?? undefined }}
          >
            <ClubShell clubName={club?.name ?? "CLUB Core"} userName={user.name}>
              {children}
            </ClubShell>
          </AuthProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
