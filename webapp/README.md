# MoneyPrinterTurbo Studio

Nouvelle interface React + Vite pour MoneyPrinterTurbo. Elle coexiste avec l'interface Streamlit et consomme l'API FastAPI existante sous `/api/v1`.

## Demarrage

```powershell
cd webapp
npm install
copy .env.local.example .env.local
npm run dev
```

Par defaut, l'interface attend le backend sur :

```text
VITE_API_BASE_URL=http://localhost:8080
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Lance aussi le backend depuis la racine du projet :

```powershell
.\.venv\Scripts\python.exe main.py
```

Streamlit peut rester disponible en fallback :

```powershell
.\.venv\Scripts\streamlit.exe run .\webui\Main.py --browser.gatherUsageStats=False --server.enableCORS=True
```

## Supabase et IA hybride

La version SaaS utilise Supabase Auth pour la connexion email/mot de passe. Les cles OpenAI ou Claude ajoutees par l'utilisateur sont envoyees au backend FastAPI, puis stockees dans Supabase Vault via la cle serveur. Elles ne sont jamais retournees au navigateur.

Si l'utilisateur n'ajoute pas de cle personnelle, le backend utilise le secret plateforme OpenRouter nomme `platform_openrouter_api_key`, avec le quota defini par `FREE_OPENROUTER_DAILY_QUOTA`.

Cote backend, prends `.env.saas.example` comme base et garde `SUPABASE_SERVICE_ROLE_KEY` hors du frontend.

Pour creer le secret OpenRouter plateforme dans Supabase Vault, execute dans le SQL editor Supabase en remplacant le placeholder par ta vraie cle :

```sql
select vault.create_secret(
  'OPENROUTER_API_KEY_A_REMPLACER',
  'platform_openrouter_api_key',
  'Fallback OpenRouter platform key for free quota'
);
```

## Deploiement Vercel

Vercel doit construire uniquement l'app Vite statique. Le fichier `vercel.json` a la racine force le build depuis `webapp/`, `.vercelignore` exclut le backend Python, et `.python-version` est en `3.12` pour eviter l'erreur `vercel-runtime==0.14.0` si Vercel detecte quand meme un runtime Python.

Dans le dashboard Vercel, le reglage recommande reste :

```text
Root Directory: webapp
Install Command: npm install
Build Command: npm run build
Output Directory: dist
Framework Preset: Vite
```

Le backend FastAPI doit rester sur Railway, Render, VPS ou Docker, puis son URL publique doit etre mise dans `VITE_API_BASE_URL`.

Si Vercel affiche encore l'ancienne erreur Python, relance un deploy avec cache vide dans le dashboard Vercel, puis verifie que le projet Git utilise bien la derniere version de `.python-version`.
