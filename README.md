# Free Near Me

**The map of free.** Find genuinely $0 food, events, activities, admission and stuff around you.

## V0.1
- Browser geolocation
- 5/10/25/50 mile search
- PostGIS nationwide radius queries
- Category filtering
- Source links
- Community/business submissions
- Strict FREE vs FREE + SIGNUP model

## Local setup
1. npm install
2. Create a Supabase project and run supabase/schema.sql in SQL Editor.
3. Copy .env.example to .env.local and add Supabase credentials.
4. npm run dev

## Product rule
Main feed means **$0 out of pocket**. Offers requiring a purchase do not qualify.

## Next
Ticketmaster ingestion, verification/moderation, maps, saved items, source connectors, deduplication, PWA manifest and production deployment.
