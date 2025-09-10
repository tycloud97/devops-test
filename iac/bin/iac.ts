#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { IacStack } from '../lib/iac-stack';

// Initialize the CDK application
const cdkApp = new cdk.App();
new IacStack(cdkApp, 'IacStack', {
  env: { account: '827539266883', region: 'ap-southeast-1' },
});