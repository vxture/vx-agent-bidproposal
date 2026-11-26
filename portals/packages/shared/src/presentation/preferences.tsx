"use client";
import { ShellPreferencePanel, useTheme } from "@vxture/design-system";
/** Product supplies supported locale, localized copy and theme callbacks only. */
export function ProductPreferences() {
  const theme = useTheme();
  return (
    <ShellPreferencePanel
      locale="zh-CN"
      localeOptions={[
        { locale: "zh-CN", nativeName: "\u7b80\u4f53\u4e2d\u6587" },
      ]}
      onLocaleChange={() => {}}
      theme={theme.mode}
      onThemeChange={theme.setMode}
      density={theme.density}
      onDensityChange={theme.setDensity}
      fontSize={theme.fontSize}
      onFontSizeChange={theme.setFontSize}
      showContentWidth
      labels={{
        title: "\u504f\u597d\u8bbe\u7f6e",
        locale: "\u8bed\u8a00",
        theme: "\u5916\u89c2",
        density: "\u754c\u9762\u5bc6\u5ea6",
        fontSize: "\u5b57\u4f53\u5927\u5c0f",
        contentWidth: "\u5185\u5bb9\u5bbd\u5ea6",
        themeOptions: {
          system: "\u7cfb\u7edf",
          light: "\u6d45\u8272",
          dark: "\u6df1\u8272",
        },
        densityOptions: {
          compact: "\u7d27\u51d1",
          default: "\u9ed8\u8ba4",
          comfortable: "\u5bbd\u677e",
        },
        fontSizeOptions: {
          small: "\u8f83\u5c0f",
          default: "\u9ed8\u8ba4",
          large: "\u8f83\u5927",
        },
        contentWidthOptions: {
          narrow: "\u7a84\u5c4f",
          default: "\u9ed8\u8ba4",
          wide: "\u5bbd\u5c4f",
        },
      }}
    />
  );
}
