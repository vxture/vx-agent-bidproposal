import localFont from "next/font/local";
export const displayFont = localFont({
  src: "./assets/funnel-display-semibold.woff2",
  weight: "600",
  display: "swap",
  variable: "--bidproposal-entry-display",
});
export const textFont = localFont({
  src: [
    { path: "./assets/inter-regular.woff2", weight: "400" },
    { path: "./assets/inter-medium.woff2", weight: "500" },
    { path: "./assets/inter-semibold.woff2", weight: "600" },
  ],
  display: "swap",
  variable: "--bidproposal-entry-text",
});
