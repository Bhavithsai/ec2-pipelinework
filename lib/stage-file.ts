import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Ec2WorkshopStack } from './ec2-workshop-stack';
import { Ec2Pipeline } from '../lib/ec2-pipeline';
export class StageFile extends cdk.Stage {
      constructor(scope: Construct, stageName: string, props?: cdk.StageProps) {
          super(scope,stageName, props );

        const pipelinestack = new Ec2WorkshopStack(this, 'Ec2WorkshopStack',  stageName);
        // env: {
        // account: '905418167610',
        // region:"ap-south-1"
    // );
        
    }
}
