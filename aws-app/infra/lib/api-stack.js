import path from "node:path";
import { fileURLToPath } from "node:url";
import { Stack } from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiDirectory = path.resolve(currentDirectory, "../../api");
const zodLayerDirectory = path.resolve(currentDirectory, "../../layers/layer.zip");

export class ApiStack extends Stack {
  constructor(scope, id, {labSessionTable, gameRoomTable, ...stackProps} = {}) {
    super(scope, id, stackProps);

    const zodLayer = new lambda.LayerVersion(this, "ZodLayer", {
      code: lambda.Code.fromAsset(zodLayerDirectory),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
    });

    const createRoomFunction = new lambda.Function(
      this,
      "CreateRoomFunction",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        code: lambda.Code.fromAsset(
          apiDirectory,
          { exclude: ["node_modules", "**/*.test.js"] },
        ),
        handler: "src/rooms/create-room.handler",
        layers: [zodLayer],
        environment: {
          GAME_ROOM_TABLE_NAME: gameRoomTable.tableName,
        },
      },
    );

    gameRoomTable.grantWriteData(createRoomFunction);

    const createSessionFunction = new lambda.Function(
      this,
      "CreateSessionFunction",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        code: lambda.Code.fromAsset(
          apiDirectory,
          { exclude: ["node_modules", "**/*.test.js"] },
        ),
        handler: "src/sessions/create-session.handler",
        layers: [zodLayer],
        environment: {
          LAB_SESSION_TABLE_NAME: labSessionTable.tableName,
        },
      },
    );

    labSessionTable.grantWriteData(createSessionFunction);

    this.httpApi = new apigatewayv2.HttpApi(this, "Api", {
      apiName: "simpei-api",
    });

    this.apiDomainName = `${this.httpApi.apiId}.execute-api.${this.region}.${this.urlSuffix}`;

    const createRoomIntegration = new integrations.HttpLambdaIntegration(
      "CreateRoomIntegration",
      createRoomFunction,
    );

    const createSessionIntegration = new integrations.HttpLambdaIntegration(
      "CreateSessionIntegration",
      createSessionFunction,
    );

    this.httpApi.addRoutes({
      integration: createRoomIntegration,
      path: "/api/rooms",
      methods: [apigatewayv2.HttpMethod.POST],
    });

    this.httpApi.addRoutes({
      integration: createSessionIntegration,
      path: "/api/sessions",
      methods: [apigatewayv2.HttpMethod.POST],
    });
  }
}
