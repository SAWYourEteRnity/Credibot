export const metadata = {
  title: "Credibot",
  description: "Therapy-style conversation prep tool",
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
        {children}
      </body>
    </html>
  );
}

