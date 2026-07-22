import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const { filePath } = await req.json();

    if (!filePath) {
      return NextResponse.json({
        success: false
      });
    }

    const fullPath = path.join(
      process.cwd(),
      filePath
    );

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false
    });
  }
}