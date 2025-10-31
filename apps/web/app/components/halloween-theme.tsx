"use client"

// 🎃 Halloween Theme Component - Safer approach with inline styles
import { useEffect } from "react"

const halloweenThemeLight = `
  --background: oklch(0.9803 0.0053 286.3017);
  --foreground: oklch(0.1486 0.0299 282.1377);
  --card: oklch(1.0000 0 0);
  --card-foreground: var(--foreground);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: var(--foreground);
  --primary: oklch(0.6523 0.1501 62.0315);
  --primary-foreground: oklch(0 0 0);
  --secondary: oklch(0.8080 0.1140 19.5710);
  --secondary-foreground: var(--foreground);
  --muted: oklch(0.9201 0.0095 279.6801);
  --muted-foreground: oklch(0.4002 0.0490 279.3687);
  --accent: oklch(0.7191 0.0893 302.5371);
  --accent-foreground: oklch(1.0000 0 0);
  --destructive: oklch(0.5999 0.1994 30.0011);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.8495 0.0055 286.2824);
  --input: oklch(0.8495 0.0055 286.2824);
  --ring: var(--primary);
  --sidebar: var(--muted);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--accent-foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);
  --chart-1: var(--primary);
  --chart-2: oklch(0.4501 0.0995 299.8096);
  --chart-3: oklch(0.7005 0.0998 139.9098);
  --chart-4: var(--destructive);
  --chart-5: oklch(0.6021 0.1241 96.9944);
`

const halloweenThemeDark = `
  --background: oklch(0.0977 0.0230 302.0877);
  --foreground: oklch(0.9503 0.0053 286.2978);
  --card: oklch(0.1796 0.0313 301.7481);
  --card-foreground: var(--foreground);
  --popover: var(--card);
  --popover-foreground: var(--foreground);
  --primary: oklch(0.7055 0.1605 63.3177);
  --primary-foreground: oklch(0 0 0);
  --secondary: oklch(0.3960 0.1410 25.7230);
  --secondary-foreground: var(--foreground);
  --muted: oklch(0.1513 0.0239 300.3644);
  --muted-foreground: oklch(0.6008 0.0495 300.6280);
  --accent: oklch(0.4005 0.0459 139.2073);
  --accent-foreground: oklch(0.0977 0.0230 302.0877);
  --destructive: oklch(0.5999 0.1994 30.0011);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.3008 0.0493 300.5048);
  --input: oklch(0.3008 0.0493 300.5048);
  --ring: var(--primary);
  --sidebar: oklch(0.1003 0.0238 310.1818);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--accent-foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);
  --chart-1: var(--primary);
  --chart-2: oklch(0.7999 0.1006 140.0701);
  --chart-3: oklch(0.5504 0.1499 299.8670);
  --chart-4: var(--destructive);
  --chart-5: oklch(0.6021 0.1241 96.9944);
`

interface HalloweenThemeProps {
  isEnabled: boolean
}

export function HalloweenTheme({ isEnabled }: HalloweenThemeProps) {
  useEffect(() => {
    if (!isEnabled) return

    // Apply CSS variables to root
    const root = document.documentElement
    const isDarkMode =
      root.getAttribute("data-theme") === "dark" ||
      (!root.getAttribute("data-theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)

    if (isDarkMode) {
      root.style.cssText += halloweenThemeDark
    } else {
      root.style.cssText += halloweenThemeLight
    }

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const newIsDarkMode =
        root.getAttribute("data-theme") === "dark" ||
        (!root.getAttribute("data-theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)

      if (newIsDarkMode) {
        root.style.cssText = halloweenThemeDark
      } else {
        root.style.cssText = halloweenThemeLight
      }
    })

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    // Add Halloween animations
    const style = document.createElement("style")
    style.textContent = `
      @keyframes spooky-float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        25% { transform: translateY(-10px) rotate(-2deg); }
        75% { transform: translateY(-5px) rotate(2deg); }
      }
      @keyframes ghost-pulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      @keyframes witch-brew {
        0% { transform: rotate(0deg) translateX(5px); }
        25% { transform: rotate(90deg) translateX(5px); }
        50% { transform: rotate(180deg) translateX(5px); }
        75% { transform: rotate(270deg) translateX(5px); }
        100% { transform: rotate(360deg) translateX(5px); }
      }
      @keyframes bat-swarm {
        0% { transform: translateX(-100%) translateY(0px); }
        25% { transform: translateX(-50%) translateY(-20px); }
        50% { transform: translateX(0%) translateY(10px); }
        75% { transform: translateX(50%) translateY(-15px); }
        100% { transform: translateX(100%) translateY(0px); }
      }
      @keyframes fire-glow {
        0% {
          filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.6)) drop-shadow(0 0 16px rgba(255, 50, 0, 0.4));
          transform: scale(1);
        }
        25% {
          filter: drop-shadow(0 0 12px rgba(255, 120, 0, 0.8)) drop-shadow(0 0 24px rgba(255, 60, 0, 0.6));
          transform: scale(1.02);
        }
        50% {
          filter: drop-shadow(0 0 16px rgba(255, 140, 0, 1)) drop-shadow(0 0 32px rgba(255, 80, 0, 0.8));
          transform: scale(1.05);
        }
        75% {
          filter: drop-shadow(0 0 12px rgba(255, 120, 0, 0.8)) drop-shadow(0 0 24px rgba(255, 60, 0, 0.6));
          transform: scale(1.02);
        }
        100% {
          filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.6)) drop-shadow(0 0 16px rgba(255, 50, 0, 0.4));
          transform: scale(1);
        }
      }
      .spooky-float { animation: spooky-float 3s ease-in-out infinite; }
      .ghost-pulse { animation: ghost-pulse 2s ease-in-out infinite; }
      .witch-brew { animation: witch-brew 4s linear infinite; }
      .bat-swarm { animation: bat-swarm 8s linear infinite; }
      .halloween-glow { filter: drop-shadow(0 0 10px var(--primary)) drop-shadow(0 0 20px var(--accent)); }
      .animate-fire-glow { animation: fire-glow 2s ease-in-out infinite; }
      .halloween-fire-effect {
        position: relative;
        transition: all 0.3s ease;
      }
      .halloween-fire-effect::before {
        content: '';
        position: absolute;
        inset: -2px;
        background: linear-gradient(45deg, transparent, rgba(255, 100, 0, 0.1), transparent);
        border-radius: inherit;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .halloween-fire-effect:hover::before {
        opacity: 1;
        animation: fire-glow 2s ease-in-out infinite;
      }
      .blood-drip { position: relative; }
      .blood-drip::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 2px;
        height: 10px;
        background: linear-gradient(to bottom, var(--destructive), transparent);
        border-radius: 0 0 50% 50%;
      }
    `
    document.head.appendChild(style)

    return () => {
      observer.disconnect()
      document.head.removeChild(style)
    }
  }, [isEnabled])

  return null // This component doesn't render anything
}
