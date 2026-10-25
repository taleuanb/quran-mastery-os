/** Délai avant de libérer l'URL du fichier : iOS lit le blob après le clic, de façon asynchrone. */
const REVOKE_DELAY_MS = 30 * 1000;

/**
 * Télécharge `text` sous le nom `filename` (JSON).
 * @param {string} text
 * @param {string} filename
 */
export function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
