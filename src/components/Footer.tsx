export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t">
      <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
        <a
          href="https://www.aimhigher.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-600 transition-colors"
        >
          /higher
        </a>
        <span className="text-gray-400">•</span>
        <a
          href="https://warpcast.com/papa"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-violet-600 transition-colors"
        >
          papa
        </a>
        <span className="text-gray-400">•</span>
        <a
          href="https://www.degen.tips/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-violet-600 transition-colors"
        >
          /degen
        </a>
      </div>
    </footer>
  );
}
