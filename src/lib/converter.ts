import { exec } from 'child_process';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
} from 'docx';
import { readFile, unlink, writeFile } from 'fs/promises';
import { marked, Token, Tokens } from 'marked';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface StyleConfig {
  fontFamily: string;
  primaryColor: string; // H1 color
  secondaryColor: string; // H2 color
}

export interface ConvertOptions {
  markdown: string;
  styles: StyleConfig;
  image?: {
    base64: string;
    mimeType: string;
  };
}

// Convert hex color to docx format (without #)
function hexToDocxColor(hex: string): string {
  return hex.replace('#', '');
}

// Fetch Google Font CSS and return it for embedding
async function fetchGoogleFontCSS(fontFamily: string): Promise<string> {
  const fontName = encodeURIComponent(fontFamily);
  const url = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`;

  try {
    const response = await fetch(url, {
      headers: {
        // Use a user agent that gets woff2 format
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Fallback if fetch fails
  }

  return '';
}

function generateStyledHtml(fontCSS: string, styles: StyleConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Embedded Google Font */
    ${fontCSS}
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: '${styles.fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }

    h1 {
      font-family: '${styles.fontFamily}', sans-serif;
      font-size: 28pt;
      font-weight: 700;
      color: ${styles.primaryColor};
      margin-bottom: 6pt;
      margin-top: 12pt;
      line-height: 1.2;
    }

    h2 {
      font-family: '${styles.fontFamily}', sans-serif;
      font-size: 20pt;
      font-weight: 600;
      color: ${styles.secondaryColor};
      margin-bottom: 6pt;
      margin-top: 12pt;
      line-height: 1.3;
    }

    h3 {
      font-family: '${styles.fontFamily}', sans-serif;
      font-size: 14pt;
      font-weight: 600;
      color: ${styles.secondaryColor};
      margin-bottom: 6pt;
      margin-top: 12pt;
      line-height: 1.4;
    }

    h1:first-child, h2:first-child, h3:first-child {
      margin-top: 0;
    }

    p {
      font-family: '${styles.fontFamily}', sans-serif;
      margin-bottom: 6pt;
      line-height: 1.5;
    }

    a {
      color: ${styles.secondaryColor};
      text-decoration: none;
    }

    ul, ol {
      margin-bottom: 12px;
      padding-left: 24px;
    }

    li {
      font-family: '${styles.fontFamily}', sans-serif;
      margin-bottom: 6px;
    }

    img {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 20px auto;
    }

    code {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 10pt;
      background-color: #f4f4f5;
      padding: 2px 6px;
      border-radius: 3px;
    }

    pre {
      background-color: #f4f4f5;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 16px;
    }

    pre code {
      background: none;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid ${styles.secondaryColor};
      padding-left: 16px;
      margin: 16px 0;
      color: #4a4a4a;
      font-style: italic;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 10px 12px;
      text-align: left;
      font-family: '${styles.fontFamily}', sans-serif;
    }

    th {
      background-color: #f4f4f5;
      font-weight: 600;
      color: ${styles.primaryColor};
    }

    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 24px 0;
    }

    strong { font-weight: 600; }
    em { font-style: italic; }
  </style>
</head>
<body>
$body$
</body>
</html>`;
}

export async function convertToPdf(options: ConvertOptions): Promise<Buffer> {
  const { markdown, styles, image } = options;

  const inputPath = join(tmpdir(), `input-${Date.now()}.md`);
  const templatePath = join(tmpdir(), `template-${Date.now()}.html`);
  const outputPath = join(tmpdir(), `output-${Date.now()}.pdf`);

  try {
    let processedMarkdown = markdown;
    if (image) {
      const imgMarkdown = `![image](data:${image.mimeType};base64,${image.base64})`;
      processedMarkdown = markdown.replace(
        /!\[image\]\(placeholder\)/gi,
        imgMarkdown
      );
      processedMarkdown = processedMarkdown.replace(
        /\[IMAGE_PLACEHOLDER\]/gi,
        imgMarkdown
      );
    } else {
      processedMarkdown = markdown.replace(
        /!\[image\]\(placeholder\)\n?/gi,
        ''
      );
      processedMarkdown = processedMarkdown.replace(
        /\[IMAGE_PLACEHOLDER\]\n?/gi,
        ''
      );
    }

    // Fetch Google Font CSS for embedding
    const fontCSS = await fetchGoogleFontCSS(styles.fontFamily);

    await writeFile(inputPath, processedMarkdown, 'utf-8');
    await writeFile(templatePath, generateStyledHtml(fontCSS, styles), 'utf-8');

    await execAsync(
      `pandoc "${inputPath}" --template="${templatePath}" --pdf-engine=wkhtmltopdf --pdf-engine-opt=--enable-local-file-access --pdf-engine-opt=--no-stop-slow-scripts --pdf-engine-opt=--javascript-delay --pdf-engine-opt=1000 --pdf-engine-opt=--margin-top --pdf-engine-opt=25 --pdf-engine-opt=--margin-bottom --pdf-engine-opt=25 --pdf-engine-opt=--margin-left --pdf-engine-opt=25 --pdf-engine-opt=--margin-right --pdf-engine-opt=25 -o "${outputPath}"`
    );

    return await readFile(outputPath);
  } finally {
    await Promise.allSettled([
      unlink(inputPath),
      unlink(templatePath),
      unlink(outputPath),
    ]);
  }
}

