export default function ImageLoader({ label }: { label: string }) {
  return <div className="image-loader" role="status">
    <span className="image-loader-signal" aria-hidden="true"><i /><i /><i /><i /></span>
    <span>{label}</span>
  </div>;
}
