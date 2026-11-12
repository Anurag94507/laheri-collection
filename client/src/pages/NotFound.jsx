import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-[52px] leading-none">This rack is empty</h1>
      <p className="mt-3 max-w-sm text-sm text-ink/50">
        The page you were looking for has moved or never existed. The collection, however, is very much here.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-gold">Back home</Link>
        <Link to="/collections" className="btn-outline">Browse collection</Link>
      </div>
    </div>
  );
}
