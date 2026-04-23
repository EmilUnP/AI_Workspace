import { NextResponse } from 'next/server'
import { getAssistantData } from '../get-assistant-data'

export async function GET() {
  const data = await getAssistantData()
  if (!data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(data)
}