// Parse inline tokens to TextRun array
function parseInlineTokens(
  tokens: Token[] | undefined,
  styles: StyleConfig,
  baseOptions: Partial<{ bold: boolean; italics: boolean }> = {}
): TextRun[] {
  if (!tokens) return [];

  const runs: TextRun[] = [];

  for (const token of tokens) {
    if (token.type === 'text') {
      runs.push(
        new TextRun({
          text: token.text,
          font: styles.fontFamily,
          size: 22, // 11pt
          ...baseOptions,
        })
      );
    } else if (token.type === 'strong') {
      runs.push(
        ...parseInlineTokens((token as Tokens.Strong).tokens, styles, {
          ...baseOptions,
          bold: true,
        })
      );
    } else if (token.type === 'em') {
      runs.push(
        ...parseInlineTokens((token as Tokens.Em).tokens, styles, {
          ...baseOptions,
          italics: true,
        })
      );
    } else if (token.type === 'codespan') {
      runs.push(
        new TextRun({
          text: (token as Tokens.Codespan).text,
          font: 'Courier New',
          size: 20,
          ...baseOptions,
        })
      );
    } else if (token.type === 'link') {
      runs.push(
        ...parseInlineTokens((token as Tokens.Link).tokens, styles, baseOptions)
      );
    }
  }

  return runs;
}

export async function convertToDocx(options: ConvertOptions): Promise<Buffer> {
  const { markdown, styles, image } = options;

  // Process markdown to handle image placeholder
  let processedMarkdown = markdown;
  if (!image) {
    processedMarkdown = markdown.replace(/!\[image\]\(placeholder\)\n?/gi, '');
    processedMarkdown = processedMarkdown.replace(
      /\[IMAGE_PLACEHOLDER\]\n?/gi,
      ''
    );
  } else {
    processedMarkdown = markdown.replace(
      /!\[image\]\(placeholder\)/gi,
      '[IMAGE_PLACEHOLDER]'
    );
  }

  // Parse markdown to tokens
  const tokens = marked.lexer(processedMarkdown);
  const children: Paragraph[] = [];

  const primaryColor = hexToDocxColor(styles.primaryColor);
  const secondaryColor = hexToDocxColor(styles.secondaryColor);

  for (const token of tokens) {
    if (token.type === 'heading') {
      const heading = token as Tokens.Heading;
      const isH1 = heading.depth === 1;
      const isH2 = heading.depth === 2;
      const color = isH1 ? primaryColor : secondaryColor;
      const size = isH1 ? 56 : isH2 ? 40 : 28; // pt * 2

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: heading.text,
              bold: true,
              font: styles.fontFamily,
              size,
              color,
            }),
          ],
          heading: isH1
            ? HeadingLevel.HEADING_1
            : isH2
              ? HeadingLevel.HEADING_2
              : HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 }, // 12pt before, 6pt after
        })
      );
    } else if (token.type === 'paragraph') {
      const para = token as Tokens.Paragraph;

      // Check for image placeholder
      if (para.text === '[IMAGE_PLACEHOLDER]' && image) {
        try {
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: Buffer.from(image.base64, 'base64'),
                  transformation: { width: 400, height: 300 },
                  type: 'png',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            })
          );
        } catch {
          // Skip image if it fails
        }
      } else {
        children.push(
          new Paragraph({
            children: parseInlineTokens(para.tokens, styles),
            spacing: { after: 120, line: 360 }, // 6pt after, 1.5 line height (240 * 1.5)
          })
        );
      }
    } else if (token.type === 'list') {
      const list = token as Tokens.List;
      for (const item of list.items) {
        children.push(
          new Paragraph({
            children: parseInlineTokens(item.tokens, styles),
            bullet: { level: 0 },
            spacing: { after: 60, line: 360 },
          })
        );
      }
    } else if (token.type === 'code') {
      const code = token as Tokens.Code;
      // Split code by lines for proper rendering
      const lines = code.text.split('\n');
      for (const line of lines) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line || ' ',
                font: 'Courier New',
                size: 20,
              }),
            ],
            spacing: { after: 0 },
            shading: { type: ShadingType.SOLID, fill: 'f4f4f5' },
          })
        );
      }
    } else if (token.type === 'blockquote') {
      const quote = token as Tokens.Blockquote;
      for (const t of quote.tokens) {
        if (t.type === 'paragraph') {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (t as Tokens.Paragraph).text,
                  italics: true,
                  font: styles.fontFamily,
                  size: 22,
                  color: '4a4a4a',
                }),
              ],
              indent: { left: 480 },
              spacing: { before: 120, after: 120, line: 360 },
            })
          );
        }
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
