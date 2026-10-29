"use client";

import type { Session } from "@supabase/supabase-js";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Cpu,
  Download,
  FileAudio,
  Film,
  FolderUp,
  Gauge,
  ImagePlus,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mic2,
  Music2,
  Play,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  Wand2
} from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  absoluteMediaUrl,
  api,
  AiProvider,
  AiProviderInput,
  AiProviderKind,
  AiQuota,
  AssetFile,
  TaskRecord,
  VideoRequest
} from "./lib/api";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "./lib/supabase";

type ViewKey = "studio" | "tasks" | "media" | "settings";
type Toast = { tone: "success" | "error" | "info"; message: string } | null;
type AuthMode = "signin" | "signup";

const supabaseEnabled = isSupabaseConfigured();

const providerDefaults: Record<AiProviderKind, { label: string; model: string; baseUrl: string }> = {
  openai: {
    label: "OpenAI personnel",
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1"
  },
  anthropic: {
    label: "Claude personnel",
    model: "anthropic/claude-3-5-haiku-20241022",
    baseUrl: ""
  }
};

const initialProviderForm: AiProviderInput = {
  provider: "openai",
  label: providerDefaults.openai.label,
  api_key: "",
  model_name: providerDefaults.openai.model,
  base_url: providerDefaults.openai.baseUrl,
  is_default: true
};

const initialForm: VideoRequest = {
  video_subject: "",
  video_script: "",
  video_terms: "",
  video_aspect: "9:16",
  video_concat_mode: "random",
  video_transition_mode: null,
  video_clip_duration: 5,
  video_count: 1,
  video_source: "pexels",
  video_materials: null,
  video_language: "fr-FR",
  voice_name: "fr-FR-DeniseNeural-Female",
  voice_volume: 1,
  voice_rate: 1,
  bgm_type: "random",
  bgm_file: "",
  bgm_volume: 0.2,
  subtitle_enabled: true,
  subtitle_position: "bottom",
  custom_position: 70,
  font_name: "STHeitiMedium.ttc",
  text_fore_color: "#FFFFFF",
  text_background_color: true,
  font_size: 60,
  stroke_color: "#000000",
  stroke_width: 1.5,
  paragraph_number: 1
};

const navItems = [
  { key: "studio", label: "Studio", icon: Clapperboard },
  { key: "tasks", label: "Taches", icon: Activity },
  { key: "media", label: "Medias", icon: ImagePlus },
  { key: "settings", label: "Reglages", icon: Settings }
] as const;

function taskLabel(task?: TaskRecord) {
  if (!task) return "Aucune tache";
  if (task.state === 1) return "Terminee";
  if (task.state === -1) return "Echec";
  return "En cours";
}

function taskTone(task?: TaskRecord) {
  if (!task) return "text-muted";
  if (task.state === 1) return "text-mint-600";
  if (task.state === -1) return "text-red-600";
  return "text-brand-600";
}

