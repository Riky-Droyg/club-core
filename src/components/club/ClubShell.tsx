"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./club.module.css";
const nav = [
  { href: "/dashboard", label: "Головна", icon: "⌂" },
  { href: "/groups", label: "Групи", icon: "◉" },
  { href: "/athletes", label: "Спортсмени", icon: "◇" },
  { href: "/calendar", label: "Календар", icon: "□" },
];
export default function ClubShell({
  children,
  clubName,
  userName,
}: {
  children: React.ReactNode;
  clubName: string;
  userName: string;
}) {
  const path = usePathname();
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.mark}>C</span>
          <span>
            <b>CLUB</b> Core
          </span>
        </Link>
        <div className={styles.club}>
          <span>КЛУБ</span>
          <strong>{clubName}</strong>
        </div>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={path.startsWith(n.href) ? styles.active : ""}
            >
              <i>{n.icon}</i>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className={styles.profile}>
          <span>
            {userName
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <strong>{userName}</strong>
            <small>Власник · Тренер</small>
          </div>
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.mobileHeader}>
          <Link href="/dashboard" className={styles.brand}>
            <span className={styles.mark}>C</span>
            <b>CLUB Core</b>
          </Link>
          <span className={styles.avatar}>{userName[0]}</span>
        </header>
        {children}
      </main>
      <nav className={styles.bottom}>
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? styles.active : ""}>
            <i>{n.icon}</i>
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
