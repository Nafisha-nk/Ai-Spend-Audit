import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <div>
        <h1>Report not found</h1>
        <p className="lede">This audit link does not exist or the storage backend is not configured in this environment.</p>
        <Link className="primary-button" href="/">
          Run a new audit
        </Link>
      </div>
    </main>
  );
}
