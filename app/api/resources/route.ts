import { parseResourceQuery } from '@/lib/catalogue/resource-query';
import { resourceService } from '@/lib/catalogue/resource-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = parseResourceQuery(searchParams);

  if (!parsedQuery.success) {
    return Response.json({ error: parsedQuery.error }, { status: 400 });
  }

  const resources = await resourceService.listResources(parsedQuery.data);

  return Response.json({ data: resources, count: resources.length });
}
