import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // allows bigger payloads than edge

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function parseJSON(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in model response");
    return JSON.parse(m[0]);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Convert to base64 data URI for the vision model
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUri = `data:${file.type || "image/jpeg"};base64,${base64}`;

    // Ask GPT‑5 (vision) to extract ticket fields
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are an OCR specialist for UK parking tickets (council PCN or private PN). Return STRICT JSON only. Do not invent data. If a field is unclear, set it to null and add a short note. Include confidence scores (0.0–1.0).",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Extract fields from this image and return ONLY JSON with exactly this shape:\n" +
              "{\n" +
              '  "issuerType": "council|private|null",\n' +
              '  "councilOrCompany": string|null,\n' +
              '  "pcnNumber": string|null,\n' +
              '  "vrm": string|null,\n' +
              '  "contraventionCode": string|null,\n' +
              '  "contraventionText": string|null,\n' +
              '  "issueDateTime": string|null,\n' +
              '  "location": string|null,\n' +
              '  "observationStart": string|null,\n' +
              '  "observationEnd": string|null,\n' +
              '  "paidUntil": string|null,\n' +
              '  "paymentMethod": string|null,\n' +
              '  "confidences": { "issuerType": number, "pcnNumber": number, "vrm": number, "contravention": number, "issueDateTime": number, "location": number },\n' +
              '  "notes": string[]\n' +
              "}",
          },
          {
            type: "image_url",
            image_url: { url: dataUri },
          },
        ],
      },
    ];

    const vision = await openai.chat.completions.create({
      model: "gpt-5", // GPT‑5 (vision)
      messages,
      temperature: 0.0,
      max_tokens: 700,
    });

    const content = vision.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "Failed to extract text from image" },
        { status: 500 }
      );
    }

    const extractedData = parseJSON(content);

    // Your contravention explanation map
    const contraventionExplanations: Record<string, string> = {
      "01": "Parked in a restricted street during prescribed hours",
      "02": "Parked or loading/unloading in a restricted street where waiting and loading/unloading restrictions are in force",
      "06": "Parked without clearly displaying a valid pay & display ticket or voucher",
      "11": "Parked without payment of the parking charge",
      "12": "Parked in a residents' zone or space without a valid permit",
      "16": "Parked in a permit space without displaying a valid permit",
      "19": "Parked in a residents' bay without a valid virtual permit or physical permit",
      "21": "Parked in a suspended bay/space or area",
      "22": "Re-parked in the same parking place within one hour of leaving",
      "23": "Parked in a parking place or area not designated for that class of vehicle",
      "24": "Not parked correctly within the markings of the bay or space",
      "25": "Parked in a loading place during restricted hours without loading",
      "26": "Vehicle parked more than 50cm from the edge of the carriageway and not within a designated parking place",
      "27": "Parked adjacent to a dropped footway",
      "30": "Parked for longer than permitted",
      "40": "Parked in a designated disabled person's parking place without displaying a valid disabled person's badge",
      "47": "Stopped on a restricted bus stop or stand",
      "48": "Stopped on a restricted bus stop or stand during prohibited hours",
      "50": "Parked against the flow of traffic",
      "61": "Parked with engine running where prohibited",
      "62": "Parked with one or more wheels on or over a footpath or any part of a road other than a carriageway",
      "73": "Parked in a taxi rank",
      "74": "Parked in a cycle lane",
      "80": "Parked in a mandatory cycle lane",
      "85": "Parked in a pedestrian zone",
      "86": "Parked in a pedestrian zone during restricted hours",
      "87": "Parked in a restricted area during prescribed hours",
      "91": "Parked in a bay marked for police vehicles",
      "93": "Parked contrary to a prohibition on certain types of vehicle",
      "95": "Parked on a clearway",
      "96": "Parked in a cycle track",
      "97": "Parked on red route",
      "99": "Parked in a bay reserved for specific vehicles (e.g., car club, electric vehicles)",
    };

    if (extractedData?.contraventionCode) {
      extractedData.contraventionExplanation =
        contraventionExplanations[extractedData.contraventionCode] ||
        "This contravention code indicates a parking violation. Please verify the exact meaning with the issuing authority.";
    } else {
      extractedData.contraventionExplanation =
        "No contravention code confidently detected.";
    }

    // Soft validation: return list of missing fields but don't hard-fail
    const required = ["issuerType", "pcnNumber", "vrm", "contraventionCode", "issueDateTime", "location"];
    const missingFields = required.filter((f) => !extractedData?.[f]);

    return NextResponse.json({
      success: true,
      data: extractedData,
      missingFields,
      message:
        missingFields.length ? "OCR extracted data with some missing fields" : "OCR extraction completed successfully",
    });
  } catch (error: any) {
    console.error("OCR processing error:", error);
    return NextResponse.json(
      {
        error: "Internal server error during OCR processing",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
