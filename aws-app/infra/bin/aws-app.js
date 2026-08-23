#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack.js";
import { StaticSiteStack } from "../lib/static-site-stack.js";

// CDKアプリのエントリーポイント
const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
};

const apiStack = new ApiStack(app, "SimpeiApiStack", {
  env,
  description: "API Gateway and Lambda for the Simpei web app",
});

new StaticSiteStack(
  app,                      // scope: このスタックを所属させるCDK app
  "SimpeiStaticSiteStack",  // id: CDK内部で使う stack ID
  {                         // props
    env,
    apiDomainName: apiStack.apiDomainName,
    description: "Private S3 and CloudFront hosting for the Simpei static web app",
  }
);
