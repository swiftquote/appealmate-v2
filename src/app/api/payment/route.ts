import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { appealId, planType, userId } = await request.json()

    if (!appealId || !planType || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Define price based on plan type
    const prices = {
      single: 299, // £2.99 in pence
      annual: 999, // £9.99 in pence
    }

    const price = prices[planType as keyof typeof prices]
    if (!price) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: planType === "single" ? "Single Appeal Letter" : "Unlimited Annual Appeals",
              description: planType === "single" 
                ? "AI-generated appeal letter for one parking ticket" 
                : "Unlimited parking appeal letters for one year",
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/appeal/${appealId}?success=true&plan=${planType}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/appeal/${appealId}?canceled=true`,
      metadata: {
        appealId,
        planType,
        userId,
      },
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      message: "Payment session created successfully"
    })

  } catch (error) {
    console.error("Stripe payment error:", error)
    return NextResponse.json({ 
      error: "Internal server error during payment processing",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    // Retrieve the session to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      session,
      message: "Payment session retrieved successfully"
    })

  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ 
      error: "Internal server error during payment verification",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}