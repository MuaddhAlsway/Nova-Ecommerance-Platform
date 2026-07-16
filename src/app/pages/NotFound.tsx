import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="font-display text-[120px] md:text-[180px] text-white/[0.04] leading-none select-none">404</p>
        <div className="-mt-16 md:-mt-24">
          <h1 className="font-display text-3xl md:text-4xl text-white mb-3">Page Not Found</h1>
          <p className="text-white/35 text-[13px] mb-8 max-w-sm mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-8 py-3 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
