#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { StaticSiteStack } from "../lib/static-site-stack.js";

// CDKアプリのエントリーポイント
const app = new cdk.App();

new StaticSiteStack(
  app,                      // このスタックを所属させるCDK app
  "SimpeiStaticSiteStack",  //CDK内部で使う stack ID
  {                         // 設定
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
    },
    description: "Private S3 and CloudFront hosting for the Simpei static web app",
  }
);
