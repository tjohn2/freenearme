import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
export const metadata={
  metadataBase:new URL("https://freenearme.netlify.app"),
  title:{default:"Free Near Me",template:"%s | Free Near Me"},
  description:"Find genuinely free events, activities, places, kids stuff, community resources, giveaways and deals near you.",
  manifest:"/manifest.webmanifest",
  openGraph:{title:"Free Near Me",description:"Everything free. One place.",url:"https://freenearme.netlify.app",siteName:"Free Near Me",type:"website"},
  twitter:{card:"summary_large_image",title:"Free Near Me",description:"Everything free. One place."}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}