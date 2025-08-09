-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "planType" TEXT NOT NULL DEFAULT 'none',
    "planExpiry" TIMESTAMP(3),
    "appealsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appeals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuerType" TEXT NOT NULL,
    "councilOrCompany" TEXT NOT NULL,
    "pcnNumber" TEXT NOT NULL,
    "vrm" TEXT NOT NULL,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleColour" TEXT,
    "contraventionCode" TEXT NOT NULL,
    "contraventionText" TEXT NOT NULL,
    "issueDateTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "observationStart" TIMESTAMP(3),
    "observationEnd" TIMESTAMP(3),
    "ceoNotes" TEXT,
    "confirmedVrm" TEXT NOT NULL,
    "confirmedLocation" TEXT NOT NULL,
    "confirmedDateTime" TIMESTAMP(3) NOT NULL,
    "confirmedContravention" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidUntil" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "permitType" TEXT,
    "loadingUnloading" BOOLEAN NOT NULL DEFAULT false,
    "passengerDropoff" BOOLEAN NOT NULL DEFAULT false,
    "blueBadge" BOOLEAN NOT NULL DEFAULT false,
    "medicalEmergency" BOOLEAN NOT NULL DEFAULT false,
    "signageVisible" BOOLEAN NOT NULL DEFAULT true,
    "markingsVisible" BOOLEAN NOT NULL DEFAULT true,
    "noObservationPeriod" BOOLEAN NOT NULL DEFAULT false,
    "lateCouncilReply" BOOLEAN NOT NULL DEFAULT false,
    "primaryDefence" TEXT,
    "supportingDefences" TEXT,
    "letterText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evidence" (
    "id" TEXT NOT NULL,
    "appealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contravention_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "gracePeriodEligible" BOOLEAN NOT NULL DEFAULT false,
    "typicalExemptions" TEXT,
    "observationRequired" BOOLEAN NOT NULL DEFAULT false,
    "commonDefences" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contravention_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contravention_rules_code_key" ON "public"."contravention_rules"("code");

-- AddForeignKey
ALTER TABLE "public"."appeals" ADD CONSTRAINT "appeals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence" ADD CONSTRAINT "evidence_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "public"."appeals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
