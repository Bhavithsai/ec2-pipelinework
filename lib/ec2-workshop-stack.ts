import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class Ec2WorkshopStack extends cdk.Stack {
  constructor(scope: Construct, id: string, stageName: string, props?: cdk.StackProps) {
    super(scope,stageName, props );

    // Create SNS topic
    const notificationSNSTopic = new sns.Topic(this, 'SNSTopic', {
      topicName: 'ec2workshop-topic',
    });
    notificationSNSTopic.addSubscription(new snsSubscriptions.EmailSubscription('intothedark9381@gmail.com'));

    // Instance metadata collection
    const instanceMetadata = new tasks.CallAwsService(this, 'InstanceMetadata', {
      service: 'ec2',
      action: 'describeInstances',
      parameters: {
        InstanceIds: sfn.JsonPath.stringAt('States.Array($.InstanceId)'),
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.stringAt('$.InstanceDescription'),
    });

    // Check tag value 'Quarantined'
    const instanceTagsCheck = new tasks.CallAwsService(this, 'CheckQuarantinedTags', {
      service: 'ec2',
      action: 'describeTags',
      parameters: {
        Filters: [
          {
            Name: 'resource-id',
            Values: sfn.JsonPath.stringAt('States.Array($.InstanceId)'),
          },
          {
            Name: 'value',
            Values: ['Quarantined'],
          },
        ],
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.stringAt('$.InstanceTags'),
    });

    // Create isolation security group
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true });
    const isolationSG = new ec2.SecurityGroup(this, 'EC2IsolationSecurityGroup', {
      vpc: vpc,
    });

    isolationSG.addIngressRule(
      ec2.Peer.ipv4('136.226.242.252/32'),
      ec2.Port.tcp(22),
      'Allow my IP'
    );

    // Enable termination protection
    const enableTerminationProtection = new tasks.CallAwsService(this, 'EnableTerminationProtection', {
      service: 'ec2',
      action: 'modifyInstanceAttribute',
      parameters: {
        InstanceId: sfn.JsonPath.stringAt('$.InstanceDescription.Reservations[0].Instances[0].InstanceId'),
        DisableApiTermination: {
          Value: 'true',
        },
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.stringAt('$.EnableTermination'),
    });

    // Check auto scaling group info
    const autoScalingInfo = new tasks.CallAwsService(this, 'GetAutoScalingGroupInfo', {
      service: 'autoscaling',
      action: 'describeAutoScalingInstances',
      parameters: {
        InstanceIds: sfn.JsonPath.stringAt('States.Array($.InstanceId)'),
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.stringAt('$.AutoScalingResult'),
    });

    // Detach EC2 from auto scaling group
    const detachEC2FromASG = new tasks.CallAwsService(this, 'DetachEC2FromASG', {
      service: 'autoscaling',
      action: 'detachInstances',
      parameters: {
        AutoScalingGroupName: sfn.JsonPath.stringAt('$.AutoScalingResult.AutoScalingInstances[0].AutoScalingGroupName'),
        ShouldDecrementDesiredCapacity: 'false',
        InstanceIds: sfn.JsonPath.stringAt('States.Array($.InstanceId)'),
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.DISCARD,
    });

 // Create snapshot from isolated instance
    const createSnapshot = new tasks.CallAwsService(this, 'CreateSnapshot', {
      service: 'ec2',
      action: 'createSnapshot',
      parameters: {
        VolumeId: sfn.JsonPath.stringAt('$.InstanceDescription.Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId'),
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.stringAt('$.SnapshotId'),
    });

    // create forensic instance
    const createForensicInstance = new tasks.CallAwsService(this, 'CreateForensicInstance', {
      service: 'ec2',
      action: 'runInstances',
      parameters: {
        MaxCount: 1,
        MinCount: 1,
        InstanceType: sfn.JsonPath.stringAt('$.InstanceDescription.Reservations[0].Instances[0].InstanceType'),
        ImageId: sfn.JsonPath.stringAt('$.InstanceDescription.Reservations[0].Instances[0].ImageId'),
        SubnetId: sfn.JsonPath.stringAt('$.InstanceDescription.Reservations[0].Instances[0].NetworkInterfaces[0].SubnetId'),
        SecurityGroupIds: [isolationSG.securityGroupId],
      },
      iamResources: ['*'],
      resultSelector: {
        ForensicInstanceId: sfn.JsonPath.stringAt('$.Instances[0].InstanceId'),
      },
    });

    // verify snapshot creating snapshot
    const getSnapshotStatus = new tasks.CallAwsService(this, 'GetSnapshotStatus', {
      service: 'ec2',
      action: 'describeSnapshots',
      parameters: {
        SnapshotIds: sfn.JsonPath.stringAt('States.Array($.SnapshotId.SnapshotId)'),
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.stringAt('$.SnapshotStatus'),
      resultSelector: {
        SnapshotState: sfn.JsonPath.stringAt('$.Snapshots.[0].State'),
      },
    });

    // Send Email about SnapshotID
    const sendEmailAboutSnapshotId = new tasks.CallAwsService(this, 'SendEmailAboutSnapshotId', {
      service: 'sns',
      action: 'publish',
      parameters: {
        TopicArn: notificationSNSTopic.topicArn,
        Message: 'Snapshot created',
      },
      iamResources: ['*'],
    });

    // create EBS volume from Snapshot
    const ebsVolumeFromSnapshot = new tasks.CallAwsService(this, 'CreateEBSVolumeFromSnapshot', {
      service: 'ec2',
      action: 'createVolume',
      parameters: {
        AvailabilityZone: sfn.JsonPath.stringAt('$.InstanceDescription.Reservations[0].Instances[0].Placement.AvailabilityZone'),
        SnapshotId: sfn.JsonPath.stringAt('$.SnapshotId.SnapshotId'),
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.stringAt('$.Volumes'),
    });

    // Check EBS volume creation
    const ebsVolumeStatusCheck = new tasks.CallAwsService(this, 'GetEBSVolumeStatus', {
      service: 'ec2',
      action: 'describeVolumes',
      parameters: {
        VolumeIds: sfn.JsonPath.stringAt('States.Array($.Volumes.VolumeId)'),
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.stringAt('$.VolumeDescription'),
    });

    // attach volume to forensic instance
    const attachVolume = new tasks.CallAwsService(this, 'AttachVolume', {
      service: 'ec2',
      action: 'attachVolume',
      parameters: {
        Device: '/dev/sdf',
        InstanceId: sfn.JsonPath.stringAt('$[0].ForensicInstanceId'),
        VolumeId: sfn.JsonPath.stringAt('$[1].Volumes.VolumeId'),
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.DISCARD
    });

    // attach isolation security group to instance
    const modifyForencisInstanceSG = new tasks.CallAwsService(this, 'ModifyInstanceSG', {
      service: 'ec2',
      action: 'authorizeSecurityGroupIngress',
      parameters: {
        GroupId: sfn.JsonPath.stringAt('$[1].InstanceDescription.Reservations[0].Instances[0].NetworkInterfaces[0].Groups[0].GroupId'),
        IpPermissions: [
          {
            IpProtocol: '-1',
            FromPort: -1,
            UserIdGroupPairs: [
              {
                GroupId: isolationSG.securityGroupId,
              },
            ],
          },
        ],
      },
      iamResources: ['*'],
      resultPath: sfn.JsonPath.DISCARD
    });

    // tag forensic instance with tag quarantine
    const tagInstance = new tasks.CallAwsService(this, 'TagInstanceAsQuarantine', {
      service: 'ec2',
      action: 'createTags',
      parameters: {
        Resources: sfn.JsonPath.stringAt('States.Array($[1].InstanceId)'),
        Tags: [
          {
            Key: 'Status',
            Value: 'Quarantined',
          },
        ],
      },
      iamResources: ['*'],
    });

    // Send Email about tags
    const sendEmailWithTags = new tasks.CallAwsService(this, 'SendEmailAboutInstanceTags', {
      service: 'sns',
      action: 'publish',
      parameters: {
        TopicArn: notificationSNSTopic.topicArn,
        Message: 'Instance tags updated with status Quarantine',
      },
      iamResources: ['*'],
    });

    // Send Email that Instance is already in Quarantine state
    const sendEmailAlreadyQuarantine = new tasks.CallAwsService(this, 'EmailInstanceAlreadyQuarantined', {
      service: 'sns',
      action: 'publish',
      parameters: {
        TopicArn: notificationSNSTopic.topicArn,
        Message: 'Instance is already Quarantined',
      },
      iamResources: ['*'],
    });

    // Build state machine state: Choice, Condition, Pass, Wait
    const hasQuarantineTagsChoice = new sfn.Choice(this, 'IsInstanceQuarantined?');
    const yesInstanceTagCon = sfn.Condition.isPresent('$.InstanceTags.Tags[0].Value');

    const hasASGChoice = new sfn.Choice(this, 'HasASG?');
    const yesASGCon = sfn.Condition.isPresent('$.AutoScalingResult.AutoScalingInstances[0].AutoScalingGroupName');

    const isSnapshotCompleteChoice = new sfn.Choice(this, 'IsSnapshotComplete?');
    const yesSnapshotCompleteCon = sfn.Condition.stringEquals('$.SnapshotStatus.SnapshotState', 'completed');

    const isEBSVolumeAvailableChoice = new sfn.Choice(this, 'IsEBSVolumeAvailable?');
    const noEBSVolumeAvailableCon = sfn.Condition.not(sfn.Condition.stringEquals('$.VolumeDescription.Volumes[0].State', 'available'));

    const volumeCreationCompleteWait = new sfn.Wait(this, 'WaitForVolumeCreation', {
      time: sfn.WaitTime.duration(Duration.seconds(15)),
    });

    const snapshotCreationCompleteWait = new sfn.Wait(this, 'WaitForSnapshotCreation', {
      time: sfn.WaitTime.duration(Duration.seconds(15)),
    });

    const volumeCreateCompletePass = new sfn.Pass(this, 'VolumeCreationComplete');

    const parallelCreate = new sfn.Parallel(this, 'CreateForensicInstanceSnapshotsVolume');
    parallelCreate.branch(createForensicInstance);

    parallelCreate.branch(createSnapshot.next(getSnapshotStatus).next(isSnapshotCompleteChoice.when(
      yesSnapshotCompleteCon, ebsVolumeFromSnapshot.next(ebsVolumeStatusCheck).next(isEBSVolumeAvailableChoice.when(
        noEBSVolumeAvailableCon, volumeCreationCompleteWait.next(ebsVolumeStatusCheck)
      ).otherwise(volumeCreateCompletePass))
    ).otherwise(snapshotCreationCompleteWait.next(getSnapshotStatus))));

    // Build the state machine definition
    const chain = sfn.Chain.start(instanceMetadata)
  .next(instanceTagsCheck)
  .next(hasQuarantineTagsChoice.when(
    yesInstanceTagCon, sendEmailAlreadyQuarantine
  ).otherwise(
    enableTerminationProtection
      .next(autoScalingInfo)
      .next(hasASGChoice.when(
        yesASGCon, detachEC2FromASG
      ).otherwise(
        parallelCreate
          .next(attachVolume)
          .next(modifyForencisInstanceSG)
          .next(tagInstance)
          .next(sendEmailWithTags)
          .next(sendEmailAboutSnapshotId)
      )
    )
  )
);

    // State machine
    const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
      definition: chain,
    });

    // Outputs
    new cdk.CfnOutput(this, 'StepFunctionArn', {
      description: 'Step function ARN',
      value: stateMachine.stateMachineArn,
    });

    new cdk.CfnOutput(this, 'StpFunctionURL', {
      description: 'Step Function URL',
      value: cdk.Fn.sub(
        'https://${AWS::Region}.console.aws.amazon.com/states/home?region=${AWS::Region}#/statemachines/view/${EC2IsolationStateMachine}',
        { EC2IsolationStateMachine: stateMachine.stateMachineArn }
      ),
    });
  }
}

