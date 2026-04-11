import { useState } from "react";
import "./App.css";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function buildPrompt(ing1, ing2, ing3) {
  const parts = [ing1, ing2, ing3].filter(Boolean);
  return `You are a friendly home-cooking assistant. The user has these ingredients: ${parts.join(", ")}.

Suggest one appealing recipe name, a short intro (1–2 sentences), then clear numbered steps. Keep it practical for a home kitchen. Use markdown-style formatting: **bold** for the recipe title only at the start, then normal paragraphs and numbered lists.`;
}

async function callGemini(apiKey, prompt) {
  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      err?.error?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("No recipe returned. Try again.");
  }
  return text;
}

export default function App() {
  const [ing1, setIng1] = useState("");
  const [ing2, setIng2] = useState("");
  const [ing3, setIng3] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  async function handleCookMagic(e) {
    e.preventDefault();
    setError("");
    setResponse("");

    if (!apiKey) {
      setError(
        "Add your Gemini API key to a .env file as VITE_GEMINI_API_KEY=your_key (get one at Google AI Studio)."
      );
      return;
    }

    const filled = [ing1, ing2, ing3].filter((s) => s.trim()).length;
    if (filled === 0) {
      setError("Enter at least one ingredient.");
      return;
    }

    setLoading(true);
    try {
      const text = await callGemini(apiKey, buildPrompt(ing1, ing2, ing3));
      setResponse(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">
          <span className="title-emoji" aria-hidden="true">
            🍳
          </span>{" "}
          Fridge Hero
        </h1>
        <p className="subtitle">
          Tell us what&apos;s in your fridge — we&apos;ll cook up ideas.
        </p>
      </header>

      <main className="main">
        <form className="panel" onSubmit={handleCookMagic}>
          <label className="field">
            <span className="field-label">Ingredient 1</span>
            <input
              type="text"
              className="input"
              placeholder="e.g. chicken breast"
              value={ing1}
              onChange={(e) => setIng1(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span className="field-label">Ingredient 2</span>
            <input
              type="text"
              className="input"
              placeholder="e.g. cherry tomatoes"
              value={ing2}
              onChange={(e) => setIng2(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span className="field-label">Ingredient 3</span>
            <input
              type="text"
              className="input"
              placeholder="e.g. feta cheese"
              value={ing3}
              onChange={(e) => setIng3(e.target.value)}
              autoComplete="off"
            />
          </label>

          <button
            type="submit"
            className="btn-magic"
            disabled={loading}
          >
            {loading ? "Cooking…" : "Cook Magic"}
          </button>
        </form>

        {error && (
          <div className="card card-error" role="alert">
            <p className="card-error-text">{error}</p>
          </div>
        )}

        {response && (
          <article className="card card-result">
            <h2 className="card-result-heading">Your recipe idea</h2>
            <div className="card-result-body">
              <RecipeMarkdown text={response} />
            </div>
          </article>
        )}
      </main>
    </div>
  );
}

function RecipeMarkdown({ text }) {
  const lines = text.split("\n");
  const elements = [];
  let listItems = [];
  let key = 0;

  function flushList() {
    if (listItems.length) {
      elements.push(
        <ol className="recipe-list" key={`list-${key++}`}>
          {listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
      listItems = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s*/, ""));
      continue;
    }
    flushList();
    if (!trimmed) {
      elements.push(<br key={`br-${key++}`} />);
      continue;
    }
    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      const inner = trimmed.slice(2, -2);
      elements.push(
        <h3 className="recipe-title-line" key={`h-${key++}`}>
          {inner}
        </h3>
      );
      continue;
    }
    const boldParts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    if (boldParts.length > 1) {
      elements.push(
        <p className="recipe-p" key={`p-${key++}`}>
          {boldParts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={i}>{part.slice(2, -2)}</strong>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      );
    } else {
      elements.push(
        <p className="recipe-p" key={`p-${key++}`}>
          {trimmed}
        </p>
      );
    }
  }
  flushList();
  return <div className="recipe-md">{elements}</div>;
}
