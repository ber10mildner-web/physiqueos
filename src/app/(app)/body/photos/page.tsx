import { getI18n } from "@/lib/i18n/server";
import { getPhotos, getWeights } from "@/lib/data";
import { getToday, requireUser } from "@/lib/auth";
import { Page, PageHeader } from "@/components/ui";
import { PhotoGallery } from "./photo-gallery";
import { movingAverage } from "@/lib/body/weight";

export default async function PhotosPage() {
  const [{ t }, { userId }, photos, weights, today] = await Promise.all([getI18n(), requireUser(), getPhotos(), getWeights(), getToday()]);
  const trend = movingAverage(weights.map((w) => ({ date: w.entry_date, weight: w.weight_kg }))).map((p) => ({ date: p.date, average: Math.round(p.average * 100) / 100 }));
  return (
    <Page>
      <PageHeader title={t.photos.title} subtitle={t.photos.private} back={{ href: "/body", label: t.body.title }} />
      <PhotoGallery userId={userId} photos={photos} trend={trend} today={today} />
    </Page>
  );
}
