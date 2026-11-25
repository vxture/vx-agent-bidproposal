"use client";

/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Entry
 * @author AI-Generated
 * @date 2026-11-24
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import localFont from "next/font/local";
import { useTheme } from "next-themes";
import { Globe, House, Moon, Sun } from "@phosphor-icons/react";
import { BRAND } from "@bidproposal/shared/brand";
import type { EntryLocale } from "./entry-content";
import { ProductIdentity } from "./product-identity";
import "./gate.css";

const displayFont = localFont({ src: "./assets/funnel-display-semibold.woff2", weight: "600", display: "swap", variable: "--bidproposal-entry-display" });
const textFont = localFont({ src: [
  { path: "./assets/inter-regular.woff2", weight: "400" },
  { path: "./assets/inter-medium.woff2", weight: "500" },
  { path: "./assets/inter-semibold.woff2", weight: "600" },
], display: "swap", variable: "--bidproposal-entry-text" });

const LocaleContext = createContext<EntryLocale>("zh-CN");
export function useEntryLocale(): EntryLocale { return useContext(LocaleContext); }

// --- Platform identity ------------------------------------------------------

function PlatformMark() {
  return <svg width="24" height="24" viewBox="0 0 256 256" fill="none" aria-hidden="true">
    <defs>
      <clipPath id="bid-entry-left"><path d="M59.4 89.2 26.8 121.8 65 159.9 97.6 127.2Z" /></clipPath>
      <clipPath id="bid-entry-right"><path d="m196.6 166.8 32.6-32.6-38.1-38.1-32.7 32.7Z" /></clipPath>
    </defs>
    <path fill="#0052D9" fillRule="evenodd" d="M143.3 19.3 19.3 143.3a66 66 0 0 0 93.4 93.4l124-124a66 66 0 0 0-93.4-93.4Zm31.1 31.1-124 124a22 22 0 0 0 31.2 31.2l124-124a22 22 0 0 0-31.2-31.2Z" />
    <path fill="#B5C7FF" fillRule="evenodd" d="m19.3 112.7 124 124a66 66 0 0 0 93.4-93.4l-124-124a66 66 0 0 0-93.4 93.4Zm31.1-31.1 124 124a22 22 0 0 0 31.2-31.2l-124-124a22 22 0 0 0-31.2 31.2Z" />
    {["bid-entry-left", "bid-entry-right"].map(id => <path key={id} clipPath={`url(#${id})`} fill="#0052D9" fillRule="evenodd" d="M143.3 19.3 19.3 143.3a66 66 0 0 0 93.4 93.4l124-124a66 66 0 0 0-93.4-93.4Zm31.1 31.1-124 124a22 22 0 0 0 31.2 31.2l124-124a22 22 0 0 0-31.2-31.2Z" />)}
  </svg>;
}

// --- Shared public chrome ---------------------------------------------------

function EntryBackdrop() {
  return <svg className="bid-entry-backdrop" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <pattern id="bid-entry-grid" width="120" height="120" patternTransform="rotate(-28)" patternUnits="userSpaceOnUse">
        <path d="M120 0H0v120" stroke="currentColor" strokeOpacity=".055" />
      </pattern>
    </defs>
    <rect width="1600" height="1000" fill="url(#bid-entry-grid)" />
    <g stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity=".11">
      <g transform="translate(330 350) scale(.6) rotate(-18 160 170)" opacity=".6">
        <rect x="26" y="26" width="230" height="308" rx="12" fill="currentColor" fillOpacity=".06" />
        <path d="M12 0h166l52 52v244a12 12 0 0 1-12 12H12a12 12 0 0 1-12-12V12A12 12 0 0 1 12 0Z" />
        <path d="M178 0v40a12 12 0 0 0 12 12h40M32 96h122M32 126h166M32 156h166M32 186h132M32 232h82" />
      </g>
      <g transform="translate(1090 300) rotate(16 90 125)">
        <path d="M10 0h122l48 48v192a10 10 0 0 1-10 10H10a10 10 0 0 1-10-10V10A10 10 0 0 1 10 0Z" fill="currentColor" fillOpacity=".05" />
        <path d="M132 0v38a10 10 0 0 0 10 10h38M26 88h128M26 116h128M26 144h92M26 192h60" />
      </g>
      <path d="M-80 760 210 610l220 112 180-92M1150 190l220 116 290-150M1120 810l230-122 290 146" strokeDasharray="7 10" />
      <path d="m-60 870 330-174 330 174-330 174ZM0 870l270-142 270 142M60 870l210-110 210 110M120 870l150-78 150 78" strokeOpacity=".55" />
      <circle cx="210" cy="610" r="6" fill="currentColor" fillOpacity=".15" />
      <circle cx="430" cy="722" r="4" />
      <circle cx="1370" cy="306" r="6" />
      <circle cx="1350" cy="688" r="5" fill="currentColor" fillOpacity=".15" />
    </g>
  </svg>;
}

