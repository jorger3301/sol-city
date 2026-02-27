import { NextResponse } from "next/server";
import { fetchProtocolDetail, fetchProtocolTvlChart } from "@/lib/api/defillama";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || slug.length > 100) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const [detail, tvlChart] = await Promise.all([
      fetchProtocolDetail(slug),
      fetchProtocolTvlChart(slug),
    ]);

    if (!detail) {
      return NextResponse.json(
        { error: "Protocol not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { detail, tvlChart },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error(`Protocol detail error [${slug}]:`, err);
    return NextResponse.json(
      { error: "Failed to fetch protocol detail" },
      { status: 500 }
    );
  }
}
