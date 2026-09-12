import { createClient } from "@sanity/client";

const isPreview = process.env.SANITY_PREVIEW === "true";
const previewToken = isPreview ? process.env.SANITY_AUTH_TOKEN : undefined;

export const client = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET,
  useCdn: false,
  apiVersion: "2024-01-01",
  token: previewToken,
  perspective: isPreview ? "drafts" : "published",
});
