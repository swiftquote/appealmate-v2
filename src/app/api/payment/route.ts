import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Ensure we have the secret key or fail early
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

if (!process.env.NEXTAUTH_URL) {
  throw new Error("NEXTAUTH_URL is not set in environment variables");
}

// Initialise Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const { appealId, planType, userId } = await request.json();

    if (!appealId || !planType || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Pricing in pence
    const prices: Record<string, number> = {
      single: 299, // £2.99
      annual: 999, // £9.99
    };

    const price = prices[planType];
    if (!price) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name:
                planType === "single"
                  ? "Single Appeal Letter"
                  : "Unlimited Annual Appeals",
              description:
                planType === "single"
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
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe payment error:", error);
    return NextResponse.json(
      {
        error: "Internal server error during payment processing",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      {
        error: "Internal server error during payment verification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
