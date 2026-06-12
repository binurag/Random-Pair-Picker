import "./globals.css";

export const metadata = {
  title: "Random Pair Picker",
  description: "A simple random spin-style pair picker for Group A and Group B.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
