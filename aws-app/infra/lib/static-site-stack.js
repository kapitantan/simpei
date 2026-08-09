import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDistPath = path.resolve(currentDirectory, "../../web/dist");

export class StaticSiteStack extends cdk.Stack {
  // scope: このスタックの親、id: スタックID、props: スタックの設定
  constructor(scope, id, props = {}) {
    super(scope, id, props);

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      defaultRootObject: "index.html",
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
      prune: true,
      sources: [s3deploy.Source.asset(webDistPath)],
    });

    new cdk.CfnOutput(this, "SiteUrl", {
      description: "CloudFront URL for the Simpei web app",
      value: `https://${distribution.distributionDomainName}`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
  }
}