function fileSize(size: number) {
  if (!Number.isFinite(size)) return "-";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function Home() {
  const supabase = useMemo(
    () => (supabaseEnabled ? createSupabaseBrowserClient() : null),
    []
  );
  const [authReady, setAuthReady] = useState(!supabaseEnabled);
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [view, setView] = useState<ViewKey>("studio");
  const [apiOnline, setApiOnline] = useState(false);
  const [apiChecking, setApiChecking] = useState(true);
  const [form, setForm] = useState<VideoRequest>(initialForm);
  const [providerForm, setProviderForm] = useState<AiProviderInput>(initialProviderForm);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [activeTask, setActiveTask] = useState<TaskRecord | undefined>();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [materials, setMaterials] = useState<AssetFile[]>([]);
  const [musics, setMusics] = useState<AssetFile[]>([]);

  const accessToken = session?.access_token;
  const hasPrompt = Boolean(form.video_subject.trim() || form.video_script.trim());
  const activeProvider = providers.find((provider) => provider.enabled && provider.is_default) || providers.find((provider) => provider.enabled);
  const terms = useMemo(
    () =>
      (form.video_terms || "")
        .split(",")
        .map((term) => term.trim())
        .filter(Boolean),
    [form.video_terms]
  );
  const finalVideos = activeTask?.videos || [];
  const quotaLabel = quota?.auth_enabled
    ? `${quota.remaining}/${quota.limit} generations gratuites`
    : "Mode local";
  const aiMode = activeProvider
    ? `${activeProvider.label} (${activeProvider.provider === "anthropic" ? "Claude" : "OpenAI"})`
    : quota?.remaining
      ? "Quota gratuit OpenRouter"
      : "Aucune cle IA active";

  function patchForm(patch: Partial<VideoRequest>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function patchProviderForm(patch: Partial<AiProviderInput>) {
    setProviderForm((current) => ({ ...current, ...patch }));
  }

  function showToast(next: Toast) {
    setToast(next);
    if (next) {
      window.setTimeout(() => setToast(null), 4200);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function refreshApi() {
    setApiChecking(true);
    const ok = await api.ping(accessToken);
    setApiOnline(ok);
    setApiChecking(false);
  }

  async function refreshSaasState() {
    if (!accessToken) {
      setProviders([]);
      setQuota(null);
      return;
    }

    try {
      const [providerData, quotaData] = await Promise.all([
        api.getAiProviders(accessToken),
        api.getAiQuota(accessToken)
      ]);
      setProviders(providerData.providers || []);
      setQuota(quotaData);
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Impossible de charger les reglages IA"
      });
    }
  }

  async function refreshTasks() {
    if (supabaseEnabled && !accessToken) return;
    try {
      const data = await api.getTasks(1, 12, accessToken);
      setTasks(data.tasks || []);
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Impossible de charger les taches"
      });
    }
  }

  async function refreshAssets() {
    if (supabaseEnabled && !accessToken) return;
    try {
      const [materialData, musicData] = await Promise.all([
        api.getMaterials(accessToken),
        api.getMusics(accessToken)
      ]);
      setMaterials(materialData.files || []);
      setMusics(musicData.files || []);
    } catch {
      // Asset endpoints are optional for the studio.
    }
  }

  useEffect(() => {
    if (!authReady) return;
    refreshApi();
    refreshTasks();
    refreshAssets();
    refreshSaasState();
  }, [authReady, accessToken]);

  useEffect(() => {
    if (!activeTaskId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const task = await api.getTask(activeTaskId, accessToken);
        if (!cancelled) {
          setActiveTask(task);
          if (task.state === 1 || task.state === -1) {
            refreshTasks();
            return;
          }
          window.setTimeout(tick, 2000);
        }
      } catch (error) {
        if (!cancelled) {
          showToast({
            tone: "error",
            message:
              error instanceof Error ? error.message : "Impossible de suivre la tache"
          });
        }
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [activeTaskId, accessToken]);

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy("auth");
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        showToast({ tone: "success", message: "Compte cree. Verifie ton email si Supabase le demande." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        showToast({ tone: "success", message: "Session ouverte." });
      }
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Connexion impossible"
      });
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProviders([]);
    setQuota(null);
    setTasks([]);
    setActiveTask(undefined);
    setActiveTaskId("");
  }

  async function generateScript() {
    if (!form.video_subject.trim()) {
      showToast({ tone: "error", message: "Ajoute un sujet avant de generer le script." });
      return;
    }
    setBusy("script");
    try {
      const data = await api.createScript({
        video_subject: form.video_subject,
        video_language: form.video_language,
        paragraph_number: form.paragraph_number
      }, accessToken);
      patchForm({ video_script: data.video_script });
      await refreshSaasState();
      showToast({ tone: "success", message: "Script genere." });
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Generation du script impossible"
      });
    } finally {
      setBusy(null);
    }
  }

  async function generateTerms() {
    if (!form.video_script.trim()) {
      showToast({ tone: "error", message: "Ajoute un script avant les mots-cles." });
      return;
    }
    setBusy("terms");
    try {
      const data = await api.createTerms({
        video_subject: form.video_subject,
        video_script: form.video_script,
        amount: 5
      }, accessToken);
      patchForm({ video_terms: data.video_terms.join(", ") });
      await refreshSaasState();
      showToast({ tone: "success", message: "Mots-cles generes." });
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Generation des mots-cles impossible"
      });
    } finally {
      setBusy(null);
    }
  }

  async function createVideo(event?: FormEvent) {
    event?.preventDefault();
    if (!hasPrompt) {
      showToast({
        tone: "error",
        message: "Le sujet ou le script doit etre renseigne avant de generer."
      });
      return;
    }
    if (supabaseEnabled && !activeProvider && quota?.remaining === 0) {
      showToast({
        tone: "error",
        message: "Ajoute une cle OpenAI/Claude ou attends le prochain quota gratuit."
      });
      return;
    }
    setBusy("video");
    try {
      const task = await api.createVideo(form, accessToken);
      setActiveTaskId(task.task_id);
      setActiveTask({ task_id: task.task_id, state: 4, progress: 5 });
      setView("tasks");
      await refreshSaasState();
      showToast({ tone: "success", message: "Tache video creee." });
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Generation video impossible"
      });
    } finally {
      setBusy(null);
    }
  }

  async function saveProvider(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      showToast({ tone: "error", message: "Connecte-toi avant d'ajouter une cle." });
      return;
    }
    if (!providerForm.api_key.trim()) {
      showToast({ tone: "error", message: "La cle API est obligatoire." });
      return;
    }
    setBusy("provider");
    try {
      await api.createAiProvider(providerForm, accessToken);
      setProviderForm({
        ...providerForm,
        api_key: ""
      });
      await refreshSaasState();
      showToast({ tone: "success", message: "Cle IA chiffree et activee." });
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Enregistrement impossible"
      });
    } finally {
      setBusy(null);
    }
  }

  async function setDefaultProvider(provider: AiProvider) {
    if (!accessToken) return;
    setBusy(`default-${provider.id}`);
    try {
      await api.updateAiProvider(provider.id, { is_default: true, enabled: true }, accessToken);
      await refreshSaasState();
      showToast({ tone: "success", message: "Provider actif mis a jour." });
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Mise a jour impossible"
      });
    } finally {
      setBusy(null);
    }
  }

  async function deleteProvider(providerId: string) {
    if (!accessToken) return;
    setBusy(`provider-delete-${providerId}`);
    try {
      await api.deleteAiProvider(providerId, accessToken);
      await refreshSaasState();
      showToast({ tone: "success", message: "Cle IA supprimee." });
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Suppression impossible"
      });
    } finally {
      setBusy(null);
    }
  }

  async function uploadAsset(
    event: ChangeEvent<HTMLInputElement>,
    kind: "material" | "music"
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(kind);
    try {
      if (kind === "material") {
        await api.uploadMaterial(file, accessToken);
      } else {
        await api.uploadMusic(file, accessToken);
      }
      await refreshAssets();
      showToast({ tone: "success", message: "Fichier importe." });
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Upload impossible"
      });
    } finally {
      setBusy(null);
      event.target.value = "";
    }
  }

  async function deleteTask(taskId: string) {
    setBusy(`delete-${taskId}`);
    try {
      await api.deleteTask(taskId, accessToken);
      if (activeTaskId === taskId) {
        setActiveTaskId("");
        setActiveTask(undefined);
      }
      await refreshTasks();
      showToast({ tone: "success", message: "Tache supprimee." });
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Suppression impossible"
      });
    } finally {
      setBusy(null);
    }
  }

  function changeProviderKind(provider: AiProviderKind) {
    const defaults = providerDefaults[provider];
    setProviderForm({
      ...providerForm,
      provider,
      label: defaults.label,
      model_name: defaults.model,
      base_url: defaults.baseUrl
    });
  }

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-page">
        <Loader2 className="animate-spin text-brand-700" size={28} />
      </main>
    );
  }

  if (supabaseEnabled && !session) {
    return (
      <AuthScreen
        mode={authMode}
        email={authEmail}
        password={authPassword}
        busy={busy === "auth"}
        toast={toast}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={submitAuth}
      />
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Film size={22} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">
              MoneyPrinter
            </p>
            <h1 className="text-xl font-black text-ink">Studio SaaS</h1>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              className="nav-item"
              data-active={view === item.key}
              aria-current={view === item.key ? "page" : undefined}
              onClick={() => setView(item.key)}
            >
              <item.icon size={18} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-8 rounded-xl border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-muted">
              Backend
            </span>
            <span
              className={apiOnline ? "text-mint-600" : "text-red-600"}
              title={apiOnline ? "API connectee" : "API hors ligne"}
              aria-label={apiOnline ? "API connectee" : "API hors ligne"}
            >
              {apiOnline ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            </span>
          </div>
          <p className="break-all text-sm font-bold text-ink">{api.baseUrl}</p>
          <button className="btn btn-secondary mt-4 w-full" onClick={refreshApi}>
            <RefreshCcw size={16} />
            Tester l'API
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">
            IA
          </p>
          <p className="mt-2 text-sm font-black text-ink">{aiMode}</p>
          <p className="mt-1 text-sm font-semibold text-muted">{quotaLabel}</p>
        </div>
      </aside>

      <section className="main-shell">
        <header className="topbar">
          <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-muted">
                Studio de generation video automatisee
              </p>
              <h2 className="text-2xl font-black text-ink">
                Creer, suivre et exporter des shorts en un seul espace
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">
                <Gauge size={15} />
                {apiChecking ? "Verification..." : apiOnline ? "API connectee" : "API hors ligne"}
              </span>
              <span className="badge">
                <User size={15} />
                {session?.user.email || "Local"}
              </span>
              <span className="badge">FR</span>
              {supabaseEnabled && (
                <button className="btn btn-secondary" onClick={signOut}>
                  <LogOut size={17} />
                  Quitter
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setView("studio")}>
                <Sparkles size={17} />
                Nouveau projet
              </button>
            </div>
          </div>
        </header>

        <div className="px-6 py-6">
          {toast && (
            <div
              role="status"
              aria-live="polite"
              className={`mb-5 rounded-xl border px-4 py-3 text-sm font-bold ${
                toast.tone === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : toast.tone === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-brand-100 bg-brand-50 text-brand-700"
              }`}
            >
              {toast.message}
            </div>
          )}

          {view === "studio" && (
            <form className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" onSubmit={createVideo}>
              <div className="space-y-5">
                <section className="surface rounded-2xl p-5">
                  <SectionTitle
                    icon={<Wand2 size={20} />}
                    title="Idee et script"
                    subtitle="Commence par un sujet, puis laisse l'IA preparer le texte et les mots-cles."
                  />
                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <Field label="Sujet de la video">
                      <input
                        className="field"
                        placeholder="Ex: 5 habitudes simples pour economiser chaque mois"
                        value={form.video_subject}
                        onChange={(event) => patchForm({ video_subject: event.target.value })}
                      />
                    </Field>
                    <Field label="Langue du script">
                      <select
                        className="field"
                        value={form.video_language}
                        onChange={(event) => patchForm({ video_language: event.target.value })}
                      >
                        <option value="fr-FR">Francais</option>
                        <option value="en-US">Anglais</option>
                        <option value="">Detection auto</option>
                      </select>
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={generateScript}
                      disabled={busy === "script"}
                    >
                      {busy === "script" ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
                      Generer script + structure
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={generateTerms}
                      disabled={busy === "terms"}
                    >
                      {busy === "terms" ? <Loader2 className="animate-spin" size={17} /> : <Wand2 size={17} />}
                      Generer les mots-cles
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <Field label="Script video">
                      <textarea
                        className="field min-h-44 resize-y"
                        value={form.video_script}
                        onChange={(event) => patchForm({ video_script: event.target.value })}
                        placeholder="Le script peut etre genere automatiquement ou colle ici."
                      />
                    </Field>
                    <Field label="Mots-cles video">
                      <textarea
                        className="field min-h-44 resize-y"
                        value={form.video_terms}
                        onChange={(event) => patchForm({ video_terms: event.target.value })}
                        placeholder="finance, savings, business, productivity"
                      />
                    </Field>
                  </div>
                </section>

                <section className="surface rounded-2xl p-5">
                  <SectionTitle
                    icon={<Clapperboard size={20} />}
                    title="Format et sources"
                    subtitle="Choisis le format final, la source des plans et la cadence du montage."
                  />
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Format">
                      <select
                        className="field"
                        value={form.video_aspect}
                        onChange={(event) =>
                          patchForm({ video_aspect: event.target.value as VideoRequest["video_aspect"] })
                        }
                      >
                        <option value="9:16">Portrait 9:16</option>
                        <option value="16:9">Paysage 16:9</option>
                        <option value="1:1">Carre 1:1</option>
                      </select>
                    </Field>
                    <Field label="Source media">
                      <select
                        className="field"
                        value={form.video_source}
                        onChange={(event) =>
                          patchForm({ video_source: event.target.value as VideoRequest["video_source"] })
                        }
                      >
                        <option value="pexels">Pexels</option>
                        <option value="pixabay">Pixabay</option>
                        <option value="local">Fichiers locaux</option>
                      </select>
                    </Field>
                    <Field label="Duree max clip">
                      <select
                        className="field"
                        value={form.video_clip_duration}
                        onChange={(event) =>
                          patchForm({ video_clip_duration: Number(event.target.value) })
                        }
                      >
                        {[2, 3, 4, 5, 6, 8, 10].map((value) => (
                          <option value={value} key={value}>
                            {value}s
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Variantes">
                      <select
                        className="field"
                        value={form.video_count}
                        onChange={(event) => patchForm({ video_count: Number(event.target.value) })}
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option value={value} key={value}>
                            {value} video{value > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </section>

                <section className="surface rounded-2xl p-5">
                  <SectionTitle
                    icon={<Mic2 size={20} />}
                    title="Voix, musique et sous-titres"
                    subtitle="Regle la narration, la musique de fond et la lisibilite des sous-titres."
                  />
                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <Field label="Voix TTS">
                      <input
                        className="field"
                        value={form.voice_name}
                        onChange={(event) => patchForm({ voice_name: event.target.value })}
                      />
                    </Field>
                    <Field label="Volume voix">
                      <input
                        className="field"
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={form.voice_volume}
                        onChange={(event) => patchForm({ voice_volume: Number(event.target.value) })}
                      />
                    </Field>
                    <Field label="Vitesse voix">
                      <input
                        className="field"
                        type="number"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={form.voice_rate}
                        onChange={(event) => patchForm({ voice_rate: Number(event.target.value) })}
                      />
                    </Field>
                    <Field label="Musique">
                      <select
                        className="field"
                        value={form.bgm_type}
                        onChange={(event) =>
                          patchForm({ bgm_type: event.target.value as VideoRequest["bgm_type"] })
                        }
                      >
                        <option value="random">Aleatoire</option>
                        <option value="none">Aucune</option>
                        <option value="custom">Personnalisee</option>
                      </select>
                    </Field>
                    <Field label="Fichier musique">
                      <select
                        className="field"
                        value={form.bgm_file}
                        onChange={(event) => patchForm({ bgm_file: event.target.value })}
                      >
                        <option value="">Selectionner</option>
                        {musics.map((music) => (
                          <option key={music.file} value={music.file}>
                            {music.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Sous-titres">
                      <select
                        className="field"
                        value={form.subtitle_enabled ? "on" : "off"}
                        onChange={(event) =>
                          patchForm({ subtitle_enabled: event.target.value === "on" })
                        }
                      >
                        <option value="on">Actives</option>
                        <option value="off">Desactives</option>
                      </select>
                    </Field>
                    <Field label="Position sous-titres">
                      <select
                        className="field"
                        value={form.subtitle_position}
                        onChange={(event) =>
                          patchForm({
                            subtitle_position: event.target.value as VideoRequest["subtitle_position"]
                          })
                        }
                      >
                        <option value="bottom">Bas</option>
                        <option value="center">Centre</option>
                        <option value="top">Haut</option>
                        <option value="custom">Personnalisee</option>
                      </select>
                    </Field>
                    <Field label="Couleur texte">
                      <input
                        className="field h-11"
                        type="color"
                        value={form.text_fore_color}
                        onChange={(event) => patchForm({ text_fore_color: event.target.value })}
                      />
                    </Field>
                    <Field label="Taille police">
                      <input
                        className="field"
                        type="number"
                        min="30"
                        max="100"
                        value={form.font_size}
                        onChange={(event) => patchForm({ font_size: Number(event.target.value) })}
                      />
                    </Field>
                  </div>
                </section>
              </div>

              <aside className="surface sticky top-24 h-fit rounded-2xl p-5">
                <SectionTitle
                  icon={<Gauge size={20} />}
                  title="Recapitulatif"
                  subtitle="Les points critiques avant generation."
                />
                <div className="mt-5 space-y-3">
                  <Metric label="Sujet" value={form.video_subject || "Non renseigne"} />
                  <Metric label="Format" value={form.video_aspect} />
                  <Metric label="Source" value={form.video_source} />
                  <Metric label="IA" value={aiMode} />
                  <Metric label="Quota" value={quotaLabel} />
                  <Metric label="Mots-cles" value={terms.length ? `${terms.length} termes` : "Aucun"} />
                  <Metric label="Sortie" value={`${form.video_count} video(s)`} />
                </div>
                {!apiOnline && (
                  <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-700">
                    L'API FastAPI ne repond pas encore. Lance le backend ou configure VITE_API_BASE_URL.
                  </p>
                )}
                {supabaseEnabled && !activeProvider && quota?.remaining === 0 && (
                  <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                    Ton quota gratuit est epuise. Ajoute une cle OpenAI ou Claude dans Reglages.
                  </p>
                )}
                <button
                  className="btn btn-primary mt-5 w-full"
                  type="submit"
                  disabled={busy === "video"}
                >
                  {busy === "video" ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                  Generer la video
                </button>
              </aside>
            </form>
          )}

          {view === "tasks" && (
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="surface rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle
                    icon={<Activity size={20} />}
                    title="Taches recentes"
                    subtitle="Suivi des generations et acces rapide aux resultats."
                  />
                  <button className="btn btn-secondary" onClick={refreshTasks}>
                    <RefreshCcw size={17} />
                    Actualiser
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {tasks.length === 0 && <EmptyState text="Aucune tache pour le moment." />}
                  {tasks.map((task) => (
                    <button
                      key={task.task_id}
                      className="w-full rounded-xl border border-line bg-white p-4 text-left hover:border-brand-100 hover:bg-brand-50"
                      onClick={() => {
                        setActiveTaskId(task.task_id);
                        setActiveTask(task);
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-ink">{task.task_id}</p>
                          <p className={`text-sm font-bold ${taskTone(task)}`}>{taskLabel(task)}</p>
                        </div>
                        <span className="badge">{task.progress || 0}%</span>
                      </div>
                      <div className="progress-track mt-3">
                        <div className="progress-bar" style={{ width: `${task.progress || 0}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="surface rounded-2xl p-5">
                <SectionTitle
                  icon={<Film size={20} />}
                  title="Resultat"
                  subtitle={activeTask ? activeTask.task_id : "Selectionne une tache."}
                />
                <div className="mt-5">
                  {!activeTask && <EmptyState text="Aucun resultat actif." />}
                  {activeTask && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-black ${taskTone(activeTask)}`}>
                          {taskLabel(activeTask)}
                        </span>
                        <span className="badge">{activeTask.progress || 0}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-bar" style={{ width: `${activeTask.progress || 0}%` }} />
                      </div>
                      {finalVideos.length > 0 ? (
                        finalVideos.map((video) => (
                          <SecureVideo key={video} src={video} token={accessToken} />
                        ))
                      ) : (
                        <EmptyState text="La video apparaitra ici quand la tache sera terminee." />
                      )}
                      <button className="btn btn-danger w-full" onClick={() => deleteTask(activeTask.task_id)}>
                        <Trash2 size={17} />
                        Supprimer la tache
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {view === "media" && (
            <section className="grid gap-5 xl:grid-cols-2">
              <AssetPanel
                icon={<FolderUp size={20} />}
                title="Medias locaux"
                subtitle="Videos et images utilisables avec la source locale."
                files={materials}
                accept="video/*,image/*"
                onUpload={(event) => uploadAsset(event, "material")}
                busy={busy === "material"}
              />
              <AssetPanel
                icon={<Music2 size={20} />}
                title="Musiques"
                subtitle="Fichiers MP3 disponibles pour une musique de fond personnalisee."
                files={musics}
                accept="audio/mpeg,audio/mp3"
                onUpload={(event) => uploadAsset(event, "music")}
                busy={busy === "music"}
              />
            </section>
          )}

          {view === "settings" && (
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="surface rounded-2xl p-5">
                <SectionTitle
                  icon={<KeyRound size={20} />}
                  title="Cles IA personnelles"
                  subtitle="Ajoute une cle OpenAI ou Claude. Elle est envoyee au backend et stockee dans Supabase Vault."
                />
                <form className="mt-5 space-y-4" onSubmit={saveProvider}>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Provider">
                      <select
                        className="field"
                        value={providerForm.provider}
                        onChange={(event) => changeProviderKind(event.target.value as AiProviderKind)}
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Claude / Anthropic</option>
                      </select>
                    </Field>
                    <Field label="Nom visible">
                      <input
                        className="field"
                        value={providerForm.label || ""}
                        onChange={(event) => patchProviderForm({ label: event.target.value })}
                      />
                    </Field>
                    <Field label="Modele">
                      <input
                        className="field"
                        value={providerForm.model_name || ""}
                        onChange={(event) => patchProviderForm({ model_name: event.target.value })}
                      />
                    </Field>
                    <Field label="Base URL">
                      <input
                        className="field"
                        value={providerForm.base_url || ""}
                        placeholder={providerForm.provider === "anthropic" ? "Vide pour Claude via LiteLLM" : "https://api.openai.com/v1"}
                        onChange={(event) => patchProviderForm({ base_url: event.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Cle API">
                    <input
                      className="field"
                      type="password"
                      autoComplete="off"
                      value={providerForm.api_key}
                      placeholder="sk-... ou cle Anthropic"
                      onChange={(event) => patchProviderForm({ api_key: event.target.value })}
                    />
                  </Field>
                  <button className="btn btn-primary" disabled={busy === "provider"}>
                    {busy === "provider" ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                    Chiffrer et activer
                  </button>
                </form>

                <div className="mt-6 space-y-3">
                  {providers.length === 0 && (
                    <EmptyState text="Aucune cle personnelle. Le quota gratuit OpenRouter sera utilise si disponible." />
                  )}
                  {providers.map((provider) => (
                    <div key={provider.id} className="rounded-xl border border-line bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-ink">{provider.label}</p>
                          <p className="text-sm font-semibold text-muted">
                            {provider.provider === "anthropic" ? "Claude" : "OpenAI"} - {provider.model_name}
                          </p>
                        </div>
                        <span className="badge">
                          <Lock size={14} />
                          Vault
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => setDefaultProvider(provider)}
                          disabled={provider.is_default || busy === `default-${provider.id}`}
                        >
                          <CheckCircle2 size={17} />
                          {provider.is_default ? "Actif" : "Utiliser"}
                        </button>
                        <button
                          className="btn btn-danger"
                          type="button"
                          onClick={() => deleteProvider(provider.id)}
                          disabled={busy === `provider-delete-${provider.id}`}
                        >
                          <Trash2 size={17} />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface rounded-2xl p-5">
                <SectionTitle
                  icon={<Cpu size={20} />}
                  title="Mode SaaS"
                  subtitle="Fallback OpenRouter et configuration de deploiement."
                />
                <div className="mt-5 space-y-3">
                  <Metric label="Utilisateur" value={session?.user.email || "Mode local"} />
                  <Metric label="IA active" value={aiMode} />
                  <Metric label="Quota gratuit" value={quotaLabel} />
                  <Metric label="API configuree" value={api.baseUrl} />
                  <Metric label="Vercel" value="Root Directory: webapp" />
                </div>
                <p className="mt-5 rounded-xl border border-line bg-white p-4 text-sm font-semibold text-muted">
                  La cle OpenRouter plateforme doit rester cote Supabase/backend. Les utilisateurs gratuits peuvent generer via quota; les utilisateurs avances ajoutent leur propre cle OpenAI ou Claude ici.
                </p>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function AuthScreen({
  mode,
  email,
  password,
  busy,
  toast,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit
}: {
  mode: AuthMode;
  email: string;
  password: string;
  busy: boolean;
  toast: Toast;
  onModeChange: (mode: AuthMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-4 py-8">
      <section className="surface w-full max-w-md rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Film size={22} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">
              MoneyPrinter
            </p>
            <h1 className="text-xl font-black text-ink">Connexion SaaS</h1>
          </div>
        </div>

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-5 rounded-xl border px-4 py-3 text-sm font-bold ${
              toast.tone === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : toast.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-brand-100 bg-brand-50 text-brand-700"
            }`}
          >
            {toast.message}
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Email">
            <input
              className="field"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              required
            />
          </Field>
          <Field label="Mot de passe">
            <input
              className="field"
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
            />
          </Field>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={17} /> : <LogIn size={17} />}
            {mode === "signup" ? "Creer mon compte" : "Se connecter"}
          </button>
        </form>

        <button
          className="btn btn-secondary mt-4 w-full"
          type="button"
          onClick={() => onModeChange(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Creer un compte" : "J'ai deja un compte"}
        </button>
      </section>
    </main>
  );
}

function SecureVideo({ src, token }: { src: string; token?: string }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let nextUrl = "";
    let cancelled = false;

    api.fetchMediaBlob(src, token)
      .then((blob) => {
        if (cancelled) return;
        nextUrl = URL.createObjectURL(blob);
        setObjectUrl(nextUrl);
        setError("");
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Preview indisponible");
      });

    return () => {
      cancelled = true;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [src, token]);

  function download() {
    const url = objectUrl || absoluteMediaUrl(src);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = src.split("/").pop() || "video.mp4";
    anchor.target = "_blank";
    anchor.click();
  }

  if (error) {
    return <EmptyState text={error} />;
  }

  return (
    <div className="space-y-3">
      {objectUrl ? (
        <video
          className="aspect-video w-full rounded-xl border border-line bg-black"
          controls
          src={objectUrl}
        />
      ) : (
        <div className="grid aspect-video w-full place-items-center rounded-xl border border-line bg-white">
          <Loader2 className="animate-spin text-brand-700" size={24} />
        </div>
      )}
      <button className="btn btn-secondary w-full" type="button" onClick={download}>
        <Download size={17} />
        Telecharger / ouvrir
      </button>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-black text-ink">{title}</h3>
        <p className="text-sm font-semibold text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm font-bold text-muted">
      {text}
    </div>
  );
}

function AssetPanel({
  icon,
  title,
  subtitle,
  files,
  accept,
  onUpload,
  busy
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  files: AssetFile[];
  accept: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  busy: boolean;
}) {
  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle icon={icon} title={title} subtitle={subtitle} />
        <label className="btn btn-secondary cursor-pointer">
          {busy ? <Loader2 className="animate-spin" size={17} /> : <UploadCloud size={17} />}
          Importer
          <input className="sr-only" type="file" accept={accept} onChange={onUpload} />
        </label>
      </div>
      <div className="mt-5 space-y-3">
        {files.length === 0 && <EmptyState text="Aucun fichier importe." />}
        {files.map((file) => (
          <div
            key={file.file}
            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                {accept.includes("audio") ? <FileAudio size={18} /> : <Film size={18} />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-black text-ink">{file.name}</p>
                <p className="text-sm font-semibold text-muted">{fileSize(file.size)}</p>
              </div>
            </div>
            <span className="badge">Local</span>
          </div>
        ))}
      </div>
    </section>
  );
}
