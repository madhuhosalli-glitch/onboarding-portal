ONBOARDING PORTAL - GITHUB + CLOUDFLARE DEPLOYMENT GUIDE

Purpose:
This pack is for changing your current manual workflow:

Old workflow:
1. ChatGPT gives code
2. You copy into text files
3. You manually upload to GitHub
4. Netlify deploys

New workflow:
1. Files are kept in one project folder on your computer
2. You run one push script or use GitHub Desktop
3. Code goes to GitHub automatically
4. Cloudflare Pages deploys automatically

Recommended setup:
Frontend: Next.js
Database/Auth/Storage: Supabase
Hosting: Cloudflare Pages
Security layer: Cloudflare WAF + Zero Trust where required
Version control: GitHub

IMPORTANT:
Do not upload .env.local, Supabase service role keys, Aadhaar/PAN data, employee documents, or database backups to GitHub.
Use .gitignore properly.

ONE-TIME SETUP:
1. Install Git
   https://git-scm.com/downloads

2. Install GitHub Desktop
   https://desktop.github.com/

3. Create a private GitHub repository
   Example name:
   bvc-onboarding-portal

4. Put all portal files into one folder
   Example:
   C:\BVC-Onboarding-Portal

5. Add .gitignore from this pack into the project folder.

6. Open GitHub Desktop
   File > Add local repository
   Select:
   C:\BVC-Onboarding-Portal

7. Publish repository
   Keep it PRIVATE.

8. Open Cloudflare Dashboard
   Workers & Pages > Create > Pages > Connect to Git

9. Select your GitHub repository.

10. Build settings for a normal Next.js project:
    Framework preset: Next.js
    Build command: npm run build
    Output directory:
       If static export: out
       If Cloudflare Next.js adapter is used: follow Cloudflare's Next.js guide

11. Add environment variables in Cloudflare:
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY

12. Do NOT add service role key to frontend public variables.

DAILY WORKFLOW:
1. Make changes in the project folder
2. Open GitHub Desktop
3. Commit changes
4. Click Push origin
5. Cloudflare automatically deploys

OR use:
push_to_github.bat

SECURITY CHECKLIST:
1. GitHub repository must be private.
2. .env.local must not be committed.
3. Supabase buckets must be private.
4. RLS must be enabled on all sensitive tables.
5. Aadhaar/PAN documents must not be stored in public buckets.
6. Admin panel should be protected.
7. Cloudflare WAF should be enabled.
8. Admin access can be protected using Cloudflare Zero Trust.
