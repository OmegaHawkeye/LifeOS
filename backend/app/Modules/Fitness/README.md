# Fitness module

Owns training plans, workouts, and fitness progress.

## Progress photo privacy and lifecycle

Progress photos are stored on the non-public `fitness-private` disk under an
owner-scoped, generated path. The API never returns that path; image bytes are
streamed only after authentication and an owner check, with `no-store` and
`nosniff` response headers. Uploads are limited to JPEG, PNG, and WebP images
up to 10 MB. The request's original filename is not retained.

Photos have no automatic expiry and remain stored until the owner deletes
them. Deleting a photo removes its metadata and underlying file. Body metric
deletion only unlinks the optional metric association. Owner-data exports include
progress-photo metadata and original image files in the private ZIP archive.
Account-wide deletion is not available yet.
