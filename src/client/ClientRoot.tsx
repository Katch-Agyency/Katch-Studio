import { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import WebsiteRenderer from "@/website/WebsiteRenderer";
import type { Project } from "@/types";
import { parseClientProject, resolveClientPage } from "./projectLoader";
import katchConfig from "../../katch.config.json";

const bundledAssets = import.meta.glob<string>(
  "/src/assets/**/*.{avif,gif,jpeg,jpg,png,svg,webp}",
  { eager: true, query: "?url", import: "default" }
);

interface ClientProjectState {
  project: Project | null;
  error: string;
}

async function loadProject(): Promise<Project> {
  const response = await fetch(katchConfig.project_config_path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? `Missing ${katchConfig.project_config_path}. Add the exported project JSON to public/project.json and commit it on this client branch.`
        : `Could not load project configuration (HTTP ${response.status}).`
    );
  }
  return parseClientProject(await response.json(), bundledAssets);
}

function ClientWebsite({ project }: { project: Project }) {
  const location = useLocation();
  const page = resolveClientPage(project.config.pages, location.pathname);

  useEffect(() => {
    const title = page?.seo.title || page?.name || project.config.projectInfo.name;
    document.title = title;
    document.documentElement.lang = project.config.projectInfo.language;
    document.documentElement.dir = project.config.projectInfo.language === "ar" ? "rtl" : "ltr";
    const description = page?.seo.description || project.config.projectInfo.description || project.config.brand.description;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = description || "";
  }, [page, project]);

  if (!page) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 text-center text-zinc-900">
        <div>
          <p className="text-5xl font-bold">404</p>
          <p className="mt-3 text-sm text-zinc-600">This page does not exist.</p>
          <a href="/" className="mt-5 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Go home</a>
        </div>
      </main>
    );
  }

  return <WebsiteRenderer project={project.config} pageId={page.id} />;
}

function ClientLoader() {
  const [state, setState] = useState<ClientProjectState>({ project: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    loadProject()
      .then((project) => {
        if (!cancelled) setState({ project, error: "" });
      })
      .catch((error) => {
        console.error("[Katch Client] Project configuration failed:", error);
        if (!cancelled) setState({ project: null, error: error instanceof Error ? error.message : "Could not load project.json." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-8 text-center text-white">
        <div className="max-w-lg rounded-2xl border border-red-400/25 bg-red-400/10 p-6">
          <h1 className="text-lg font-semibold">Client configuration error</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{state.error}</p>
        </div>
      </main>
    );
  }

  if (!state.project) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">Loading website…</div>;
  }

  return <ClientWebsite project={state.project} />;
}

export default function ClientRoot() {
  return (
    <BrowserRouter>
      <ClientLoader />
    </BrowserRouter>
  );
}
