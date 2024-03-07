#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Ec2WorkshopStack } from '../lib/ec2-workshop-stack';



const app = new cdk.App();
new Ec2WorkshopStack(app, 'Ec2WorkshopStack', {
env: {
        account: '905418167610',
        region:"ap-south-1"
    }
});

app.synth();
