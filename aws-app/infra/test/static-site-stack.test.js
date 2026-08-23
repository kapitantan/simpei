import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { StaticSiteStack } from "../lib/static-site-stack.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(currentDirectory, "fixtures/web-dist");
const webAclId = "arn:aws:wafv2:us-east-1:123456789012:global/webacl/TestWebACL/00000000-0000-0000-0000-000000000000";

test("routes static files to S3 and /api/* to API Gateway", () => {
  const stack = new StaticSiteStack(new cdk.App(), "TestStaticSiteStack", {
    apiDomainName: "api.example.com",
    webAclId,
    webDistPath: fixturePath,
  });
  const template = Template.fromStack(stack);
  const distributions = template.findResources("AWS::CloudFront::Distribution");
  const [distribution] = Object.values(distributions);
  const config = distribution.Properties.DistributionConfig;
  const s3Origin = config.Origins.find((origin) => origin.S3OriginConfig);
  const apiOrigin = config.Origins.find((origin) => origin.CustomOriginConfig);
  const apiBehavior = config.CacheBehaviors.find(
    (behavior) => behavior.PathPattern === "/api/*",
  );

  assert.ok(s3Origin, "S3 origin should exist");
  assert.ok(apiOrigin, "API origin should exist");
  assert.ok(apiBehavior, "/api/* behavior should exist");
  assert.equal(config.DefaultCacheBehavior.TargetOriginId, s3Origin.Id);
  assert.equal(config.WebACLId, webAclId);
  assert.equal(config.PriceClass, undefined);
  assert.equal(apiBehavior.TargetOriginId, apiOrigin.Id);
  assert.deepEqual(apiBehavior.AllowedMethods, [
    "GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE",
  ]);
  assert.equal(apiBehavior.CachePolicyId, "4135ea2d-6df8-44a3-9df3-4b5a84be39ad");
  assert.equal(apiBehavior.OriginRequestPolicyId, "b689b0a8-53d0-40ab-baf2-68738e2966ac");
});
