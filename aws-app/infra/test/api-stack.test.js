import test from "node:test";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { ApiStack } from "../lib/api-stack.js";

test("creates the room API route and Lambda integration", () => {
  const stack = new ApiStack(new cdk.App(), "TestApiStack");
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
  template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
    ProtocolType: "HTTP",
  });
  template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
    RouteKey: "POST /api/rooms",
  });
  template.hasResourceProperties("AWS::Lambda::Function", {
    Handler: "src/rooms/create-room.handler",
    Runtime: "nodejs22.x",
  });
});
