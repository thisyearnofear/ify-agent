"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-center h-16">
          <div className="flex space-x-8 items-center">
            <Link
              href="/"
              className={`inline-flex items-center px-4 pt-1 border-b-2 text-sm font-medium ${
                pathname === "/"
                  ? "border-indigo-500 text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Home
            </Link>
            <Link
              href="/agent"
              className={`inline-flex items-center px-4 pt-1 border-b-2 text-sm font-medium ${
                pathname === "/agent"
                  ? "border-indigo-500 text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Agent
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
