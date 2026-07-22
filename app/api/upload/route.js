import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request) {

  try {

    const data = await request.formData();

    const file = data.get("file");

    if (!file) {

      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );

    }

    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);

    const fileName =
      Date.now() +
      "_" +
      file.name;

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "aadhaar"
    );

    if (!fs.existsSync(uploadDir)) {

      fs.mkdirSync(uploadDir, {
        recursive: true
      });

    }

    const filePath = path.join(
      uploadDir,
      fileName
    );

    fs.writeFileSync(
      filePath,
      buffer
    );

    return NextResponse.json({

      filePath:
        "/uploads/aadhaar/" +
        fileName

    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );

  }

}