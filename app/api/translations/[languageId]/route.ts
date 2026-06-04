import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getDevUserId } from '@/lib/dev-auth';
import { z } from 'zod';

const updateTranslationsSchema = z.object({
  translations: z.record(z.string(), z.string()),
});

export async function GET(
  request: Request,
  { params }: { params: { languageId: string } }
) {
  try {
    const language = await prisma.language.findUnique({
      where: { id: params.languageId },
      select: { visibility: true, ownerId: true },
    });

    if (!language) {
      return new NextResponse('Not found', { status: 404 });
    }

    if (language.visibility !== 'PUBLIC') {
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId || userId !== language.ownerId) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    const translations = await prisma.conlangTranslation.findMany({
      where: { languageId: params.languageId },
      select: { key: true, value: true },
    });

    const result: Record<string, string> = {};
    for (const t of translations) {
      result[t.key] = t.value;
    }

    return NextResponse.json(result);
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { languageId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id || (await getDevUserId());

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check permissions
    const language = await prisma.language.findUnique({
      where: { id: params.languageId },
      include: {
        collaborators: true,
      },
    });

    if (!language) {
      return new NextResponse('Not found', { status: 404 });
    }

    const isOwner = language.ownerId === userId;
    const isCollaborator = language.collaborators.some(
      (c) => c.userId === userId && (c.role === 'OWNER' || c.role === 'EDITOR')
    );

    if (!isOwner && !isCollaborator) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await request.json();
    const { translations } = updateTranslationsSchema.parse(body);

    // Perform upserts in a transaction
    await prisma.$transaction(
      Object.entries(translations).map(([key, value]) =>
        prisma.conlangTranslation.upsert({
          where: {
            languageId_key: {
              languageId: params.languageId,
              key,
            },
          },
          update: { value },
          create: {
            languageId: params.languageId,
            key,
            value,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse('Invalid request data', { status: 422 });
    }

    console.error('[TRANSLATIONS_PUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
