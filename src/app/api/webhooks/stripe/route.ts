import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/db"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session
        await handlePaymentSuccess(session)
        break

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSuccess(paymentIntent)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ 
      error: "Webhook handler failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function handlePaymentSuccess(session: Stripe.Checkout.Session | Stripe.PaymentIntent) {
  try {
    const metadata = "metadata" in session ? session.metadata : null
    
    if (!metadata || !metadata.appealId || !metadata.userId || !metadata.planType) {
      console.error("Missing metadata in payment session")
      return
    }

    const { appealId, userId, planType } = metadata

    // Update user's subscription if annual plan
    if (planType === "annual") {
      const planExpiry = new Date()
      planExpiry.setFullYear(planExpiry.getFullYear() + 1)

      await db.user.update({
        where: { email: userId },
        data: {
          planType: "subscriber",
          planExpiry,
        }
      })
    } else {
      // For single use, increment appeals used
      await db.user.update({
        where: { email: userId },
        data: {
          planType: "single_use",
          appealsUsed: {
            increment: 1
          }
        }
      })
    }

    // Record the payment
    await db.payment.create({
      data: {
        userId,
        stripePaymentId: session.id,
        amount: planType === "annual" ? 9.99 : 2.99,
        currency: "gbp",
        type: planType === "annual" ? "subscription" : "single_use",
        status: "completed"
      }
    })

    // Update appeal status
    await db.appeal.update({
      where: { id: appealId },
      data: {
        status: "paid"
      }
    })

    console.log(`Payment successful for appeal ${appealId}, user ${userId}, plan ${planType}`)

  } catch (error) {
    console.error("Error handling payment success:", error)
  }
}