export function EntryShell({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, setLocale] = useState<EntryLocale>("zh-CN");
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const zh = locale === "zh-CN";
  useEffect(() => { setMounted(true); }, []);

  return <LocaleContext.Provider value={locale}>
    <div className={`bid-entry-shell ${displayFont.variable} ${textFont.variable}`} lang={locale}>
      <EntryBackdrop />
      <a className="bid-entry-skip" href="#bid-entry-main">{zh ? "\u8df3\u81f3\u4e3b\u8981\u5185\u5bb9" : "Skip to content"}</a>
      <header className="bid-entry-header">
        <div className="bid-entry-width">
          <div className="bid-entry-brands">
            <a className="bid-entry-platform" href="https://ruyin.work/" aria-label={zh ? "RUYIN \u5de5\u4f5c\u53f0" : "RUYIN Workbench"}>
              <PlatformMark /><span>Ruyin</span>
            </a>
            <span className="bid-entry-divider" aria-hidden="true" />
            <a className="bid-entry-product" href="/" aria-label={zh ? `${BRAND.chineseName} \u9996\u9875` : `${BRAND.displayName} home`} title={BRAND.fullName}>
              <ProductIdentity />
            </a>
          </div>
          <fieldset className="bid-entry-tools" aria-label={zh ? "\u663e\u793a\u4e0e\u8bed\u8a00" : "Display and language"}>
            <button type="button" disabled={!mounted} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label={zh ? "\u5207\u6362\u4e3b\u9898" : "Toggle theme"} title={zh ? "\u5207\u6362\u4e3b\u9898" : "Toggle theme"}>
              {mounted && resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button type="button" onClick={() => setLocale(zh ? "en" : "zh-CN")} aria-label={zh ? "Switch to English" : "\u5207\u6362\u4e3a\u4e2d\u6587"} title={zh ? "English" : "\u4e2d\u6587"}>
              <Globe size={16} />
            </button>
            <a href="https://vxture.com/" target="_blank" rel="noopener noreferrer" aria-label={zh ? "VXTURE \u4e3b\u7ad9\uff08\u65b0\u6807\u7b7e\u9875\uff09" : "VXTURE website (new tab)"} title={zh ? "VXTURE \u4e3b\u7ad9" : "VXTURE website"}><House size={16} /></a>
          </fieldset>
        </div>
      </header>
      <main id="bid-entry-main" className="bid-entry-main">
        <div className="bid-entry-composition">
          <p className="bid-entry-eyebrow" lang="en">PROPOSAL INTELLIGENCE</p>
          {children}
          <div className="bid-entry-message">
            <p lang="zh-CN">{"\u4ece\u62db\u6807\u89e3\u8bfb\uff0c\u5230\u4e13\u4e1a\u6210\u7a3f"}</p>
            <span lang="en">FROM REQUIREMENTS TO PROPOSALS.</span>
          </div>
        </div>
      </main>
      <footer className="bid-entry-footer">
        <div className="bid-entry-width">
          <span>{`\u00a9 ${new Date().getFullYear()} VXTURE \u00b7 RUYIN`}</span>
          <EntryLegalLinks />
        </div>
      </footer>
    </div>
  </LocaleContext.Provider>;
}

function EntryLegalLinks() {
  const zh = useEntryLocale() === "zh-CN";
  const links = [["terms", zh ? "\u670d\u52a1\u6761\u6b3e" : "Terms"], ["privacy", zh ? "\u9690\u79c1\u653f\u7b56" : "Privacy"], ["copyright", zh ? "\u7248\u6743\u58f0\u660e" : "Copyright"]];
  return <nav aria-label={zh ? "\u6cd5\u5f8b\u4fe1\u606f" : "Legal information"}>
    {links.map(([slug, label]) => <a key={slug} href={`https://vxture.com/legal/${slug}`} target="_blank" rel="noopener noreferrer">{label}</a>)}
  </nav>;
}
