import * as cdk from 'aws-cdk-lib';
import { Ec2WorkshopStack } from '../lib/ec2-workshop-stack';
import { Template, Match } from 'aws-cdk-lib/assertions';
// import * as cdk from 'aws-cdk-lib';
const testEnv = {
 account: '905418167610',
 region:"ap-south-1"
};

const app = new cdk.App();
const stack = new Ec2WorkshopStack(app, 'TestStack', 'test',{ env: testEnv });
const template = Template.fromStack(stack);

test('Test SNS topic and email subscription', () => {
  template.hasResourceProperties('AWS::SNS::Topic', {
    // TopicName: 'ec2workshop-topic',
  });

  template.hasResourceProperties('AWS::SNS::Subscription', {
    Endpoint: 'intothedark9381@gmail.com',
    Protocol: 'email',
    TopicArn: {
      'Ref': 'SNSTopicBCCC5DD8', // Updated to reference the correct logical ID of the SNS topic
    },
  });
});
test('Test AWS services called by state machine tasks', () => {
  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    GroupDescription: 'test/EC2IsolationSecurityGroup',
  });

  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: [
          {
            CidrIp: "136.226.242.252/32",
            Description: "Allow my IP",
            FromPort: 22,
            IpProtocol: "tcp",
            ToPort: 22
          }
        ],
  }
  )});