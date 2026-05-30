"use client";

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Download,
  FileAudio,
  Film,
  FolderUp,
  Gauge,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Mic2,
  Music2,
  Play,
  RefreshCcw,
  Settings,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  absoluteMediaUrl,
  api,
  AssetFile,
  TaskRecord,
  VideoRequest
} from "@/lib/api";

type ViewKey = "studio" | "tasks" | "media" | "settings";
type Toast = { tone: "success" | "error" | "info"; message: string } | null;

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
  const [view, setView] = useState<ViewKey>("studio");
  const [apiOnline, setApiOnline] = useState(false);
  const [apiChecking, setApiChecking] = useState(true);
  const [form, setForm] = useState<VideoRequest>(initialForm);
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [activeTask, setActiveTask] = useState<TaskRecord | undefined>();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [materials, setMaterials] = useState<AssetFile[]>([]);
  const [musics, setMusics] = useState<AssetFile[]>([]);

  const hasPrompt = Boolean(form.video_subject.trim() || form.video_script.trim());
  const terms = useMemo(
    () =>
      (form.video_terms || "")
        .split(",")
        .map((term) => term.trim())
        .filter(Boolean),
    [form.video_terms]
  );
  const finalVideos = activeTask?.videos || [];

  function patchForm(patch: Partial<VideoRequest>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function showToast(next: Toast) {
    setToast(next);
    if (next) {
      window.setTimeout(() => setToast(null), 4200);
    }
  }

  async function refreshApi() {
    setApiChecking(true);
    const ok = await api.ping();
    setApiOnline(ok);
    setApiChecking(false);
  }

  async function refreshTasks() {
    try {
      const data = await api.getTasks(1, 12);
      setTasks(data.tasks || []);
    } catch (error) {
      showToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Impossible de charger les taches"
      });
    }
  }

  async function refreshAssets() {
    try {
      const [materialData, musicData] = await Promise.all([
        api.getMaterials(),
        api.getMusics()
      ]);
      setMaterials(materialData.files || []);
      setMusics(musicData.files || []);
    } catch {
      // Asset endpoints are helpful, but the studio can still be used without them.
    }
  }

  useEffect(() => {
    refreshApi();
    refreshTasks();
    refreshAssets();
  }, []);

  useEffect(() => {
    if (!activeTaskId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const task = await api.getTask(activeTaskId);
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
  }, [activeTaskId]);

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
      });
      patchForm({ video_script: data.video_script });
      showToast({ tone: "success", message: "Script genere." });
    } catch (error) {
      showToast({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Generation du script impossible"
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
      });
      patchForm({ video_terms: data.video_terms.join(", ") });
      showToast({ tone: "success", message: "Mots-cles generes." });
    } catch (error) {
      showToast({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Generation des mots-cles impossible"
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
    setBusy("video");
    try {
      const task = await api.createVideo(form);
      setActiveTaskId(task.task_id);
      setActiveTask({ task_id: task.task_id, state: 4, progress: 5 });
      setView("tasks");
      showToast({ tone: "success", message: "Tache video creee." });
    } catch (error) {
      showToast({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Generation video impossible"
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
        await api.uploadMaterial(file);
      } else {
        await api.uploadMusic(file);
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
      await api.deleteTask(taskId);
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
              onClick={() => setView(item.key)}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-8 rounded-xl border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-muted">
              Backend
            </span>
            <span className={apiOnline ? "text-mint-600" : "text-red-600"}>
              {apiOnline ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            </span>
          </div>
          <p className="break-all text-sm font-bold text-ink">{api.baseUrl}</p>
          <button className="btn btn-secondary mt-4 w-full" onClick={refreshApi}>
            <RefreshCcw size={16} />
            Tester l'API
          </button>
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
              <span className="badge">FR</span>
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
                  <Metric label="Mots-cles" value={terms.length ? `${terms.length} termes` : "Aucun"} />
                  <Metric label="Sortie" value={`${form.video_count} video(s)`} />
                </div>
                {!apiOnline && (
                  <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-700">
                    L'API FastAPI ne repond pas encore. Lance le backend sur le port 8080 avant une generation reelle.
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
                          <div key={video} className="space-y-3">
                            <video
                              className="aspect-video w-full rounded-xl border border-line bg-black"
                              controls
                              src={absoluteMediaUrl(video)}
                            />
                            <a className="btn btn-secondary w-full" href={absoluteMediaUrl(video)} target="_blank">
                              <Download size={17} />
                              Telecharger / ouvrir
                            </a>
                          </div>
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
            <section className="surface rounded-2xl p-5">
              <SectionTitle
                icon={<Settings size={20} />}
                title="Reglages"
                subtitle="Configuration frontend et rappel des dependances backend."
              />
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <Metric label="API configuree" value={api.baseUrl} />
                <Metric label="Interface" value="Next.js + Streamlit fallback" />
                <Metric label="Auth" value="Desactivee dans cette version" />
              </div>
              <div className="mt-5 rounded-xl border border-line bg-white p-4">
                <p className="font-black text-ink">Cles requises cote backend</p>
                <p className="mt-2 text-sm font-semibold text-muted">
                  Renseigne les cles LLM, Pexels ou Pixabay dans la configuration Python avant une generation complete.
                  Cette interface ne stocke pas de secret.
                </p>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-black text-ink">{title}</h3>
        <p className="text-sm font-semibold text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
  icon: React.ReactNode;
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
