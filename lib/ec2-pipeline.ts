import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as cdk from 'aws-cdk-lib';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import { ManualApprovalStep } from 'aws-cdk-lib/pipelines';
import {CodePipeline, CodePipelineSource, ShellStep, CodeBuildStep} from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { StageFile } from '../lib/stage-file';
// import { MainWorkshopStack } from './main-workshop-stack';

  export class Ec2Pipeline extends Stack {
    //   constructor(scope: Construct, id: string, stageName: string, props?: cdk.StackProps) {
    // super(scope,stageName, props );
        constructor(scope: Construct, id: string, props?: StackProps) {
     super(scope, id, props);

    const repo = codecommit.Repository.fromRepositoryName(this, 'MyRepo', 'ec2-repo');
    // Create a CodePipeline
    const pipeline = new CodePipeline(this, 'Pipeline',{
      pipelineName: 'Ec2Pipeline', // Fix the typo
      synth: new ShellStep('Synth', {
        input : CodePipelineSource.codeCommit(repo, 'master'), // Pass the repo name and branch name as strings
       //
        commands: [
                  'npm install -g aws-cdk',
                  'npm ci',
                  'npx cdk synth'
                  ],
                  primaryOutputDirectory: './cdk.out', 
      }),
    });
    
    // const deploy = new StageFile(this, 'Deploy',)
    const deployStage = pipeline.addStage(new StageFile(this, 'Deploy', {
      env: { account: '905418167610', region: 'ap-south-1'}
    }));
       
    deployStage.addPre(new ManualApprovalStep('Manual approval before deploying'));
    // const testingStage = pipeline.addStage(new StageFile(this, 'Deploy', {
    //   env: { account: '905418167610', region: 'ap-south-1'}
    // }));
    
    // testingStage.addPost(new ManualApprovalStep('Manual approval before production'));
    
    // const prodStage = pipeline.addStage(new StageFile(this, 'Ec2prod', {
    //   env: { account: '905418167610', region: 'ap-south-1'}
    // }));

  }
}