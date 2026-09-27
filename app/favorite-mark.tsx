// A memory slot: an empty circuit or a powered core with connected traces.
export default function FavoriteMark({ active = false }: { active?: boolean }) {
  return <span className={`favorite-mark${active ? ' is-active' : ''}`} aria-hidden="true"><span className="favorite-chip"><span className="favorite-core"/></span></span>;
}
