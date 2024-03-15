import { App } from 'aws-cdk-lib';
import { Ec2WorkshopStack } from '../lib/ec2-workshop-stack';
import { expect as expectCDK, haveResource } from '@aws-cdk/assert';

const testEnv = {
 account: '905418167610',
 region:"ap-south-1"
};

describe('Ec2WorkshopStack', () => {
  test('Stack has SNS topic', () => {
    const app = new App();
    const stack = new Ec2WorkshopStack(app, 'TestStack', 'TestStage',{ env: testEnv });

    expectCDK(stack).to(haveResource('AWS::SNS::Topic'));
  });

//   test('Stack creates EC2 instances with correct configuration', () => {
//     const app = new App();
//     const stack = new Ec2WorkshopStack(app, 'TestStack', 'TestStage',{ env: testEnv });

//     // Add assertions for the EC2 instances created with correct configuration
//     expectCDK(stack).to(haveResource('AWS::EC2::Instance', {
//       InstanceType: 't2.micro', // Example configuration to check
//       // Add more properties to check as needed
//     }));
//   });

//   test('Stack enables termination protection for EC2 instances', () => {
//     const app = new App();
//     const stack = new Ec2WorkshopStack(app, 'TestStack', 'TestStage',{ env: testEnv });

//     // Add assertions to verify that termination protection is enabled for EC2 instances
//     expectCDK(stack).to(haveResource('AWS::StepFunctions::Task', {
//       Parameters: {
//         DisableApiTermination: {
//           Value: 'true',
//         },
//         // Add more parameters as needed
//       },
//     }));
//   });

//   test('Stack creates security group with correct ingress rules', () => {
//     const app = new App();
//     const stack = new Ec2WorkshopStack(app, 'TestStack', 'TestStage',{ env: testEnv });

//     // Add assertions to verify the security group's ingress rules
//     expectCDK(stack).to(haveResource('AWS::EC2::SecurityGroup', {
//       SecurityGroupIngress: [
//         {
//           IpProtocol: "tcp",
//           FromPort: 22,
//           ToPort: 22,
//           CidrIp: '136.226.242.252/32',
//         },
//         // Add more ingress rules as needed
//       ],
//     }));
//   });

//   // Add more test cases as needed to cover other aspects of your stack
});
