import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class DynamoStack extends cdk.Stack {
  constructor(scope, id, props = {}) {
    super(scope, id ,props);

    this.labSessionTable = new dynamodb.TableV2(this, "LabSessionTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING, },
      billing: dynamodb.Billing.onDemand(),
      timeToLiveAttribute: "expiresAt",
    });

    this.gameRoomTable = new dynamodb.TableV2(this, "GameRoomTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING, },
      billing: dynamodb.Billing.onDemand(),
      timeToLiveAttribute: "expiresAt",
    });
    
  }
}
