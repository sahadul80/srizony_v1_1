import { NextResponse } from 'next/server'

// Simplified GeoBoundaries data is cached at the server so browsers don't need cross-origin
// access to GitHub's media host. ADM2 is the Bangladesh district layer; ADM0 is the national edge.
export const revalidate = 86400

const DISTRICT_URL = 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/BGD/ADM2/geoBoundaries-BGD-ADM2_simplified.geojson'
const COUNTRY_URL = 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/BGD/ADM0/geoBoundaries-BGD-ADM0_simplified.geojson'

async function getGeoJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 86400 } })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function GET() {
  const [districts, country] = await Promise.all([
    getGeoJson(DISTRICT_URL),
    getGeoJson(COUNTRY_URL),
  ])

  return NextResponse.json(
    { districts, country },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
}
