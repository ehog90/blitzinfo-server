export function getMimeForExtension(extension: string): string {
  extension = extension.toLowerCase();
  if (extension === 'png') {
    return 'image/png';
  }
  if (extension === 'webp') {
    return 'image/webp';
  }
  return 'application/octet-stream';
}
