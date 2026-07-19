import { create } from "zustand";
import type { MediaAsset } from "@/types";
import { deleteMedia, listMedia, updateMedia, uploadMedia } from "@/lib/bridge/media";

type MediaState = {
  assets: MediaAsset[];
  status: "idle" | "loading" | "ready" | "uploading";
  hydrate: () => Promise<void>;
  upload: (file: File, tags: string[], uploadedBy: string) => Promise<MediaAsset | null>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  retag: (id: string, tags: string[]) => Promise<void>;
};

export const useMediaStore = create<MediaState>((set, get) => ({
  assets: [],
  status: "idle",
  hydrate: async () => {
    set({ status: "loading" });
    const res = await listMedia();
    set({ assets: res.ok ? res.data : [], status: "ready" });
  },
  upload: async (file, tags, uploadedBy) => {
    set({ status: "uploading" });
    const res = await uploadMedia(file, tags, uploadedBy);
    if (!res.ok) {
      set({ status: "ready" });
      return null;
    }
    set({ assets: [res.data, ...get().assets], status: "ready" });
    return res.data;
  },
  remove: async (id) => {
    await deleteMedia(id);
    set({ assets: get().assets.filter((a) => a.id !== id) });
  },
  rename: async (id, name) => {
    const res = await updateMedia(id, { name });
    if (res.ok) set({ assets: get().assets.map((a) => (a.id === id ? res.data : a)) });
  },
  retag: async (id, tags) => {
    const res = await updateMedia(id, { tags });
    if (res.ok) set({ assets: get().assets.map((a) => (a.id === id ? res.data : a)) });
  },
}));
