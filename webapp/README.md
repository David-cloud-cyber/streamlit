# MoneyPrinterTurbo Studio

Nouvelle interface Next.js pour MoneyPrinterTurbo. Elle coexiste avec l'interface Streamlit et consomme l'API FastAPI existante sous `/api/v1`.

## Demarrage

```powershell
cd webapp
npm install
copy .env.local.example .env.local
npm run dev
```

Par defaut, l'interface attend le backend sur :

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Lance aussi le backend depuis la racine du projet :

```powershell
.\.venv\Scripts\python.exe main.py
```

Streamlit peut rester disponible en fallback :

```powershell
.\.venv\Scripts\streamlit.exe run .\webui\Main.py --browser.gatherUsageStats=False --server.enableCORS=True
```
