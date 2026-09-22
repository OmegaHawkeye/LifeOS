import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "@/api/client";

type FitnessMetric = {
  id: number;
  metric_type: string;
  value: string;
  unit: string;
  measured_at: string;
};

type ProgressPhoto = {
  id: number;
  photo_date: string;
  angle: "front" | "side" | "back" | "other" | null;
  tags: string[];
  notes: string | null;
  mime_type: string;
  file_size: number;
  content_url: string;
  body_metric: FitnessMetric | null;
};

type MonthlyReview = {
  month: string;
  is_due: boolean;
  reviewed_at: string | null;
  notes: string | null;
  photo_count: number;
  latest_photo_date: string | null;
};

export function FitnessProgressPhotos({
  metrics,
}: {
  metrics: FitnessMetric[];
}) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [review, setReview] = useState<MonthlyReview | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  const [reviewMonth] = useState(currentMonth);
  const [reviewNotes, setReviewNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDate, setPhotoDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [angle, setAngle] = useState("front");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [bodyMetricId, setBodyMetricId] = useState("");
  const [beforePhotoId, setBeforePhotoId] = useState("");
  const [afterPhotoId, setAfterPhotoId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const [photoResponse, reviewResponse] = await Promise.all([
      apiFetch("/api/v1/fitness/progress-photos"),
      apiFetch(
        `/api/v1/fitness/progress-photos/monthly-review?month=${reviewMonth}`,
      ),
    ]);
    if (!photoResponse.ok || !reviewResponse.ok) {
      throw new Error("Progress data could not be loaded");
    }
    const [photoPayload, reviewPayload] = await Promise.all([
      photoResponse.json() as Promise<{ data: ProgressPhoto[] }>,
      reviewResponse.json() as Promise<{ data: MonthlyReview }>,
    ]);
    setPhotos(photoPayload.data);
    setReview(reviewPayload.data);
    setReviewNotes(reviewPayload.data.notes ?? "");
    setBeforePhotoId(
      (current) => current || String(photoPayload.data.at(-1)?.id ?? ""),
    );
    setAfterPhotoId(
      (current) => current || String(photoPayload.data[0]?.id ?? ""),
    );
  }, [reviewMonth]);

  useEffect(() => {
    let active = true;
    // Load private progress records when the Fitness workspace is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
      .catch(() => {
        if (active) setError("Progress photos could not be loaded. Try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadData]);

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    Promise.all(
      photos.map(async (photo) => {
        const response = await apiFetch(
          `/api/v1/fitness/progress-photos/${photo.id}/content`,
        );
        if (!response.ok) throw new Error("Could not load private photo");
        const url = URL.createObjectURL(await response.blob());
        urls.push(url);
        return [photo.id, url] as const;
      }),
    )
      .then((entries) => {
        if (active) setPreviewUrls(Object.fromEntries(entries));
      })
      .catch(() => {
        if (active) setError("A private progress photo could not be loaded.");
      });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);

  async function submitPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!photoFile) {
      setError("Choose a photo before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("photo", photoFile);
      formData.set("photo_date", photoDate);
      formData.set("angle", angle);
      if (bodyMetricId) formData.set("body_metric_id", bodyMetricId);
      if (notes) formData.set("notes", notes);
      tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag, index) => formData.append(`tags[${index}]`, tag));
      const response = await apiFetch("/api/v1/fitness/progress-photos", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error();
      setTags("");
      setNotes("");
      setPhotoFile(null);
      form.reset();
      setPhotoDate(new Date().toISOString().slice(0, 10));
      setAngle("front");
      setBodyMetricId("");
      await loadData();
    } catch {
      setError(
        "Photo upload failed. Use a JPG, PNG, or WebP image under 10 MB.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(
        "/api/v1/fitness/progress-photos/monthly-review",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: reviewMonth,
            notes: reviewNotes || null,
          }),
        },
      );
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { data: MonthlyReview };
      setReview(payload.data);
    } catch {
      setError("Monthly review could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePhoto(photo: ProgressPhoto) {
    if (
      !window.confirm(`Delete the progress photo from ${photo.photo_date}?`)
    ) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(
        `/api/v1/fitness/progress-photos/${photo.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
      setBeforePhotoId((current) =>
        current === String(photo.id) ? "" : current,
      );
      setAfterPhotoId((current) =>
        current === String(photo.id) ? "" : current,
      );
      await loadData();
    } catch {
      setError("Photo could not be deleted. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const beforePhoto = photos.find(
    (photo) => String(photo.id) === beforePhotoId,
  );
  const afterPhoto = photos.find((photo) => String(photo.id) === afterPhotoId);
  const comparisonDatesAreOrdered =
    beforePhoto !== undefined &&
    afterPhoto !== undefined &&
    beforePhoto.photo_date < afterPhoto.photo_date;

  return (
    <section
      aria-labelledby="progress-photos-title"
      className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-7"
    >
      <div>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Your progress, privately
        </p>
        <h2 className="mt-1 text-2xl font-semibold" id="progress-photos-title">
          Progress photos
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Private to your account. Photos stay here until you delete them;
          automatic expiry is off. Photo files are not yet included in a data
          export.
        </p>
      </div>

      {error && (
        <p
          className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          role="alert"
        >
          {error}
        </p>
      )}

      {review?.is_due && (
        <form
          aria-label="Monthly milestone review"
          className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"
          onSubmit={(event) => void saveReview(event)}
        >
          <h3 className="font-semibold">Your {reviewMonth} progress review</h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            You have {review.photo_count} progress photo
            {review.photo_count === 1 ? "" : "s"} this month. What changed, and
            what would you like to focus on next?
          </p>
          <label className="mt-3 block text-sm font-medium">
            Monthly reflection
            <textarea
              className={fieldClass}
              maxLength={5000}
              rows={3}
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.currentTarget.value)}
            />
          </label>
          <button
            className={primaryButtonClass}
            disabled={saving}
            type="submit"
          >
            Save monthly review
          </button>
        </form>
      )}
      {review && !review.is_due && review.reviewed_at && (
        <p
          className="mt-4 text-sm text-emerald-700 dark:text-emerald-300"
          role="status"
        >
          Monthly review saved for {review.month}.
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form
          aria-label="Add progress photo"
          className="rounded-2xl border border-stone-200 p-4 dark:border-white/10 sm:p-5"
          onSubmit={(event) => void submitPhoto(event)}
        >
          <h3 className="font-semibold">Add a progress photo</h3>
          <label className="mt-3 block text-sm font-medium">
            Photo
            <input
              accept="image/jpeg,image/png,image/webp"
              className={fieldClass}
              name="photo"
              onChange={(event) =>
                setPhotoFile(event.currentTarget.files?.[0] ?? null)
              }
              type="file"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Date
            <input
              className={fieldClass}
              name="photo_date"
              onChange={(event) => setPhotoDate(event.currentTarget.value)}
              required
              type="date"
              value={photoDate}
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Angle
            <select
              className={fieldClass}
              name="angle"
              onChange={(event) => setAngle(event.currentTarget.value)}
              value={angle}
            >
              <option value="front">Front</option>
              <option value="side">Side</option>
              <option value="back">Back</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-medium">
            Body metric (optional)
            <select
              className={fieldClass}
              name="body_metric_id"
              onChange={(event) => setBodyMetricId(event.currentTarget.value)}
              value={bodyMetricId}
            >
              <option value="">No linked body metric</option>
              {metrics.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.metric_type}: {metric.value} {metric.unit} ·{" "}
                  {metric.measured_at.slice(0, 10)}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm font-medium">
            Tags (comma separated)
            <input
              className={fieldClass}
              maxLength={400}
              name="tags"
              onChange={(event) => setTags(event.currentTarget.value)}
              placeholder="monthly, relaxed"
              value={tags}
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Notes
            <textarea
              className={fieldClass}
              maxLength={2000}
              name="notes"
              onChange={(event) => setNotes(event.currentTarget.value)}
              rows={2}
              value={notes}
            />
          </label>
          <button
            className={`${primaryButtonClass} w-full`}
            disabled={saving}
            type="submit"
          >
            Save photo privately
          </button>
        </form>

        <div className="rounded-2xl bg-stone-50 p-4 dark:bg-white/5 sm:p-5">
          <h3 className="font-semibold">Compare two dates</h3>
          {photos.length >= 2 ? (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Earlier photo
                  <select
                    className={fieldClass}
                    onChange={(event) =>
                      setBeforePhotoId(event.currentTarget.value)
                    }
                    value={beforePhotoId}
                  >
                    {photos.map((photo) => (
                      <option key={photo.id} value={photo.id}>
                        {photo.photo_date} · {photo.angle ?? "photo"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Later photo
                  <select
                    className={fieldClass}
                    onChange={(event) =>
                      setAfterPhotoId(event.currentTarget.value)
                    }
                    value={afterPhotoId}
                  >
                    {photos.map((photo) => (
                      <option key={photo.id} value={photo.id}>
                        {photo.photo_date} · {photo.angle ?? "photo"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {beforePhotoId === afterPhotoId ? (
                <p className="mt-4 text-sm text-stone-500">
                  Choose two different photos to compare.
                </p>
              ) : !comparisonDatesAreOrdered ? (
                <p className="mt-4 text-sm text-stone-500" role="status">
                  Choose an earlier calendar date first and a later date second.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[beforePhoto, afterPhoto].map((photo) =>
                    photo ? (
                      <figure className="min-w-0" key={photo.id}>
                        {previewUrls[photo.id] ? (
                          <img
                            alt={`${photo.angle ?? "Progress"} progress photo from ${photo.photo_date}`}
                            className="aspect-[3/4] w-full rounded-xl bg-stone-200 object-cover dark:bg-stone-800"
                            src={previewUrls[photo.id]}
                          />
                        ) : (
                          <div
                            aria-label="Loading private photo"
                            className="aspect-[3/4] animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800"
                            role="status"
                          />
                        )}
                        <figcaption className="mt-2 text-sm font-medium">
                          {photo.photo_date} · {photo.angle ?? "Photo"}
                          {photo.tags.length > 0 && (
                            <span className="block text-xs font-normal text-stone-500">
                              {photo.tags.join(" · ")}
                            </span>
                          )}
                        </figcaption>
                      </figure>
                    ) : null,
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-stone-500">
              Add at least two progress photos to compare different dates.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold">Your photo history</h3>
        {loading ? (
          <p className="mt-3 text-sm text-stone-500" role="status">
            Loading private photos…
          </p>
        ) : photos.length === 0 ? (
          <p className="mt-3 rounded-xl bg-stone-50 p-4 text-sm text-stone-500 dark:bg-white/5">
            No progress photos yet.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <li
                className="min-w-0 rounded-xl border border-stone-200 p-3 dark:border-white/10"
                key={photo.id}
              >
                {previewUrls[photo.id] ? (
                  <img
                    alt={`${photo.angle ?? "Progress"} progress photo from ${photo.photo_date}`}
                    className="aspect-[3/4] w-full rounded-lg bg-stone-100 object-cover dark:bg-stone-800"
                    src={previewUrls[photo.id]}
                  />
                ) : (
                  <div
                    aria-label="Loading private photo"
                    className="aspect-[3/4] animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800"
                    role="status"
                  />
                )}
                <div className="mt-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    {photo.photo_date} · {photo.angle ?? "Photo"}
                    {photo.body_metric && (
                      <span className="block text-xs font-normal text-stone-500">
                        {photo.body_metric.value} {photo.body_metric.unit}
                      </span>
                    )}
                  </p>
                  <button
                    className={secondaryButtonClass}
                    disabled={saving}
                    onClick={() => void deletePhoto(photo)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
                {photo.notes && (
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                    {photo.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

const fieldClass =
  "mt-1 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-stone-950";
const primaryButtonClass =
  "mt-3 min-h-12 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-stone-900";
const secondaryButtonClass =
  "min-h-12 rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:border-white/40";
