import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appeal = await db.appeal.findUnique({
      where: { id: params.id }
    })

    if (!appeal) {
      return NextResponse.json({ error: "Appeal not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      appeal,
      message: "Appeal retrieved successfully"
    })

  } catch (error) {
    console.error("Appeal retrieval error:", error)
    return NextResponse.json({ 
      error: "Internal server error during appeal retrieval",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updateData = await request.json()

    const appeal = await db.appeal.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      appeal,
      message: "Appeal updated successfully"
    })

  } catch (error) {
    console.error("Appeal update error:", error)
    return NextResponse.json({ 
      error: "Internal server error during appeal update",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}