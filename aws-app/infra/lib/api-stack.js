import path from "node:path";
import { fileURLToPath } from "node:url";
import { Stack } from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiDirectory = path.resolve(currentDirectory, "../../api");

export class ApiStack extends Stack {
  constructor(scope, id, {labSessionTable, gameRoomTable, ...stackProps} = {}) {
    super(scope, id, stackProps);

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
        environment: {
          LabSessionTableName: labSessionTable.tableName,
          GameRoomTableName: gameRoomTable.tableName,
        }
      },
    );

    labSessionTable.grantWriteData(createRoomFunction);
    gameRoomTable.grantWriteData(createRoomFunction);

    this.httpApi = new apigatewayv2.HttpApi(this, "Api", {
      apiName: "simpei-api",
    });

    this.apiDomainName = `${this.httpApi.apiId}.execute-api.${this.region}.${this.urlSuffix}`;

    const createRoomIntegration = new integrations.HttpLambdaIntegration(
        "CreateRoomIntegration",
        createRoomFunction,
      );

    this.httpApi.addRoutes({
      integration: createRoomIntegration,
      path: "/api/rooms",
      methods: [apigatewayv2.HttpMethod.POST],
    });
  }
}
