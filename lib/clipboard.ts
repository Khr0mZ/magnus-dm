/** Clipboard buttons also work when the async clipboard API is unavailable. */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const focused = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('aria-hidden', 'true');
    field.style.cssText = 'position:fixed;left:-9999px;top:0;user-select:text;-webkit-user-select:text;';
    document.body.append(field);
    try {
      field.select();
      if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
    } finally {
      field.remove();
      if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
    }
  }
}
