import * as cdk from 'aws-cdk-lib';
import { Ec2WorkshopStack } from '../lib/ec2-workshop-stack';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sns from 'aws-cdk-lib/aws-sns';
// import { Aws } from 'aws-sdk';
const Aws = require('aws-sdk');

// import * as cdk from 'aws-cdk-lib';
const testEnv = {
 account: '905418167610',
 region:"ap-south-1"
};

test('Number of Resources Created', () => {
  const app = new cdk.App();
  const stack = new Ec2WorkshopStack(app, 'TestStack', 'test',{ env: testEnv });
  const template = Template.fromStack(stack);

  // Assert that the stack has been created
  expect(stack).toBeDefined();

  // Assert the number of resources in the stack
  expect(stack.node.children.length).toEqual(32);

  // Assert the specific resources created in the stack
  // Modify the assertions based on your specific resource expectations
  expect(stack.node.children[0]).toBeInstanceOf(sns.Topic);
  expect(stack.node.children[1]).toBeInstanceOf(tasks.CallAwsService);
});
