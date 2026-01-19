import {
  ConvertOptions,
  convertToDocx,
  convertToPdf,
  StyleConfig,
} from '@/lib/converter';
import { NextRequest, NextResponse } from 'next/server';

interface RequestBody {
  markdown: string;
  format: 'pdf' | 'docx';
  styles: StyleConfig;
  image?: {
    base64: string;
    mimeType: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { markdown, format, styles, image } = body;

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json(
        { error: 'Markdown content is required' },
        { status: 400 }
      );
    }

    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json(
        { error: "Format must be 'pdf' or 'docx'" },
        { status: 400 }
      );
    }

    if (
      !styles ||
      !styles.fontFamily ||
      !styles.primaryColor ||
      !styles.secondaryColor
    ) {
      return NextResponse.json(
        { error: 'Style configuration is required' },
        { status: 400 }
      );
    }

    const options: ConvertOptions = {
      markdown,
      styles,
      image,
    };

    const buffer =
      format === 'pdf'
        ? await convertToPdf(options)
        : await convertToDocx(options);

    const contentType =
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="document.${format}"`,
      },
    });
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { error: 'Conversion failed', details: String(error) },
      { status: 500 }
    );
  }
}
