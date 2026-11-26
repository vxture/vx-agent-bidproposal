"use client";
import React, { useEffect, useState } from "react";

const headlines = [
  "\u4ece\u8fd9\u91cc\uff0c\u5f00\u59cb\u4eca\u5929\u7684\u5de5\u4f5c",
  "\u628a\u8ba1\u5212\u53d8\u6210\u4eca\u5929\u7684\u884c\u52a8",
  "\u7406\u6e05\u624b\u5934\u7684\u4e8b\uff0c\u518d\u5f80\u524d\u4e00\u6b65",
  "\u4eca\u5929\uff0c\u5148\u505a\u597d\u4e00\u4ef6\u91cd\u8981\u7684\u4e8b",
  "\u628a\u4eca\u5929\u7684\u91cd\u70b9\u6392\u4e00\u6392",
  "\u63a5\u7740\u4e0a\u6b21\u7684\u8fdb\u5ea6\uff0c\u7ee7\u7eed\u5411\u524d",
  "\u628a\u590d\u6742\u7684\u4e8b\u62c6\u6210\u4e0b\u4e00\u6b65",
  "\u96c6\u4e2d\u7cbe\u529b\uff0c\u89e3\u51b3\u773c\u524d\u7684\u95ee\u9898",
  "\u68b3\u7406\u8fdb\u5c55\uff0c\u5b89\u6392\u4e0b\u4e00\u6b65",
  "\u6309\u81ea\u5df1\u7684\u8282\u594f\uff0c\u628a\u4e8b\u60c5\u63a8\u8fdb",
];
/** A ten-day local-calendar cycle, stable through reloads and DST changes. */
export function headlineFor(date: Date) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return headlines[((day % headlines.length) + headlines.length) % headlines.length]!;
}
export function WorkspaceHeadline() {
  const [headline, setHeadline] = useState(headlines[0]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const now = new Date(), midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      setHeadline(headlineFor(now));
      timer = setTimeout(update, midnight.getTime() - now.getTime() + 50);
    };
    update();
    return () => clearTimeout(timer);
  }, []);
  return <h1>{headline}</h1>;
}
