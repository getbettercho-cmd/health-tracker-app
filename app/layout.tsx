export const metadata = { title: "🐯 건강관리 기록", description: "건강관리 기록 앱" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, background: "#f7f6f3", fontFamily: "-apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
