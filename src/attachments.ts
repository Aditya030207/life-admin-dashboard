export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_NAME = 150;
export const ATTACHMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
] as const;

export function attachmentError(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (
    file.size > MAX_FILE_BYTES ||
    !ATTACHMENT_TYPES.some((type) => type === file.type)
  )
    return "Choose a PDF, PNG, JPEG or text file up to 5 MB.";
  const name = file.name.trim();
  if (!name || name.length > MAX_ATTACHMENT_NAME)
    return "Use a file name between 1 and 150 characters.";
  return null;
}
