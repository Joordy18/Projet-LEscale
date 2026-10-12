import { getCatalogue } from '@/lib/controllers/catalogue-controller';

/** `GET /api/resources?q=&category=` : liste les ressources du catalogue. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await getCatalogue(searchParams);

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ data: result.data, count: result.data.length });
}
