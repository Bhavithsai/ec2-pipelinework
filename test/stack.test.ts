import { App } from 'aws-cdk-lib';
import { Ec2WorkshopStack } from '../lib/ec2-workshop-stack';
import { expect as expectCDK, haveResource } from '@aws-cdk/assert';

const testEnv = {
 account: '905418167610',
 region:"ap-south-1"
};

test('Security Group Created', () => {
    const app = new App();
    // WHEN
    const stack = new Ec2WorkshopStack(app, 'TestStack', 'TestStage',{ env: testEnv });
    // THEN
    expectCDK(stack).to(haveResource("AWS::EC2::SecurityGroup"));
});
test('Step Function State Machine Created', () => {
    const app = new App();
    // WHEN
    const stack = new Ec2WorkshopStack(app, 'TestStack', 'TestStage',{ env: testEnv });
    // THEN
    expectCDK(stack).to(haveResource("AWS::StepFunctions::StateMachine"));
});


//   test('Security Group Created', () => {
//     const app = new App();
//     // WHEN
//     const stack = new Ec2WorkshopStack(app, 'TestStack', 'TestStage', { env: testEnv });
//     // THEN
//     expectCDK(stack).to(haveResource("AWS::EC2::SecurityGroup", {
//       Properties: {
//         // GroupDescription: "TestStage/EC2IsolationSecurityGroup",
//         SecurityGroupEgress: [
//           {
//             CidrIp: "0.0.0.0/0",
//             Description: "Allow all outbound traffic by default",
//             IpProtocol: "-1"
//           }
//         ],
//         SecurityGroupIngress: [
//           {
//             CidrIp: "136.226.242.252/32",
//             Description: "Allow my IP",
//             FromPort: 22,
//             IpProtocol: "tcp",
//             ToPort: 22
//           }
//         ],
//         VpcId:  "vpc-12345"
//       }
//     }));
// });