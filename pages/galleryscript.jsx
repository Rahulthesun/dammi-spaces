import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { getUserFromToken } from "./api/supabase_methods";

export default function EmbedButton({}) {
  const [token, setToken] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionStr = localStorage.getItem("session");
      if (sessionStr) {
        try {
          const parsed = JSON.parse(sessionStr);
          setToken(parsed.access_token);
        } catch (err) {
          console.error("Invalid session JSON:", err);
        }
      }
    }
  }, []);

  const handleCopy = async () => {
    try {
      const user = await getUserFromToken(token);
      
      const response = await fetch('/api/generate-widget-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate token');
      }
      
      const { token: widgetToken } = await response.json();
      const embedCode = `<script src="https://dammi-spaces.vercel.app/api/widget/images?token=${widgetToken}"></script>\n<div id="dammi-image-gallery"></div>`;
      
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error generating embed code:', error)
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition"
    >
      <svg
        className="w-4 h-4 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 16h8M8 12h8m-6-8h4M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      {copied ? "Copied!" : "Copy Embed Code"}
    </button>
  );
}