/**
 * What an upload is allowed to be — one place, read by the form and by the route.
 *
 * The ceiling is not a product choice. `POST /api/catalog` receives the file as
 * a multipart request body, and the request body of a Vercel Function may not
 * exceed **4.5 MB**; beyond that the platform answers 413
 * `FUNCTION_PAYLOAD_TOO_LARGE` and the function is never invoked
 * (https://vercel.com/docs/functions/limitations#request-body-size). The route
 * checked 25MB, and the form promised "עד 25MB", so anything between the two
 * was accepted by the page, uploaded in full over the teacher's connection, and
 * refused by the edge with a body the page could not read.
 *
 * 4 MB leaves room for the multipart envelope (the boundaries plus title,
 * category and sender — a few hundred bytes) under the 4.5 MB the platform
 * counts. It costs nothing against the material this shelf actually holds: the
 * 258 seed files average 622 KB and the largest is 1,944 KB, so nothing on the
 * shelf today would have been refused at this limit.
 *
 * Raising it means moving the bytes off the request body — a signed upload
 * straight to Storage — not raising this number.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4MB";

export function isAcceptedType(type: string): boolean {
  return type === "application/pdf" || type.startsWith("image/");
}

/** "3.7MB" / "812KB" — for telling a teacher how big the file she picked is. */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

export const TOO_LARGE_MSG = `הקובץ גדול מדי (מקסימום ${MAX_UPLOAD_LABEL}).`;
export const BAD_TYPE_MSG = "יש להעלות קובץ PDF או תמונה בלבד.";
