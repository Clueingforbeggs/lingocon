import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTotalKeyCount } from '@/lib/i18n/config';

export async function GET() {
  try {
    // We get languages that have at least one translation
    const translatedLanguages = await prisma.language.findMany({
      where: {
        uiTranslations: {
          some: {},
        },
        visibility: "PUBLIC"
      },
      select: {
        id: true,
        name: true,
        flagUrl: true,
        owner: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            uiTranslations: true,
          },
        },
      },
    });

    // We need base English to calculate percentage
    const baseMessages = (await import('@/messages/en.json')).default;
    const totalKeys = getTotalKeyCount(baseMessages);

    const availableTranslations = translatedLanguages.map((lang) => {
      const translatedCount = lang._count.uiTranslations;
      const percentage = totalKeys > 0 ? Math.round((translatedCount / totalKeys) * 100) : 0;

      return {
        id: lang.id,
        name: lang.name,
        flagUrl: lang.flagUrl,
        ownerName: lang.owner.name,
        translatedCount,
        totalKeys,
        percentage,
      };
    }).sort((a, b) => b.percentage - a.percentage);

    return NextResponse.json(availableTranslations);
  } catch (error) {
    console.error('[AVAILABLE_TRANSLATIONS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
