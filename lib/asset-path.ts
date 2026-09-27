// Next embeds the repository base path for GitHub Pages; local dev uses /.
export function assetPath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${path}`;
}
