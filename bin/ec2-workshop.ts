#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
// import { Ec2WorkshopStack } from '../lib/ec2-workshop-stack';
import { Ec2Pipeline } from '../lib/ec2-pipeline';


const app = new cdk.App();
new Ec2Pipeline(app, 'Ec2Pipeline', {
env: {
        account: '905418167610',
        region:"ap-south-1"
    }
});

app.synth();
