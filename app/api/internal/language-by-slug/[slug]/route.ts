import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const language = await prisma.language.findUnique({
      where: { slug: params.slug },
      select: { id: true }
    });

    if (!language) {
      return new NextResponse('Not found', { status: 404 });
    }

    return NextResponse.json(language);
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}
