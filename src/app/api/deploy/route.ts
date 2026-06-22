import { exec } from "child_process";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const secret = req.headers.get("x-deploy-secret");
  if (!secret || secret !== process.env.DEPLOY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const APP = "/home/primeceramics/zunkiree-cms";
  const NODE = "/opt/cpanel/ea-nodejs22/bin";

  const script = [
    `cd ${APP}`,
    `tar -xzf ${APP}/prisma-binaries.tar.gz 2>/dev/null || true`,
    `rm -f ${APP}/prisma-binaries.tar.gz`,
    `PATH=${NODE}:$PATH npx prisma db push --skip-generate`,
    `bash ${APP}/start.sh`,
  ].join(" && ");

  exec(script, (err, stdout, stderr) => {
    if (err) console.error("Deploy failed:", stderr);
    else console.log("Deploy complete:", stdout);
  });

  return NextResponse.json({ ok: true, message: "Deploy triggered" });
}
