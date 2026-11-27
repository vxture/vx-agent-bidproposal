/** Mirror published DS typography into the same-origin workflow document. */
export function syncFrameTypography(source: Document, target: Document) {
  const values = getComputedStyle(source.documentElement),
    root = target.documentElement;
  for (const token of [
    "font-sans",
    "font-brand",
    "font-mono",
    "body-font-size",
    "body-line-height",
    "body-font-weight",
    "heading-2-font-weight",
    "label-font-weight",
  ]) {
    const value = values.getPropertyValue("--" + token);
    if (value.trim()) root.style.setProperty("--" + token, value);
  }
  const faces: string[] = [];
  const visit = (rules: CSSRuleList, base: string) => {
    for (const rule of rules) {
      if (rule.type === CSSRule.FONT_FACE_RULE)
        faces.push(
          rule.cssText.replace(
            /url\((['"]?)([^)'"\s]+)\1\)/g,
            (_, quote, url) => 'url("' + new URL(url, base).href + '")',
          ),
        );
      else if ("cssRules" in rule)
        visit((rule as CSSGroupingRule).cssRules, base);
    }
  };
  for (const sheet of source.styleSheets) {
    try {
      visit(sheet.cssRules, sheet.href || source.baseURI);
    } catch {
      /* A third-party sheet is not a product font source. */
    }
  }
  let style = target.getElementById("jadera-ds-typography");
  if (!style) {
    style = target.createElement("style");
    style.id = "jadera-ds-typography";
    target.head.append(style);
  }
  style.textContent =
    faces.join("\n") +
    "\nbody{font-family:var(--font-sans);font-size:var(--body-font-size,14px)}h1,h2,h3,h4{font-family:var(--font-brand);font-weight:var(--heading-2-font-weight,600)}button,input,select,textarea{font-family:var(--font-sans)}";
}
