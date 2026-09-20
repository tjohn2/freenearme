import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
export const metadata={title:"Free Near Me",description:"Find genuinely free things near you."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}