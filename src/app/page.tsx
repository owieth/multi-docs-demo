'use client';

import { useRef, useState } from 'react';

// Popular Google Fonts
const FONTS = [
  { name: 'Inter', value: 'Inter' },
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Open Sans', value: 'Open Sans' },
  { name: 'Lato', value: 'Lato' },
  { name: 'Montserrat', value: 'Montserrat' },
  { name: 'Poppins', value: 'Poppins' },
  { name: 'Source Sans 3', value: 'Source Sans 3' },
  { name: 'Nunito', value: 'Nunito' },
  { name: 'Playfair Display', value: 'Playfair Display' },
  { name: 'Merriweather', value: 'Merriweather' },
];

const SAMPLE_MARKDOWN = `# Document Title

This is a sample document demonstrating the markdown to PDF/DOCX converter with custom styling.

## Introduction

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

[IMAGE_PLACEHOLDER]

### Key Features

- Custom fonts and typography
- Heading colors that match across formats
- Image support with centering
- Code block formatting

## Code Example

Here's a code snippet:

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Conclusion

> This blockquote demonstrates styled quotes in both PDF and DOCX output.

Thank you for trying this converter!
`;

interface StyleConfig {
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function Home() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [loading, setLoading] = useState<'pdf' | 'docx' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [styles, setStyles] = useState<StyleConfig>({
    fontFamily: 'Inter',
    primaryColor: '#1e3a5f',
    secondaryColor: '#2d5a87',
  });
  const [image, setImage] = useState<{
    base64: string;
    mimeType: string;
    preview: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setImage({
        base64,
        mimeType: file.type,
        preview: result,
      });
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleExport(format: 'pdf' | 'docx') {
    setLoading(format);
    setError(null);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown,
          format,
          styles,
          image: image
            ? { base64: image.base64, mimeType: image.mimeType }
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-50 p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Markdown to PDF/DOCX
          </h1>
          <p className="mt-1 text-zinc-600">
            Convert markdown with custom styling to identical PDF and DOCX
            output
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main Editor */}
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700">
                  Markdown Editor
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={loading !== null}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading === 'pdf' ? <Spinner /> : <PDFIcon />}
                    Export PDF
                  </button>
                  <button
                    onClick={() => handleExport('docx')}
                    disabled={loading !== null}
                    className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading === 'docx' ? <Spinner /> : <DocIcon />}
                    Export DOCX
                  </button>
                </div>
              </div>
            </div>

            <textarea
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
              className="block h-[500px] w-full resize-none p-4 font-mono text-sm text-zinc-800 focus:outline-none"
              placeholder="Enter your markdown here..."
            />
          </div>

          {/* Style Controls */}
          <div className="space-y-4">
            {/* Font Selector */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Font Family
              </label>
              <select
                value={styles.fontFamily}
                onChange={e =>
                  setStyles({ ...styles, fontFamily: e.target.value })
                }
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {FONTS.map(font => (
                  <option key={font.value} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Pickers */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  H1 Color (Primary)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={styles.primaryColor}
                    onChange={e =>
                      setStyles({ ...styles, primaryColor: e.target.value })
                    }
                    className="size-10 cursor-pointer rounded border border-zinc-300"
                  />
                  <input
                    type="text"
                    value={styles.primaryColor}
                    onChange={e =>
                      setStyles({ ...styles, primaryColor: e.target.value })
                    }
                    className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  H2 Color (Secondary)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={styles.secondaryColor}
                    onChange={e =>
                      setStyles({ ...styles, secondaryColor: e.target.value })
                    }
                    className="size-10 cursor-pointer rounded border border-zinc-300"
                  />
                  <input
                    type="text"
                    value={styles.secondaryColor}
                    onChange={e =>
                      setStyles({ ...styles, secondaryColor: e.target.value })
                    }
                    className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Image Upload
              </label>
              <p className="mb-3 text-xs text-zinc-500">
                Use{' '}
                <code className="rounded bg-zinc-100 px-1">
                  [IMAGE_PLACEHOLDER]
                </code>{' '}
                in markdown to place the image
              </p>

              {image ? (
                <div className="space-y-3">
                  <img
                    src={image.preview}
                    alt="Preview"
                    className="h-32 w-full rounded-md border border-zinc-200 object-cover"
                  />
                  <button
                    onClick={removeImage}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-zinc-300 p-6 transition-colors hover:border-zinc-400"
                  >
                    <UploadIcon />
                    <span className="mt-2 text-sm text-zinc-600">
                      Click to upload
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <label className="mb-3 block text-sm font-medium text-zinc-700">
                Style Preview
              </label>
              <div className="space-y-2 rounded-md border border-zinc-200 p-3">
                <h1
                  style={{
                    fontFamily: `'${styles.fontFamily}', sans-serif`,
                    color: styles.primaryColor,
                    fontSize: '18px',
                    fontWeight: 700,
                  }}
                >
                  Heading 1
                </h1>
                <h2
                  style={{
                    fontFamily: `'${styles.fontFamily}', sans-serif`,
                    color: styles.secondaryColor,
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Heading 2
                </h2>
                <p
                  style={{
                    fontFamily: `'${styles.fontFamily}', sans-serif`,
                    fontSize: '12px',
                    color: '#1a1a1a',
                  }}
                >
                  Body text example
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <footer className="mt-6 text-center text-sm text-zinc-500">
          Using Pandoc + html-to-docx for conversion
        </footer>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="size-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function PDFIcon() {
  return (
    <svg
      className="size-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg
      className="size-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      className="size-8 text-zinc-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}
